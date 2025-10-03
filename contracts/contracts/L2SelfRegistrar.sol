// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from '@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol';
import {ISelfVerificationRoot} from '@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol';
import {SelfStructs} from '@selfxyz/contracts/contracts/libraries/SelfStructs.sol';
import {SelfUtils} from '@selfxyz/contracts/contracts/libraries/SelfUtils.sol';
import {IIdentityVerificationHubV2} from '@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol';
import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title L2SelfRegistrar
 * @notice Test implementation of SelfVerificationRoot for testing purposes
 * @dev This contract provides a concrete implementation of the abstract SelfVerificationRoot
 */
contract L2SelfRegistrar is SelfVerificationRoot, Ownable {
  struct Verification {
    string label;
    address owner;
    uint64 verificationExpiry;
    string passwordNumber;
  }

  uint64 constant VERIFICATION_EXPIRY = 30 minutes;
  uint64 constant ONE_YEAR_SECONDS = 31_536_000;

  // Storage for testing purposes
  bool public verificationSuccessful;
  ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
  bytes public lastUserData;
  SelfStructs.VerificationConfigV2 public verificationConfig;
  bytes32 public verificationConfigId;
  address public lastUserAddress;

  error NulifiedReused();
  error NotAllowed();
  error VerificationExpired();

  event NameClaimed(string label, bytes32 node, address owner);
  event PasspordId(string passportId);

  mapping(uint256 => bool) nullifiers;
  mapping(string => Verification) verifications;
  IL2Registry immutable registry;
  mapping(bytes32 => uint64) claimedCount;
  uint64 private maxNamesToClaim;

  // Events for testing
  event VerificationCompleted(
    ISelfVerificationRoot.GenericDiscloseOutputV2 output,
    bytes userData
  );

  /**
   * @notice Constructor for the test contract
   * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2
   */
  constructor(
    address identityVerificationHubV2Address,
    string memory scope,
    address _registry
  ) SelfVerificationRoot(identityVerificationHubV2Address, scope) Ownable(_msgSender()) {

    SelfStructs.VerificationConfigV2 memory _verificationConfig = SelfStructs
      .VerificationConfigV2({
        olderThanEnabled: false,
        olderThan: 0,
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [uint256(0), 0, 0, 0],
        ofacEnabled: [false, false, false]
      });
      
    verificationConfigId = IIdentityVerificationHubV2(
      identityVerificationHubV2Address
    ).setVerificationConfigV2(_verificationConfig);
    registry = IL2Registry(_registry);
  }

  function claim(
    string calldata label,
    address owner,
    bytes calldata resolverData
  ) external {
    Verification memory verification = verifications[label];
    if (_msgSender() != verification.owner) {
      revert NotAllowed();
    }

    if (verification.verificationExpiry <= block.timestamp) {
      revert VerificationExpired();
    }

    uint256 oneYearExpiry = block.timestamp + ONE_YEAR_SECONDS;
    registry.createSubnode(label, registry.rootNode(), uint64(oneYearExpiry), owner, resolverData);

    emit NameClaimed(label, _namehash(label, registry.rootNode()), owner);
  }

  function _namehash(string calldata label, bytes32 parent) internal view returns(bytes32) {
    return keccak256(abi.encodePacked(parent, keccak256(bytes(label))));
  }

  /**
   * @notice Implementation of customVerificationHook for testing
   * @dev This function is called by onVerificationSuccess after hub address validation
   * @param output The verification output from the hub
   * @param userData The user data passed through verification
   */
  function customVerificationHook(
    ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
    bytes memory userData
  ) internal override {
    // verificationSuccessful = true;
    // lastOutput = output;
    // lastUserData = userData;

    if (_isNullified(output.nullifier)) {
      revert NulifiedReused();
    }
    nullifiers[output.nullifier] = true;

    address userAddress = address(uint160(output.userIdentifier));

    //TODO Require string length >= minLabelLen
    string memory label = string(userData);

    //TODO Store passport id and only allow maxMintPerUser

    uint64 verificationExpiry = block.timestamp + VERIFICATION_EXPIRY;
    verifications[label] = Verification(
      label,
      userAddress,
      verificationExpiry,
      output.idNumber
    );

    emit PasspordId(output.idNumber);
    emit VerificationCompleted(output, userData);
  }

  function setConfigId(bytes32 configId) external onlyOwner {
    verificationConfigId = configId;
  }

  function getConfigId(
    bytes32 /* destinationChainId */,
    bytes32 /* userIdentifier */,
    bytes memory /* userDefinedData */
  ) public view override returns (bytes32) {
    return verificationConfigId;
  }

  function _isNullified(uint256 nullifier) internal returns (bool) {
    return nullifiers[nullifier];
  }
}
