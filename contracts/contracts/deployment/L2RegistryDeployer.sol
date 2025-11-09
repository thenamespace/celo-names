// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CeloNames} from '../CeloNames.sol';

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
    CeloNames _registry = new CeloNames(
      registry_cfg.name,
      registry_cfg.symbol,
      registry_cfg.ens_name,
      registry_cfg.ens_nodehash,
      registry_cfg.metadata_uri
    );
    registry = address(_registry);
    _registry.transferOwnership(owner);
  }
}
