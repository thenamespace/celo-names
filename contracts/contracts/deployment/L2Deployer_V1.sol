// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {L2Registrar} from '../L2Registrar.sol';
import {L2Registry} from '../L2Registry.sol';

contract L2Deployer_V1 {
  address public _registry;
  address public _registrar;

  event ContractsDeployed(address registry, address registrar);

  constructor(
    string memory _root_ens_name,
    bytes32 _root_ens_namehash,
    string memory token_name,
    string memory token_symbol,
    string memory metadata_uri,
    address usd_stable_oracle,
    address treasury,
    address owner
  ) {
    L2Registry registry = new L2Registry(
      token_name,
      token_symbol,
      _root_ens_name,
      _root_ens_namehash,
      metadata_uri
    );
    _registry = address(registry);
    L2Registrar registrar = new L2Registrar(_registry, usd_stable_oracle, treasury);
    _registrar = address(registrar);

    registry.setRegistrar(_registrar, true);

    registrar.transferOwnership(owner);
    registry.transferOwnership(owner);

    emit ContractsDeployed(_registry, _registrar);
  }
}
