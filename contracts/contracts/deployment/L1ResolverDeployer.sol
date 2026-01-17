// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {L1Resolver} from '../L1Resolver.sol';

contract L1ResolverDeployer {
  address public resolver;
  address immutable ens_registry = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

  constructor(
    string[] memory gateway_urls,
    address[] memory signers,
    address name_wrapper,
    address owner
  ) {
    L1Resolver _resolver = new L1Resolver(
      signers,
      gateway_urls,
      name_wrapper,
      ens_registry
    );
    resolver = address(_resolver);

    _resolver.transferOwnership(owner);
  }
}
