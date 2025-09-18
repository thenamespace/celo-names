// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AddrResolver} from "./resolver/AddrResolver.sol";
import {ContentHashResolver} from "./resolver/ContentHashResolver.sol";
import {TextResolver} from "./resolver/TextResolver.sol";
import {Multicallable} from "./common/Multicallable.sol";
import {InterfaceResolver} from "./resolver/InterfaceResolver.sol";
import {PubkeyResolver} from "./resolver/PubkeyResolver.sol";
import {NameResolver} from "./resolver/NameResolver.sol";
import {ABIResolver} from "./resolver/ABIResolver.sol";
import {ExtendedResolver} from "./resolver/ExtendedResolver.sol";

/**
 * @title L2Resolver
 * @dev A comprehensive ENS resolver for L2 networks that combines multiple resolver types
 *      and provides secure multicall functionality for batch record updates.
 * 
 * This resolver supports:
 * - Address resolution (ETH and multi-coin)
 * - Text record management
 * - Content hash storage
 * - Name resolution
 * - Public key storage
 * - ABI storage
 * - Interface resolution
 * - Extended resolver functionality
 * - Secure multicall for batch operations
 */
abstract contract L2Resolver is
    AddrResolver,
    ContentHashResolver,
    TextResolver,
    InterfaceResolver,
    PubkeyResolver,
    NameResolver,
    ABIResolver,
    ExtendedResolver,
    Multicallable
{
    // ============ Custom Errors ============
    
    /// @dev Thrown when an unauthorized function is called via multicall
    error UnauthorizedMulticallFunction(bytes4 selector);
    
    /// @dev Thrown when the node parameter in multicall data doesn't match the expected node
    error NodeMismatch(bytes32 expected, bytes32 actual);
    
    /// @dev Thrown when a multicall function execution fails
    error MulticallExecutionFailed(uint256 index, bytes data);

    // ============ Constants ============
    
    /// @dev Allowed function selectors for secure multicall operations
    bytes4 private constant SET_ADDR_SELECTOR = bytes4(keccak256("setAddr(bytes32,address)"));
    bytes4 private constant SET_ADDR_COIN_SELECTOR = bytes4(keccak256("setAddr(bytes32,uint256,bytes)"));
    bytes4 private constant SET_TEXT_SELECTOR = bytes4(keccak256("setText(bytes32,string,string)"));
    bytes4 private constant SET_CONTENT_HASH_SELECTOR = bytes4(keccak256("setContenthash(bytes32,bytes)"));
    bytes4 private constant SET_NAME_SELECTOR = bytes4(keccak256("setName(bytes32,string)"));
    bytes4 private constant SET_PUBKEY_SELECTOR = bytes4(keccak256("setPubkey(bytes32,bytes32,bytes32)"));
    bytes4 private constant SET_ABI_SELECTOR = bytes4(keccak256("setABI(bytes32,uint256,bytes)"));
    bytes4 private constant SET_INTERFACE_SELECTOR = bytes4(keccak256("setInterface(bytes32,bytes4,address)"));

    // ============ Internal Functions ============

    /**
     * @dev Securely executes multiple resolver setter functions in a single transaction
     * @param node The ENS node to set records for
     * @param data Array of encoded function calls (only setter functions allowed)
     * @return results Array of return values from each function call
     * 
     * Security features:
     * - Only allows specific resolver setter functions
     * - Validates that all calls target the same node
     * - Uses delegatecall to maintain proper authorization context
     */
    function multicallSetRecords(
        bytes32 node,
        bytes[] calldata data
    ) internal returns (bytes[] memory results) {
        results = new bytes[](data.length);
        
        for (uint256 i = 0; i < data.length; i++) {
            bytes4 selector = bytes4(data[i][0:4]);
            
            // Validate function selector is an allowed setter function
            if (!_isAllowedSetterFunction(selector)) {
                revert UnauthorizedMulticallFunction(selector);
            }
            
            // Validate node parameter matches the expected node
            bytes32 callNode = bytes32(data[i][4:36]);
            if (callNode != node) {
                revert NodeMismatch(node, callNode);
            }
            
            // Execute the function call with proper error handling
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            if (!success) {
                revert MulticallExecutionFailed(i, data[i]);
            }
            
            results[i] = result;
        }
        
        return results;
    }

    /**
     * @dev Checks if a function selector is an allowed setter function
     * @param selector The function selector to check
     * @return allowed True if the function is allowed, false otherwise
     */
    function _isAllowedSetterFunction(bytes4 selector) private pure returns (bool) {
        return selector == SET_ADDR_SELECTOR ||
               selector == SET_ADDR_COIN_SELECTOR ||
               selector == SET_TEXT_SELECTOR ||
               selector == SET_CONTENT_HASH_SELECTOR ||
               selector == SET_NAME_SELECTOR ||
               selector == SET_PUBKEY_SELECTOR ||
               selector == SET_ABI_SELECTOR ||
               selector == SET_INTERFACE_SELECTOR;
    }

    /**
     * @dev Returns true if this contract implements the interface defined by `interfaceId`
     * @param interfaceId The interface identifier to check
     * @return supported True if the interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(
            AddrResolver,
            ContentHashResolver,
            TextResolver,
            ABIResolver,
            InterfaceResolver,
            PubkeyResolver,
            NameResolver,
            Multicallable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
