// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Minimal required interface
// for ENS Registry contract
interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}