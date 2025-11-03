// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {L2Registry} from '../L2Registry.sol';

struct RegistryCfg {
  string name;
  string symbol;
  string ens_name;
  bytes32 ens_nodehash;
  string metadata_uri;
}

contract L2RegistryDeployer {
  address public registry;

  constructor(
    RegistryCfg memory registry_cfg,
    address owner
  ) {
    // Deploy l2 registry
    L2Registry _registry = new L2Registry(
      registry_cfg.name,
      registry_cfg.symbol,
      registry_cfg.ens_name,
      registry_cfg.ens_nodehash,
      registry_cfg.metadata_uri
    );
    registry = address(_registry);
    _registry.setAdmin(owner, true);
    _registry.transferOwnership(owner);
  }
}
