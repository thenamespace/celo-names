// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IL2Registrar
 * @dev Interface for L2Registrar contract
 */
interface IL2Registrar {
    // ============ Public Functions ============
    
    function register(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external;
    
    function register(
        string calldata label,
        bytes32 parentNode,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external;
    
    function getPrice(string calldata label, uint256 expiryInYears) external returns(uint256);
}
