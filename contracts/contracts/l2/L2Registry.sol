// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RegistryManager} from "./RegistryManager.sol";
import {EnsUtils} from "../ens/EnsUtils.sol";

contract L2Registry is ERC721, RegistryManager {
    mapping(bytes32 => uint64) expiries;
    mapping(bytes32 => string) labels;
    bytes32 immutable parent;

    event NewSubname(
        string label,
        uint64 expiry,
        address owner,
        uint256 timestamp
    );

    event ExpirySet(bytes32 node, uint64 newExpiry);

    event SubnameRevoked (
        bytes32 node,
        address admin
    );

    constructor(string memory parent_name) ERC721("", "") {
        parent = bytes32(uint256(1));
    }

    function register(
        string calldata label,
        uint64 expiry,
        address owner
    ) public onlyController {
        _register(label, expiry, owner);
    }

    function setExpiry(bytes32 node, uint64 expiry) public onlyController {

        require(!_isExpired(node), "Subname already expired");

        expiries[node] = expiry;
        emit ExpirySet(node, expiry);
    }

    function revoke(bytes32 node) public onlyAdmin {

        uint256 token = uint256(node);
        require(_ownerOf(token) == address(0), "Name doesn't exist");

        expiries[node] = 0;
        _burn(uint256(node));

        emit SubnameRevoked(node, _msgSender());
    }

    function _ownerOf(uint256 tokenId) internal override view returns(address) {
        bytes32 node = bytes32(tokenId);
        if (_isExpired(node)) {
            return address(0);
        }
        return super._ownerOf(tokenId);
    }

    function _isExpired(bytes32 node) internal view returns(bool) {
        return expiries[node] < block.timestamp;
    }

    function _isValidExpiry(uint64 expiry) internal view {
        require(expiry > block.timestamp, "Invalid expiry");
    }

    function _register(string calldata label, uint64 expiry, address owner) internal {

        bytes32 node = EnsUtils.namehash(parent, label);
        uint256 token = uint256(node);
        bool previousOwnerZeroAddr = super._ownerOf(token) == address(0);

        require(previousOwnerZeroAddr || _isExpired(node), "Subname taken");

        if (previousOwnerZeroAddr) {
            _burn(token);
        }

        _isValidExpiry(expiry);

        expiries[node] = expiry;
        labels[node] = label;
        _mint(owner, token);

        emit NewSubname(label, expiry, owner, block.timestamp);
    }

    
    // ownable
}
