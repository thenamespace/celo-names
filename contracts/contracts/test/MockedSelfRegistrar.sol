// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {L2SelfRegistrar} from '../L2SelfRegistrar.sol';
import {ISelfVerificationRoot} from '@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol';
import {SelfStructs} from '@selfxyz/contracts/contracts/libraries/SelfStructs.sol';

/**
 * @title MockIdentityHub
 * @notice Mock identity verification hub for testing
 */
contract MockIdentityHub {
  function setVerificationConfigV2(
    SelfStructs.VerificationConfigV2 memory /* config */
  ) external pure returns (bytes32) {
    return bytes32(uint256(1)); // Return a mock config ID
  }
}

/**
 * @title MockedSelfRegistrar
 * @notice Mock contract for testing L2SelfRegistrar functionality
 * @dev Extends L2SelfRegistrar to expose customVerificationHook for testing
 */
contract MockedSelfRegistrar is L2SelfRegistrar {
  /**
   * @notice Constructor for the mock contract
   * @param identityVerificationHubV2Address The address of the Self Identity Verification Hub V2
   * @param scopeSeed The scope seed for Self protocol verification
   * @param _registry The address of the L2Registry contract
   * @param _selfStorage The address of the SelfStorage contract
   */
  constructor(
    address identityVerificationHubV2Address,
    string memory scopeSeed,
    address _registry,
    address _selfStorage
  ) L2SelfRegistrar(identityVerificationHubV2Address, scopeSeed, _registry, _selfStorage) {}

  /**
   * @notice Public function to mock the customVerificationHook for testing
   * @dev Allows tests to directly trigger verification logic without going through Self protocol
   * @param output The mocked verification output from the Self hub
   * @param userData The user data passed through verification (contains the label)
   */
  function mockCustomVerificationHook(
    ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
    bytes memory userData
  ) external {
    customVerificationHook(output, userData);
  }
}

