// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RegistryManager} from "./RegistryManager.sol";
import {L2Resolver} from "./L2Resolver.sol";
import {EnsUtils} from "../common/EnsUtils.sol";

contract L2Registry is ERC721, RegistryManager, L2Resolver {
    mapping(bytes32 => uint256) expiries;
    mapping(bytes32 => string) labels;
    bytes32 immutable parent;

    event NewSubname(
        string label,
        uint64 expiry,
        address owner,
        uint256 timestamp
    );

    event ExpiryUpdated(bytes32 node, uint256 expiry);

    event SubnameRevoked(bytes32 node, address admin);

    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        string memory _ensName
    ) ERC721(_tokenName, _tokenSymbol) {
        parent = EnsUtils.labelhash(_ensName);
    }

    function isAuthorisedToUpdateRecords(
        bytes32 node
    ) internal view override returns (bool) {
        address owner = _ownerOf(uint256(node));
        return owner == _msgSender() || isApprovedForAll(owner, _msgSender());
    }

    function register(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata data
    ) public onlyRegistrar() {
        _register(label, expiry, owner, data);
    }

    function setExpiry(bytes32 node, uint256 expiry) public onlyRegistrar() {
        require(!_isExpired(node), "Subname already expired");

        require(expiry > block.timestamp, "Invalid expiry");

        expiries[node] = expiry;
        emit ExpiryUpdated(node, expiry);
    }

    function revoke(bytes32 node) public onlyAdmin {
        _revoke(node);
         emit SubnameRevoked(node, _msgSender());
    }

    function _revoke(bytes32 node) internal {
        uint256 token = uint256(node);

        delete expiries[node];
        delete labels[node];
        _burn(token);
        _clearRecords(node);
    }

    function _ownerOf(
        uint256 tokenId
    ) internal view override returns (address) {
        bytes32 node = bytes32(tokenId);
        if (_isExpired(node)) {
            return address(0);
        }
        return _ownerOfNoExpiry(tokenId);
    }

    function _ownerOfNoExpiry(uint256 tokenId) internal view returns (address) {
        return super._ownerOf(tokenId);
    }

    function _isExpired(bytes32 node) internal view returns (bool) {
        return expiries[node] <= block.timestamp;
    }

    function _isValidExpiry(uint64 expiry) internal view returns (bool) {
        return expiry > block.timestamp;
    }

    function _register(
        string calldata label,
        uint64 expiry,
        address owner,
        bytes[] calldata data
    ) internal {
        bytes32 node = EnsUtils.namehash(parent, label);
        uint256 token = uint256(node);
        bool previousOwnerZeroAddr = _ownerOfNoExpiry(token) == address(0);

        require(previousOwnerZeroAddr || _isExpired(node), "Subname taken");

        require(_isValidExpiry(expiry), "Expiry Invalid");

        if (!previousOwnerZeroAddr) {
            _revoke(node);
        }

        bool hasResolverData = data.length > 0;
        address initialOwner = hasResolverData ? _msgSender() : owner;

        expiries[node] = expiry;
        labels[node] = label;
        _safeMint(initialOwner, token);

        if (hasResolverData) {
            this.multicallWithNodeCheck(node, data);
        }

        if (initialOwner != owner) {
            _safeTransfer(initialOwner, owner, token);
        }

        emit NewSubname(label, expiry, owner, block.timestamp);
    }
    // ownable

    function supportsInterface(
        bytes4 interfaceID
    ) public view override(ERC721, L2Resolver) returns (bool) {
        return super.supportsInterface(interfaceID);
    }
}
