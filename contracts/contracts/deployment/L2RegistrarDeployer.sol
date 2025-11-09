// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RegistrarStorage} from '../RegistrarStorage.sol';
import {L2Registrar} from '../L2Registrar.sol';
import {L2SelfRegistrar} from '../L2SelfRegistrar.sol';
import {RegistrarRulesConfig} from '../registrar/RegistrarRules.sol';
import {L2SelfRegistrar} from '../L2SelfRegistrar.sol';


struct StorageCfg {
  bytes32[] blacklist;
  bool whitelist_enabled;
  address[] whitelist;
}

struct RegistrarCfg {
  address usdOracle;
  address treasury;
  address ensTreasury;
  uint16 ensTreasuryFee;
  uint256 base_price;
  uint256[] label_lengths;
  uint256[] label_prices;
  uint256 min_label_len;
  uint256 max_label_len;
  address[] allowed_stablecoins;
  uint256 self_verified_fee;
}

struct SelfRegistrarCfg {
  address verification_hub;
  string scope_seed;
  uint64 max_claims;
}

contract L2RegistrarDeployer {
  address public registrarStorage;
  address public registrar;
  address public selfRegistrar;

  constructor(
    StorageCfg memory storage_cfg,
    RegistrarCfg memory registrar_cfg,
    SelfRegistrarCfg memory self_registrar_cfg,
    address owner,
    address registry
  ) {
    // Deploy registrar storage
    RegistrarStorage _storage = new RegistrarStorage();
    _storage.setBlacklist(storage_cfg.blacklist, true, false);

    registrarStorage = address(_storage);

    // Deploy L2Registrar
    RegistrarRulesConfig memory rulesConfig = RegistrarRulesConfig(
      registrar_cfg.max_label_len,
      registrar_cfg.min_label_len,
      registrar_cfg.label_prices,
      registrar_cfg.label_lengths,
      registrar_cfg.base_price
    );
    L2Registrar _registrar = new L2Registrar(
      registry,
      registrar_cfg.usdOracle,
      registrar_cfg.treasury,
      registrarStorage,
      rulesConfig
    );

    // Set allow stablecoin addresses
    if (registrar_cfg.allowed_stablecoins.length > 0) {
      _registrar.modifyApprovedTokens(registrar_cfg.allowed_stablecoins, true, false);
    }

    // Configure ENS Fees
    _registrar.setEnsTreasury(registrar_cfg.ensTreasury);
    _registrar.setEnsTreasuryFeePercent(registrar_cfg.ensTreasuryFee);
    _registrar.setSelfVerifiedFee(registrar_cfg.self_verified_fee);
    registrar = address(_registrar);

    // Deploy SELF Registrar
    L2SelfRegistrar _selfRegistrar = new L2SelfRegistrar(
      self_registrar_cfg.verification_hub,
      self_registrar_cfg.scope_seed,
      registry,
      registrarStorage
    );
    selfRegistrar = address(_selfRegistrar);

    // Set maxium name claims for verified minters
    _selfRegistrar.setMaximumClaim(self_registrar_cfg.max_claims);

    // Registrar Storage permissions & ownership
    _storage.setRegistrar(registrar, true);
    _storage.setRegistrar(selfRegistrar, true);
    _storage.transferOwnership(owner);

    // // Registrars ownership
    _registrar.transferOwnership(owner);
    _selfRegistrar.transferOwnership(owner);
  }
}
