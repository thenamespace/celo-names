// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockedEnsRegistry
 * @dev Mock ENS Registry for testing purposes
 */
contract MockedEnsRegistry {
    mapping(bytes32 => address) private _owners;
    
    function owner(bytes32 node) external view returns (address) {
        return _owners[node];
    }
    
    function setOwner(bytes32 node, address newOwner) external {
        _owners[node] = newOwner;
    }
}
