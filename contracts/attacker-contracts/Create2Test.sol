pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract D {
    uint public x;
    constructor(uint a) {
        x = a;
    }
}

contract Create2Test {
    constructor() {}

    function test() external {
        bytes memory deploymentData = abi.encodePacked(type(D).creationCode, uint(5));
        address proxy;
        bytes32 salt = keccak256(abi.encodePacked(uint256(1234)));
        assembly {
            proxy := create2(0x0, add(0x20, deploymentData), mload(deploymentData), salt)
        }

        console.log(proxy);
    } 
}