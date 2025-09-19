// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IL2Registry
 * @dev Interface for L2Registry contract
 */
interface IL2Registry {
    // ============ Public Functions ============
    
    function createSubnode(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external;
    
    function createSubnode(
        string calldata label,
        bytes32 parentNode,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external;
    
    function setExpiry(bytes32 node, uint256 expiry) external;
    
    function revoke(bytes32 node) external;

    // ============ View Functions ============
    
    function expiries(bytes32 node) external view returns (uint256);
    
    function names(bytes32 node) external view returns (string memory);
    
    function rootNode() external view returns (bytes32);
    
    function totalSupply() external view returns (uint256);
}
