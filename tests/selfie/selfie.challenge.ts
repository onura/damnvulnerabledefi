import { ethers } from "hardhat";
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
        */
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
