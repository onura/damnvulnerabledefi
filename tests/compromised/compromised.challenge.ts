import { ethers } from "hardhat";
import { expect } from "chai";




describe('Compromised challenge', function () {
    this.timeout(0);
    
    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    const EXCHANGE_INITIAL_ETH_BALANCE = ethers.utils.parseEther('10000');
    const INITIAL_NFT_PRICE = ethers.utils.parseEther('999');
    
    before(async function () {
        /** SETUP SCENARIO */
        
        const accounts = await ethers.getSigners();
        const [deployer, attacker, ...otherAccounts] = accounts;

        // Fund the trusted source addresses
        for ( let source of sources) {
            await deployer.sendTransaction({ from: deployer.address, to: source, value: ethers.utils.parseEther('5') });
        }

        // Deploy the oracle and setup the trusted sources with initial prices
        const oracleInitFactory = await ethers.getContractFactory("TrustfulOracleInitializer");
        const oraclelInitCont = await oracleInitFactory.connect(deployer).deploy(
            sources,
            ["DVNFT", "DVNFT", "DVNFT"],
            [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE],
        );
        const oracleAddr = await oraclelInitCont.oracle();
        const oracleFactory = await ethers.getContractFactory("TrustfulOracle");
        this.oracle = await oracleFactory.connect(deployer).attach(oracleAddr);

        // Deploy the exchange and get the associated ERC721 token
        const exchangeFactory = await ethers.getContractFactory("Exchange");
        this.exchange = await exchangeFactory.connect(deployer).deploy(
            this.oracle.address,
            { value: EXCHANGE_INITIAL_ETH_BALANCE }
        );

        const tokenAddr = await this.exchange.token();
        const tokenFactory = await ethers.getContractFactory("DamnValuableNFT");
        this.token = await tokenFactory.connect(deployer).attach(tokenAddr); 
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];
    });

    after(async function () {
        const accounts = await ethers.getSigners();
        const attacker = accounts[1]; 

        /** SUCCESS CONDITION */
        expect(
            await attacker.provider!.getBalance(this.exchange.address)
        ).to.be.eq(0);

        expect(
            await attacker.provider!.getBalance(attacker.address)
        ).to.gt(ethers.utils.parseEther('10000'));
    });
});
