// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockedNameWrapper
 * @dev Mock Name Wrapper for testing purposes
 */
contract MockedNameWrapper {
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => mapping(address => bool)) private _canModify;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[bytes32(tokenId)];
    }
    
    function canModifyName(bytes32 node, address addr) external view returns (bool) {
        return _canModify[node][addr] || _owners[node] == addr;
    }
    
    function setOwner(bytes32 node, address owner) external {
        _owners[node] = owner;
        emit Transfer(address(0), owner, uint256(node));
    }
    
    function setCanModify(bytes32 node, address addr, bool canModify) external {
        _canModify[node][addr] = canModify;
    }
}
