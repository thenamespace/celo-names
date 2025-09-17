// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RegistryManager} from "./RegistryManager.sol";
import {L2Resolver} from "./L2Resolver.sol";
import {EnsUtils} from "../common/EnsUtils.sol";

/**
 * @title L2Registry
 * @dev An ERC721-based ENS registry for L2 networks that manages subdomain names as NFTs

 * The registry allows only authorized registrars to create new subdomains,
 * while admins can revoke any subdomain. Each subdomain is represented as
 * an NFT that can be transferred, with automatic expiration handling.
 */
contract L2Registry is ERC721, RegistryManager, L2Resolver {
    // ============ Custom Errors ============

    /// @dev Thrown when attempting to register a subdomain that is already taken
    error SubdomainAlreadyTaken(bytes32 node);

    /// @dev Thrown when attempting to set an invalid expiry time
    error InvalidExpiryTime(uint256 expiry, uint256 currentTime);

    /// @dev Thrown when attempting to update an already expired subdomain
    error SubdomainAlreadyExpired(bytes32 node, uint256 expiry);

    /// @dev Thrown when attempting to register with an empty label
    error EmptyLabel();

    // ============ State Variables ============

    /// @dev Maps node hash to expiration timestamp
    mapping(bytes32 => uint256) public expiries;

    /// @dev Maps node hash to label string for reference
    mapping(bytes32 => string) public labels;

    /// @dev Immutable parent node hash (e.g., "celo.eth")
    bytes32 public immutable parentNode;

    // ============ Events ============

    /// @dev Emitted when a new subdomain is registered
    event NewName(
        string indexed label,
        uint64 expiry,
        address indexed owner,
        uint256 timestamp
    );

    /// @dev Emitted when a subdomain's expiry is updated
    event ExpiryUpdated(bytes32 indexed node, uint256 expiry);

    /// @dev Emitted when a subdomain is revoked by an admin
    event NameRevoked(bytes32 indexed node, address indexed admin);

    // ============ Constructor ============

    /**
     * @dev Initializes the L2Registry with the parent domain
     * @param tokenName The name of the ERC721 token
     * @param tokenSymbol The symbol of the ERC721 token
     * @param _parentNode The namehash of parent ENS name (e.g., "namehash(celo.eth)")
     */
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        bytes32 _parentNode
    ) ERC721(tokenName, tokenSymbol) {
        parentNode = _parentNode;
    }

    // ============ Public Functions ============

    /**
     * @dev Registers a new subdomain with optional resolver data
     * @param label The subdomain label to register
     * @param expiry The expiration timestamp for the subdomain
     * @param owner The address that will own the subdomain NFT
     * @param resolverData Optional array of resolver function calls to execute
     *
     * Requirements:
     * - Caller must be an authorized registrar
     * - Subdomain must not already be taken (unless expired)
     * - Expiry must be in the future
     */
    function register(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external onlyRegistrar {
        _register(label, expiry, owner, resolverData);
    }

    /**
     * @dev Updates the expiration time for an existing subdomain
     * @param node The node hash of the subdomain
     * @param expiry The new expiration timestamp
     *
     * Requirements:
     * - Caller must be an authorized registrar
     * - Subdomain must not already be expired
     * - New expiry must be in the future
     */
    function setExpiry(bytes32 node, uint256 expiry) external onlyRegistrar {
        if (_isExpired(node)) {
            revert SubdomainAlreadyExpired(node, expiries[node]);
        }

        if (expiry <= block.timestamp) {
            revert InvalidExpiryTime(expiry, block.timestamp);
        }

        expiries[node] = expiry;
        emit ExpiryUpdated(node, expiry);
    }

    /**
     * @dev Revokes a subdomain, burning the NFT and clearing all records
     * @param node The node hash of the subdomain to revoke
     *
     * Requirements:
     * - Caller must be an authorized admin
     */
    function revoke(bytes32 node) external onlyAdmin {
        _revoke(node);
        emit NameRevoked(node, _msgSender());
    }

    // ============ Internal Functions ============


    /**
     * @dev Internal registration logic with comprehensive validation and setup
     * @param label The subdomain label to register
     * @param expiry The expiration timestamp
     * @param owner The intended owner of the subdomain
     * @param resolverData Optional resolver function calls
     */
    function _register(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) internal {
        if (bytes(label).length == 0) {
            revert EmptyLabel();
        }

        bytes32 node = EnsUtils.namehash(parentNode, label);
        uint256 tokenId = uint256(node);
        bool isNewSubdomain = _ownerOfNoExpiry(tokenId) == address(0);

        // Validate subdomain availability
        if (!isNewSubdomain && !_isExpired(node)) {
            revert SubdomainAlreadyTaken(node);
        }

        // Validate expiry time
        if (!_isValidExpiry(expiry)) {
            revert InvalidExpiryTime(expiry, block.timestamp);
        }

        // Clean up existing subdomain if it was expired
        if (!isNewSubdomain) {
            _revoke(node);
        }

        // Determine initial owner (registrar if resolver data, otherwise intended owner)
        bool hasResolverData = resolverData.length > 0;
        address initialOwner = hasResolverData ? _msgSender() : owner;

        // Set up subdomain state
        expiries[node] = expiry;
        labels[node] = label;

        // Mint NFT to initial owner
        _safeMint(initialOwner, tokenId);

        // Execute resolver data if provided
        if (hasResolverData) {
            multicallSetRecords(node, resolverData);
        }

        // Transfer to final owner if different from initial owner
        if (initialOwner != owner) {
            _safeTransfer(initialOwner, owner, tokenId);
        }

        emit NewName(label, expiry, owner, block.timestamp);
    }

    /**
     * @dev Internal function to revoke a subdomain and clean up state
     * @param node The node hash of the subdomain to revoke
     */
    function _revoke(bytes32 node) internal {
        uint256 tokenId = uint256(node);

        // Clear all state
        delete expiries[node];
        delete labels[node];

        // Burn the NFT
        _burn(tokenId);

        // Clear resolver records
        _clearRecords(node);
    }

    /**
     * @dev Override ERC721 _ownerOf to handle expired tokens
     * @param tokenId The token ID to check ownership for
     * @return owner The owner address, or zero address if expired/non-existent
     */
    function _ownerOf(
        uint256 tokenId
    ) internal view override returns (address) {
        bytes32 node = bytes32(tokenId);

        // Return zero address for expired tokens
        if (_isExpired(node)) {
            return address(0);
        }

        return super._ownerOf(tokenId);
    }

    /**
     * @dev Gets the owner of a token without checking expiration
     * @param tokenId The token ID to check
     * @return owner The owner address from the base ERC721 contract
     */
    function _ownerOfNoExpiry(uint256 tokenId) internal view returns (address) {
        return super._ownerOf(tokenId);
    }

    /**
     * @dev Checks if a subdomain has expired
     * @param node The node hash to check
     * @return expired True if the subdomain has expired
     */
    function _isExpired(bytes32 node) internal view returns (bool) {
        return expiries[node] <= block.timestamp;
    }

    /**
     * @dev Validates that an expiry time is in the future
     * @param expiry The expiry timestamp to validate
     * @return valid True if the expiry is valid (in the future)
     */
    function _isValidExpiry(uint64 expiry) internal view returns (bool) {
        return expiry > block.timestamp;
    }

    // ============ Override Functions ============

    /**
     * @dev Determines if the caller is authorized to update records for a node
     * @param node The node to check authorization for
     * @return authorized True if the caller can update records
     */
    function isAuthorisedToUpdateRecords(
        bytes32 node
    ) internal view override returns (bool) {
        address owner = _ownerOf(uint256(node));
        return owner == _msgSender() || isApprovedForAll(owner, _msgSender());
    }

    /**
     * @dev Returns true if this contract implements the interface defined by `interfaceId`
     * @param interfaceId The interface identifier to check
     * @return supported True if the interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, L2Resolver) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
