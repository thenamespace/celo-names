// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOffchainResolver {
  function resolveWithProof(
    bytes calldata response,
    bytes calldata extraData
  )
    external
    view
    returns (bytes memory);
}
