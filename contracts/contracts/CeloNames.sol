// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {L2Registry} from './L2Registry.sol';


/// @title CeloNames
/// @notice This contract manages Celo names and their associated records.
///         It extends the {L2Registry} contract to handle registration, ownership,
///         and metadata for name records on Layer 2.
/// @dev Inherits all core registry logic from {L2Registry}.
///
/// @author artii.eth (arti@namespace.ninja)
contract CeloNames is L2Registry {
  constructor(
    string memory tokenName,
    string memory tokenSymbol,
    string memory rootName, 
    bytes32 rootNode,
    string memory metadataUrl
  ) L2Registry(tokenName, tokenSymbol, rootName, rootNode, metadataUrl) {}
}
