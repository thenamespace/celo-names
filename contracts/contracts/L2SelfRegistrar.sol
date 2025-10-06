// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SelfVerificationRoot} from '@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol';
import {ISelfVerificationRoot} from '@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol';
import {SelfStructs} from '@selfxyz/contracts/contracts/libraries/SelfStructs.sol';
import {SelfUtils} from '@selfxyz/contracts/contracts/libraries/SelfUtils.sol';
import {IIdentityVerificationHubV2} from '@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol';
import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {StringUtils} from './common/StringUtils.sol';

/**
 * @title L2SelfRegistrar
 * @notice Self-verification based registrar for L2 networks that allows users to claim subdomains
 * @dev This contract integrates with Self protocol for identity verification and manages subdomain
 *      registration through the L2Registry. Users must complete identity verification before
 *      claiming subdomains, with configurable limits and validation rules.
 */
contract L2SelfRegistrar is SelfVerificationRoot, Ownable {
  using StringUtils for string;

  // ============ Structs ============

  /**
   * @dev Stores verification data for a user's subdomain claim
   * @param label The subdomain label to be claimed
   * @param owner The address that will own the subdomain
   * @param verificationExpiry Timestamp when verification expires
   * @param passportHash Hash of the passport ID for tracking claims per user
   */
  struct Verification {
    string label;
    address owner;
    uint64 verificationExpiry;
    bytes32 passportHash;
  }

  // ============ Constants ============

  /// @dev Duration for which verification remains valid
  uint64 constant VERIFICATION_EXPIRY = 30 minutes;
  
  /// @dev Seconds in one year for subdomain expiry calculation
  uint64 constant ONE_YEAR_SECONDS = 31_536_000;

  /// @dev Minimum subname length
  uint64 constant MIN_SUBNAME_LENGTH = 3;

  /// @dev Maximum subname length
  uint64 constant MAX_SUBNAME_LENGTH = 64;

  // ============ Custom Errors ============

  /// @dev Thrown when attempting to reuse a nullifier
  error NulifiedReused();
  
  /// @dev Thrown when caller is not authorized to claim name
  error NotVerifiedClaimer();
  
  /// @dev Thrown when verification has expired
  error VerificationExpired();
  
  /// @dev Thrown when user has reached maximum allowed claims
  error MaximumNamesClaimed();
  
  /// @dev Thrown when label does not meet minimum length requirements
  error InvalidLabel();

  /// @dev Unexpired verification is alredy present
  /// someone already booked a subname with label
  error SubnameVerificationExists();

  // ============ Events ============

  /// @dev Emitted when a subdomain is successfully claimed
  event NameClaimed(string label, bytes32 node, address owner);
  
  /// @dev Emitted when passport ID is processed during verification
  event PasspordId(string passportId);

  // ============ State Variables ============

  /// @dev Maps nullifiers to prevent reuse of verification proofs
  mapping(uint256 => bool) nullifiers;
  
  /// @dev Maps label hash to verification data
  mapping(bytes32 => Verification) verifications;
  
  /// @dev Maps passport hash to number of claims made by that user
  mapping(bytes32 => uint64) claimedCount;
  
  /// @dev Maximum number of names a single user can claim
  uint64 private maxNamesToClaim;
  
  /// @dev Minimum length required for subdomain labels
  uint256 private minLabelLen;
  
  /// @dev Self protocol verification configuration ID
  bytes32 verificationConfigId;

  /// @dev Registry contract for subdomain management
  IL2Registry immutable registry;

  // ============ Constructor ============

  /**
   * @notice Initializes the L2SelfRegistrar contract
   * @param identityVerificationHubV2Address The address of the Self Identity Verification Hub V2
   * @param scopeSeed The scope seed for Self protocol verification
   * @param _registry The address of the L2Registry contract
   */
  constructor(
    address identityVerificationHubV2Address,
    string memory scopeSeed,
    address _registry
  )
    SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed)
    Ownable(_msgSender())
  {
    _initSelfProtocol(identityVerificationHubV2Address);
    registry = IL2Registry(_registry);
  }

  // ============ Public Functions ============

  /**
   * @notice Claims a subdomain after successful identity verification
   * @param label The subdomain label to claim
   * @param owner The address that will own the subdomain
   * @param resolverData Optional array of resolver function calls to execute
   * 
   * Requirements:
   * - Caller must have completed identity verification
   * - Verification must not have expired
   * - Caller must be the verified owner
   * - User must not have exceeded maximum claims limit
   */
  function claim(
    string calldata label,
    address owner,
    bytes[] calldata resolverData
  ) external {
    bytes32 labelHash = keccak256(bytes(label));
    Verification memory verification = verifications[labelHash];
    
    if (verification.verificationExpiry <= block.timestamp) {
      revert VerificationExpired();
    }

    if (_msgSender() != verification.owner) {
      revert NotVerifiedClaimer();
    }

    if (claimedCount[verification.passportHash] >= maxNamesToClaim) {
      revert MaximumNamesClaimed();
    }

    claimedCount[verification.passportHash] += 1;
    uint64 oneYearExpiry = uint64(block.timestamp) + ONE_YEAR_SECONDS;
    registry.createSubnode(label, oneYearExpiry, owner, resolverData);

    emit NameClaimed(label, _namehash(label, registry.rootNode()), owner);
  }

  /**
   * @notice Returns the verification configuration ID for Self protocol
   * @return The verification configuration ID
   */
  function getConfigId(
    bytes32 /* destinationChainId */,
    bytes32 /* userIdentifier */,
    bytes memory /* userDefinedData */
  ) public view override returns (bytes32) {
    return verificationConfigId;
  }

  // ============ Owner Functions ============

  /**
   * @notice Updates the Self protocol verification configuration ID
   * @param configId The new verification configuration ID
   * 
   * Requirements:
   * - Caller must be the contract owner
   */
  function setConfigId(bytes32 configId) external onlyOwner {
    verificationConfigId = configId;
  }

  /**
   * @notice Increases the maximum number of names a single user can claim
   * @param _maxNamesToClaim The new maximum number of names per user
   * 
   * Requirements:
   * - Caller must be the contract owner
   * - New value must be greater than current value
   */
  function setMaxNamesToClaim(uint64 _maxNamesToClaim) external onlyOwner {
    require(_maxNamesToClaim > maxNamesToClaim, "New value must be greater than current");
    maxNamesToClaim = _maxNamesToClaim;
  }

  // ============ Internal Functions ============

  /**
   * @notice Implementation of customVerificationHook for Self protocol integration
   * @dev This function is called by onVerificationSuccess after hub address validation
   * @param output The verification output from the Self hub
   * @param userData The user data passed through verification (contains the label)
   */
  function customVerificationHook(
    ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
    bytes memory userData
  ) internal override {
    if (_isNullified(output.nullifier)) {
      revert NulifiedReused();
    }

    nullifiers[output.nullifier] = true;
    address userAddress = address(uint160(output.userIdentifier));
    string memory label = string(userData);
    bytes32 labelHash = keccak256(bytes(label));

    Verification memory existingVerification = verifications[labelHash];
    if (existingVerification.verificationExpiry > block.timestamp) {
      revert SubnameVerificationExists();
    }

    uint256 labelen = label.strlen();
    if (labelen < MIN_SUBNAME_LENGTH || labelen > MAX_SUBNAME_LENGTH) {
      revert InvalidLabel();
    }

    bytes32 passportHash = keccak256(bytes(output.idNumber));
    uint64 verificationExpiry = uint64(block.timestamp) + VERIFICATION_EXPIRY;
    verifications[labelHash] = Verification(
      label,
      userAddress,
      verificationExpiry,
      passportHash
    );

    emit PasspordId(output.idNumber);
  }

  /**
   * @notice Checks if a nullifier has been used before
   * @param nullifier The nullifier to check
   * @return True if the nullifier has been used
   */
  function _isNullified(uint256 nullifier) internal returns (bool) {
    return nullifiers[nullifier];
  }

  /**
   * @notice Computes the namehash for a label under a parent node
   * @param label The subdomain label
   * @param parent The parent node hash
   * @return The namehash of the label under the parent
   */
  function _namehash(
    string calldata label,
    bytes32 parent
  ) internal view returns (bytes32) {
    return keccak256(abi.encodePacked(parent, keccak256(bytes(label))));
  }

  /**
   * @notice Initializes the Self protocol with verification configuration
   * @param _identityVerificationHubV2Address The address of the Self Identity Verification Hub V2
   */
  function _initSelfProtocol(address _identityVerificationHubV2Address) internal {
    SelfUtils.UnformattedVerificationConfigV2 memory _config = SelfUtils
      .UnformattedVerificationConfigV2(18, new string[](0), false);
    SelfStructs.VerificationConfigV2 memory _verificationConfig = SelfUtils
      .formatVerificationConfigV2(_config);

    verificationConfigId = IIdentityVerificationHubV2(
      _identityVerificationHubV2Address
    ).setVerificationConfigV2(_verificationConfig);
  }
}
