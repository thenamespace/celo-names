// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SignatureVerifier
 * @dev Contract for verifying EIP-712 signatures for setText operations
 */
contract SignatureVerifier {
    // ============ Custom Errors ============
    
    /// @dev Thrown when signature verification fails
    error InvalidSignature();
    
    /// @dev Thrown when signature has expired
    error SignatureExpired(uint256 expiry, uint256 currentTime);
    
    /// @dev Thrown when nonce has already been used
    error NonceAlreadyUsed(uint256 nonce);
    
    // ============ Constants ============
    
    /// @dev EIP-712 domain separator for signature verification
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    
    /// @dev EIP-712 type hash for setText signature
    bytes32 public constant SET_TEXT_TYPEHASH = keccak256("SetText(bytes32 node,string key,string value,uint256 nonce,uint256 expiry)");
    
    /// @dev Domain name for EIP-712 signatures
    string public constant DOMAIN_NAME = "L2Resolver";
    
    /// @dev Domain version for EIP-712 signatures
    string public constant DOMAIN_VERSION = "1";

    // ============ State Variables ============
    
    /// @dev Mapping to track used nonces for signature replay protection
    mapping(uint256 => bool) public usedNonces;

    // ============ Public Functions ============

    /**
     * @dev Verifies an EIP-712 signature for setText operation
     * @param node The node being updated
     * @param key The key being set
     * @param value The value being set
     * @param nonce The nonce used
     * @param expiry The signature expiry
     * @param signature The signature to verify
     * @return signer The address that signed the message
     */
    function verifySetTextSignature(
        bytes32 node,
        string calldata key,
        string calldata value,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external view returns (address) {
        // Check if signature has expired
        if (expiry <= block.timestamp) {
            revert SignatureExpired(expiry, block.timestamp);
        }
        
        // Check if nonce has already been used
        if (usedNonces[nonce]) {
            revert NonceAlreadyUsed(nonce);
        }
        
        bytes32 domainSeparator = _getDomainSeparator();
        bytes32 structHash = keccak256(abi.encode(
            SET_TEXT_TYPEHASH,
            node,
            keccak256(bytes(key)),
            keccak256(bytes(value)),
            nonce,
            expiry
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        
        return ECDSA.recover(digest, signature);
    }

    /**
     * @dev Marks a nonce as used to prevent replay attacks
     * @param nonce The nonce to mark as used
     */
    function markNonceUsed(uint256 nonce) external {
        usedNonces[nonce] = true;
    }

    // ============ Internal Functions ============

    /**
     * @dev Gets the EIP-712 domain separator
     * @return domainSeparator The domain separator for signature verification
     */
    function _getDomainSeparator() internal view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes(DOMAIN_NAME)),
            keccak256(bytes(DOMAIN_VERSION)),
            block.chainid,
            address(this)
        ));
    }
}
