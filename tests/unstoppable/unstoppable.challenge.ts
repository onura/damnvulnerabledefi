import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";




let DamnValuableToken: Contract; 
let UnstoppableLender: Contract; 
let ReceiverContract: Contract; 

describe('[Challenge] Unstoppable', function () {
    this.timeout(0);

    // Pool has 1M * 10**18 tokens
    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');
    const INITIAL_ATTACKER_BALANCE = ethers.utils.parseEther('100');

    before(async function () {
        /** SETUP SCENARIO */
        
        const accounts = await ethers.getSigners();
        const [deployer, attacker, someUser, ...otherAccounts] = accounts;

        const tokenFactory = await ethers.getContractFactory("DamnValuableToken");
        this.token = await tokenFactory.connect(deployer).deploy();

        const poolFactory = await ethers.getContractFactory("UnstoppableLender");
        this.pool = await poolFactory.connect(deployer).deploy(this.token.address);

        await this.token.approve(this.pool.address, TOKENS_IN_POOL, { from: deployer.address });
        await this.pool.depositTokens(TOKENS_IN_POOL, { from: deployer.address });
        await this.token.transfer(attacker.address, INITIAL_ATTACKER_BALANCE, { from: deployer.address });

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.eq(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.eq(INITIAL_ATTACKER_BALANCE);

         // Show it's possible for anyone to take out a flash loan
         const receiverFactory = await ethers.getContractFactory("ReceiverUnstoppable");
         this.receiverContract = await receiverFactory.connect(someUser).deploy(this.pool.address);
         await this.receiverContract.executeFlashLoan(10);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
    });

    after(async function () {
        const accounts = await ethers.getSigners();
        const someUser = accounts[2];
        /** SUCCESS CONDITION */
        /*
        let tx = await this.receiverContract.executeFlashLoan(10, { from: someUser.address })
        await tx.wait();
        console.log(tx);
        */

        await expect(
            this.receiverContract.executeFlashLoan(10, { from: someUser.address })
        ).to.be.reverted;
    });
});
