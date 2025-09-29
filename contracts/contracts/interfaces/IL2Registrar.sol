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
    ) payable external;
    
    function rentPrice(string calldata label, uint64 expiryInYears, address token) external returns(uint256);

    function renew(string calldata label, uint64 expiryInYears) payable external;

    function available(string calldata label) external returns(bool);
}
