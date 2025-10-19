// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RegistrarStorage} from '../RegistrarStorage.sol';
import {L2SelfRegistrar} from '../L2SelfRegistrar.sol';

contract L2SelfRegistrarDeployer_V1 {
  address public selfStorage;
  address public registrar;

  constructor(
    address _identity_hub,
    string memory scope_seed,
    address registry,
    address owner,
    uint64 max_names_to_claim
  ) {
    RegistrarStorage _storage = new RegistrarStorage();
    selfStorage = address(_storage);

    L2SelfRegistrar _registrar = new L2SelfRegistrar(
      _identity_hub,
      scope_seed,
      registry,
      selfStorage
    );
    registrar = address(_registrar);

    _storage.setRegistrar(registrar, true);
    _storage.transferOwnership(owner);

    _registrar.setMaximumClaim(max_names_to_claim);
    _registrar.transferOwnership(owner);
  }
}
