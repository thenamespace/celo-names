// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {L2Registrar} from '../L2Registrar.sol';
import {RegistrarRulesConfig} from '../registrar/RegistrarRules.sol';

contract L2RegistrarDeployer {
  address public registrar;

  constructor(
    address registry,
    address usd_stable_oracle,
    address treasury,
    address owner,
    RegistrarRulesConfig memory config,
    bytes32[] memory blacklist,
    address[] memory supportedStablecoins
  ) {
    L2Registrar _registrar = new L2Registrar(
      registry,
      usd_stable_oracle,
      treasury,
      config
    );

    _registrar.modifyApprovedTokens(supportedStablecoins, true, false);
    _registrar.setBlacklist(blacklist, false);
    registrar = address(_registrar);
    _registrar.transferOwnership(owner);
  }
}
