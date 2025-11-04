// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {RegistrarControl} from './RegistrarControl.sol';
import {L2Resolver} from './L2Resolver.sol';
import {IL2Registry} from './interfaces/IL2Registry.sol';

/// @title L2 Registry
///
/// @notice An ERC721-based ENS registry for L2 networks that manages subdomain names as NFTs.
///         This contract extends ERC721 to represent subdomains as NFTs, implements L2Resolver
///         for record management, and provides registrar access control.
///
/// @author Celo Usernames
contract L2Registry is ERC721, L2Resolver, IL2Registry, RegistrarControl {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when attempting to register a subdomain that is already taken.
    error SubdomainAlreadyTaken(bytes32 node);

    /// @notice Thrown when attempting to set expiry to a past time.
    error InvalidExpiryTime(uint256 expiry, uint256 currentTime);

    /// @notice Thrown when attempting to perform an operation on an expired name.
    error SubdomainExpired(bytes32 node, uint256 expiry);

    /// @notice Thrown when attempting to register with an empty label.
    error EmptyLabel();

    /// @notice Thrown when attempting to register a subname under a non-existent parent node.
    error ParentNodeNotValid(bytes32 parentNode);

    /// @notice Thrown when querying a token that does not exist.
    error TokenDoesNotExist();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Maps node hash to expiration timestamp.
    mapping(bytes32 => uint256) public expiries;

    /// @notice Maps node hash to names in their string format.
    mapping(bytes32 => string) private names;

    /// @notice The immutable parent node hash (e.g., "celo.eth").
    bytes32 public immutable rootNode;

    /// @notice Base metadata URI for token metadata.
    string public metadataUri;

    /// @notice Variable to keep track of the number of issued subnames at any level.
    uint256 public totalSupply;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a new subdomain is registered.
    ///
    /// @param label The subdomain label that was registered.
    /// @param expiry The expiration timestamp for the subdomain.
    /// @param owner The address that owns the registered subdomain.
    /// @param node The namehash of the registered subdomain.
    event NewName(
        string label,
        uint64 expiry,
        address indexed owner,
        bytes32 indexed node
    );

    /// @notice Emitted when a subdomain's expiry is updated.
    ///
    /// @param node The namehash of the subdomain whose expiry was updated.
    /// @param expiry The new expiration timestamp.
    event ExpiryUpdated(bytes32 indexed node, uint256 expiry);

    /// @notice Emitted when a subdomain is revoked by an admin.
    ///
    /// @param node The namehash of the revoked subdomain.
    /// @param admin The address of the admin who revoked the subdomain.
    event NameRevoked(bytes32 indexed node, address indexed admin);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IMPLEMENTATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice L2 Registry constructor used to establish the necessary contract configuration.
    ///
    /// @param tokenName The name of the ERC721 token.
    /// @param tokenSymbol The symbol of the ERC721 token.
    /// @param _rootName String representation of the root ENS name (e.g., "celo.eth").
    ///                  Contract doesn't enforce rootName == namehash(rootName),
    ///                  _rootNode should match namehash(_rootName).
    /// @param _rootNode The namehash of parent ENS name (e.g., namehash("celo.eth")).
    /// @param _metadataUri Base metadata URI for token metadata.
    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        string memory _rootName,
        bytes32 _rootNode,
        string memory _metadataUri
    ) ERC721(tokenName, tokenSymbol) {
        rootNode = _rootNode;
        names[_rootNode] = _rootName;
        metadataUri = _metadataUri;
    }

    /// @notice Creates a new subdomain with optional resolver data.
    ///
    /// @dev Creates a new subdomain under the root node. The subdomain is minted as an NFT
    ///      to the specified owner. Optionally executes resolver function calls during registration.
    ///
    /// @param label The subdomain label to register.
    /// @param expiry The expiration timestamp for the subdomain.
    /// @param owner The address that will own the subdomain NFT.
    /// @param resolverData Optional array of resolver function calls to execute.
    ///
    /// Requirements:
    /// - Caller must be an authorized registrar.
    /// - Subdomain must not already be taken (unless expired).
    /// - Expiry must be in the future.
    function createSubnode(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external onlyRegistrar {
        _createSubnode(label, rootNode, expiry, owner, resolverData);
    }

    /// @notice Creates a subdomain under a custom parent node.
    ///
    /// @dev Enables multi-level subnames (e.g., "test.test.root.eth"). The parent node must
    ///      exist unless it's the root node.
    ///
    /// @param label The subdomain label to register.
    /// @param parentNode Node hash of parent domain - use existing subdomain's node for nesting.
    /// @param expiry The expiration timestamp for the subdomain.
    /// @param owner The address that will own the subdomain NFT.
    /// @param resolverData Optional array of resolver function calls to execute.
    ///
    /// Requirements:
    /// - Caller must be an authorized registrar.
    /// - Parent node must exist (unless it's the root node).
    function createSubnode(
        string calldata label,
        bytes32 parentNode,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) external onlyRegistrar {
        uint256 tokenId = uint256(parentNode);

        // Verify parent exists if not root
        if (parentNode != rootNode && _ownerOfExpirable(tokenId) == address(0)) {
            revert ParentNodeNotValid(parentNode);
        }

        _createSubnode(label, parentNode, expiry, owner, resolverData);
    }

    /// @notice Updates the expiration time for an existing subdomain.
    ///
    /// @dev Allows extending the registration duration of an existing subdomain.
    ///
    /// @param node The node hash of the subdomain.
    /// @param expiry The new expiration timestamp.
    ///
    /// Requirements:
    /// - Caller must be an authorized registrar.
    /// - Subdomain must not already be expired.
    /// - New expiry must be in the future and greater than current expiry.
    function setExpiry(bytes32 node, uint256 expiry) external onlyRegistrar {
        if (_isExpired(node)) {
            revert SubdomainExpired(node, expiries[node]);
        }

        if (expiry <= block.timestamp || expiry <= expiries[node]) {
            revert InvalidExpiryTime(expiry, block.timestamp);
        }

        expiries[node] = expiry;
        emit ExpiryUpdated(node, expiry);
    }

    /// @notice Revokes a subdomain, burning the NFT and clearing all records.
    ///
    /// @dev Permanently removes a subdomain from the registry. This action cannot be undone.
    ///
    /// @param node The node hash of the subdomain to revoke.
    ///
    /// Requirements:
    /// - Caller must be the contract owner.
    function revoke(bytes32 node) external onlyOwner {
        _revoke(node);
        emit NameRevoked(node, _msgSender());
    }

    /// @notice Returns a string representation of the name for a given node.
    ///
    /// @param node The node hash to look up.
    ///
    /// @return The string representation of the name (e.g., "alice.celo.eth").
    function nameLookup(bytes32 node) external view returns (string memory) {
        return names[node];
    }

    /// @notice Computes the nodehash for a label under the root node.
    ///
    /// @param label The subdomain label.
    ///
    /// @return The nodehash of the label under rootNode.
    function nodehash(string calldata label) public view returns (bytes32) {
        return _nodehash(label, rootNode);
    }

    /// @notice Computes the nodehash for a label under a parent node.
    ///
    /// @param label The subdomain label.
    /// @param parentNode The parent node hash.
    ///
    /// @return The nodehash of the label under the parent.
    function nodehash(string calldata label, bytes32 parentNode) public pure returns (bytes32) {
        return _nodehash(label, parentNode);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Internal registration logic with comprehensive validation and setup.
    ///
    /// @param label The subdomain label to register.
    /// @param parent The parent node hash.
    /// @param expiry The expiration timestamp.
    /// @param owner The intended owner of the subdomain.
    /// @param resolverData Optional resolver function calls.
    function _createSubnode(
        string calldata label,
        bytes32 parent,
        uint64 expiry,
        address owner,
        bytes[] calldata resolverData
    ) internal {
        if (bytes(label).length == 0) {
            revert EmptyLabel();
        }

        bytes32 node = _nodehash(label, parent);
        uint256 tokenId = uint256(node);

        // Validate subdomain availability
        if (_ownerOfExpirable(tokenId) != address(0)) {
            revert SubdomainAlreadyTaken(node);
        }

        // Validate expiry time
        if (!_isValidExpiry(expiry)) {
            revert InvalidExpiryTime(expiry, block.timestamp);
        }

        // Clean up existing subdomain if it was expired
        address previousOwner = _ownerOf(tokenId);
        if (previousOwner != address(0)) {
            _revoke(node);
        }

        expiries[node] = expiry;
        _setName(label, node, parent);

        _safeMint(owner, tokenId);
        totalSupply++;

        if (resolverData.length > 0) {
            multicallSetRecords(node, resolverData);
        }

        emit NewName(label, expiry, owner, node);
    }

    /// @dev Internal function to revoke a subdomain and clean up state.
    ///
    /// @param node The node hash of the subdomain to revoke.
    function _revoke(bytes32 node) internal {
        uint256 tokenId = uint256(node);

        // Clear all state
        delete expiries[node];

        // Burn the NFT
        _burn(tokenId);
        totalSupply--;

        // Clear resolver records
        _clearRecords(node);
    }

    /// @dev Override ERC721 _ownerOf to handle expired tokens.
    ///
    /// @param tokenId The token ID to check ownership for.
    ///
    /// @return owner The owner address, or zero address if expired/non-existent.
    function _ownerOfExpirable(uint256 tokenId) internal view returns (address) {
        bytes32 node = bytes32(tokenId);

        if (_isExpired(node)) {
            return address(0);
        }

        return _ownerOf(tokenId);
    }

    /// @dev Stores the string representation of name for easy lookup/resolution.
    ///
    /// @param label The string label.
    /// @param node The namehash representation of the name.
    /// @param parent The parent namehash representation.
    function _setName(
        string calldata label,
        bytes32 node,
        bytes32 parent
    ) internal {
        // Check if name is not already set by checking string length
        if (bytes(names[node]).length == 0) {
            names[node] = string.concat(label, ".", names[parent]);
        }
    }

    /// @dev Checks if a subdomain has expired.
    ///
    /// @param node The node hash to check.
    ///
    /// @return expired True if the subdomain has expired.
    function _isExpired(bytes32 node) internal override view returns (bool) {
        return expiries[node] <= block.timestamp;
    }

    /// @dev Validates that an expiry time is in the future.
    ///
    /// @param expiry The expiry timestamp to validate.
    ///
    /// @return valid True if the expiry is valid (in the future).
    function _isValidExpiry(uint64 expiry) internal view returns (bool) {
        return expiry > block.timestamp;
    }

    function _nodehash(
        string calldata label,
        bytes32 parent
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(parent, keccak256(bytes(label))));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    OVERRIDE FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Determines if the caller is authorized to update records for a node.
    ///
    /// @param node The node to check authorization for.
    ///
    /// @return authorized True if the caller can update records.
    function isAuthorizedToUpdateRecords(
        bytes32 node
    ) internal view override returns (bool) {
        address owner = _ownerOfExpirable(uint256(node));
        return owner == _msgSender() ||
            isApprovedForAll(owner, _msgSender()) ||
            isRegistrar(_msgSender());
    }


    /// @notice Get the owner of a token, considering expiration.
    ///
    /// @param tokenId The token ID to query.
    ///
    /// @return The owner address of the token, or zero address if expired/non-existent.
    function ownerOf(uint256 tokenId) public view override(ERC721, IL2Registry) returns (address) {
        return _ownerOfExpirable(tokenId);
    }

    /// @notice Override transferFrom to prevent transfers of expired NFTs.
    ///
    /// @param from The current owner of the token.
    /// @param to The address to transfer the token to.
    /// @param tokenId The token ID to transfer.
    ///
    /// Requirements:
    /// - Token must not be expired.
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        bytes32 node = bytes32(tokenId);
        if (_isExpired(node)) {
            revert SubdomainExpired(node, expiries[node]);
        }
        super.transferFrom(from, to, tokenId);
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
    ) public view override(ERC721, L2Resolver) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Returns the metadata URI for a given token ID.
    ///
    /// @param tokenId The token ID to get metadata for.
    ///
    /// @return The metadata URI string.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        bytes32 node = bytes32(tokenId);
        string memory name = names[node];

        if (bytes(name).length == 0) {
            revert TokenDoesNotExist();
        }

        return string.concat(metadataUri, "/", name);
    }
}
