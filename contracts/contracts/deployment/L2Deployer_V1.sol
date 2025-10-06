// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {L2Registrar} from '../L2Registrar.sol';
import {L2Registry} from '../L2Registry.sol';
import {RegistrarRulesConfig} from "../registrar/RegistrarRules.sol";

contract L2Deployer_V1 {
  address public registry;
  address public registrar;

  constructor(
    string memory _root_ens_name,
    bytes32 _root_ens_namehash,
    string memory token_name,
    string memory token_symbol,
    string memory metadata_uri,
    address usd_stable_oracle,
    address treasury,
    address owner,
    RegistrarRulesConfig memory config,
    bytes32[] memory blacklist
  ) {
    
    L2Registry _registry = new L2Registry(
      token_name,
      token_symbol,
      _root_ens_name,
      _root_ens_namehash,
      metadata_uri
    );
    
    registry = address(_registry);
    
    L2Registrar _registrar = new L2Registrar(
      registry,
      usd_stable_oracle,
      treasury,
      config
    );

    _registrar.setBlacklist(blacklist, false);
    registrar = address(_registrar);

    _registry.setRegistrar(registrar, true);

    _registrar.transferOwnership(owner);
    _registry.transferOwnership(owner);
  }
}
