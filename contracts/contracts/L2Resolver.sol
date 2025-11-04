// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AddrResolver} from "./resolver/AddrResolver.sol";
import {ContentHashResolver} from "./resolver/ContentHashResolver.sol";
import {TextResolver} from "./resolver/TextResolver.sol";
import {Multicallable} from "./common/Multicallable.sol";
import {InterfaceResolver} from "./resolver/InterfaceResolver.sol";
import {PubkeyResolver} from "./resolver/PubkeyResolver.sol";
import {NameResolver} from "./resolver/NameResolver.sol";
import {ABIResolver} from "./resolver/ABIResolver.sol";
import {ExtendedResolver} from "./resolver/ExtendedResolver.sol";

/// @title L2 Resolver
///
/// @notice A replica of ENS Public Resolver with some slight modifications.
///         Used for storing and retrieving ENS records.
///
/// @author ENS Labs
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
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when an unauthorized function is called via multicall.
    error UnauthorizedMulticallFunction(bytes4 selector);

    /// @notice Thrown when the node parameter in multicall data doesn't match the expected node.
    error NodeMismatch(bytes32 expected, bytes32 actual);

    /// @notice Thrown when a multicall function execution fails.
    error MulticallExecutionFailed(uint256 index, bytes data);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTANTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Allowed function selector for setAddr(bytes32,address).
    bytes4 private constant SET_ADDR_SELECTOR = bytes4(keccak256("setAddr(bytes32,address)"));

    /// @notice Allowed function selector for setAddr(bytes32,uint256,bytes).
    bytes4 private constant SET_ADDR_COIN_SELECTOR = bytes4(keccak256("setAddr(bytes32,uint256,bytes)"));

    /// @notice Allowed function selector for setText(bytes32,string,string).
    bytes4 private constant SET_TEXT_SELECTOR = bytes4(keccak256("setText(bytes32,string,string)"));

    /// @notice Allowed function selector for setContenthash(bytes32,bytes).
    bytes4 private constant SET_CONTENT_HASH_SELECTOR = bytes4(keccak256("setContenthash(bytes32,bytes)"));

    /// @notice Allowed function selector for setName(bytes32,string).
    bytes4 private constant SET_NAME_SELECTOR = bytes4(keccak256("setName(bytes32,string)"));

    /// @notice Allowed function selector for setPubkey(bytes32,bytes32,bytes32).
    bytes4 private constant SET_PUBKEY_SELECTOR = bytes4(keccak256("setPubkey(bytes32,bytes32,bytes32)"));

    /// @notice Allowed function selector for setABI(bytes32,uint256,bytes).
    bytes4 private constant SET_ABI_SELECTOR = bytes4(keccak256("setABI(bytes32,uint256,bytes)"));

    /// @notice Allowed function selector for setInterface(bytes32,bytes4,address).
    bytes4 private constant SET_INTERFACE_SELECTOR = bytes4(keccak256("setInterface(bytes32,bytes4,address)"));

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Securely executes multiple resolver setter functions in a single transaction.
    ///
    /// @dev Security features:
    ///      - Only allows specific resolver setter functions
    ///      - Validates that all calls target the same node
    ///      - Uses delegatecall to maintain proper authorization context
    ///
    /// @param node The ENS node to set records for.
    /// @param data Array of encoded function calls (only setter functions allowed).
    ///
    /// @return results Array of return values from each function call.
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

    /// @dev Checks if a function selector is an allowed setter function.
    ///
    /// @param selector The function selector to check.
    ///
    /// @return allowed True if the function is allowed, false otherwise.
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

    /// @notice ERC165 compliant signal for interface support.
    ///
    /// @dev Checks interface support for each inherited resolver profile.
    ///
    /// @param interfaceId The ERC165 interface ID being checked for compliance.
    ///
    /// @return bool Whether this contract supports the provided interfaceID.
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
            Multicallable,
            ExtendedResolver
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
