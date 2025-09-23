// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Minimal required interface
// for ENS NameWrapper contract
interface INameWrapper {
  function ownerOf(uint256 token) external returns (address);
  function canModifyName(
    bytes32 node,
    address addr
  ) external view returns (bool);
}
