import { ethers } from "hardhat";
import { expect } from "chai";


describe('[Challenge] Side entrance', function () {
    this.timeout(0);
    
    const ETHER_IN_POOL = ethers.utils.parseEther('1000'); 

    before(async function () {
        const [deployer, attacker, ...otherAccounts] = await ethers.getSigners();
       
        const poolFactory = await ethers.getContractFactory("SideEntranceLenderPool");
        this.pool = await poolFactory.connect(deployer).deploy();

        await this.pool.deposit({ value: ETHER_IN_POOL });
        this.attackerInitialEthBalance = await deployer.provider!.getBalance(attacker.address);

        expect(
            await deployer.provider!.getBalance(this.pool.address)
        ).to.be.eq(ETHER_IN_POOL)
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
            await attacker.provider!.getBalance(this.pool.address)
        ).to.be.eq(0);

        // Not checking exactly how much is the final balance of the attacker,
        // because it'll depend on how much gas the attacker spends in the attack
        // If there were no gas costs, it would be balance before attack + ETHER_IN_POOL
        expect(
            await attacker.provider!.getBalance(attacker.address)
        ).to.be.gt(this.attackerInitialEthBalance);
   });
});
