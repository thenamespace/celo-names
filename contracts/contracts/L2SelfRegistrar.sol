// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SelfVerificationRoot} from '@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol';
import {ISelfVerificationRoot} from '@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol';
import {SelfStructs} from '@selfxyz/contracts/contracts/libraries/SelfStructs.sol';
import {SelfUtils} from '@selfxyz/contracts/contracts/libraries/SelfUtils.sol';
import {IIdentityVerificationHubV2} from '@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol';
import {IL2Registry} from './interfaces/IL2Registry.sol';
import {ISelfStorage} from './interfaces/ISelfStorage.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {StringUtils} from './common/StringUtils.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';

/**
 * @title L2SelfRegistrar
 * @notice Self-verification based registrar for L2 networks that allows users to claim subdomains
 * @dev This contract integrates with Self protocol for identity verification and manages subdomain
 *      registration through the L2Registry. Users must complete identity verification before
 *      claiming subdomains, with configurable limits and validation rules.
 */
contract L2SelfRegistrar is SelfVerificationRoot, Ownable, ERC721Holder {
  using StringUtils for string;

  // ============ Constants ============

  /// @dev Seconds in one year for subdomain expiry calculation
  uint64 constant ONE_YEAR_SECONDS = 31_536_000;

  /// @dev Minimum subname length
  uint64 constant MIN_SUBNAME_LENGTH = 3;

  /// @dev Maximum subname length
  uint64 constant MAX_SUBNAME_LENGTH = 64;

  // ============ Custom Errors ============

  /// @dev Thrown when user has reached maximum allowed claims
  error MaximumNamesClaimed();

  /// @dev Thrown when label does not meet minimum length requirements
  error InvalidLabel();

  /// @dev Thrown when a non verified user tries to claim subnames
  error NotSelfVerified(address user);

  /// @dev Thrown when already verified user attempt verification again
  error VerificationClaimed();

  /// @dev Thrown when attempting to claim a name that's already been claimed
  error NameAlreadyClaimed();

  // ============ Events ============

  /// @dev Emitted when a subdomain is successfully claimed
  event NameClaimed(string label, bytes32 node, address owner);

  /// @dev Emitted when user completed a verification
  event VerificationCompleted(address user, uint256 verificationId, uint256 timestamp);

  // ============ State Variables ============

  /// @dev Maximum number of names a single user can claim (default: 1 free name per user)
  uint64 private maximumClaim = 1;

  /// @dev Self protocol verification configuration ID
  bytes32 verificationConfigId;

  /// @dev Registry contract for subdomain management
  IL2Registry immutable registry;

  /// @dev Storage contrat for verification information
  ISelfStorage immutable selfStorage;

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
    address _registry,
    address _selfStorage
  )
    SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed)
    Ownable(_msgSender())
  {
    _initSelfProtocol(identityVerificationHubV2Address);
    registry = IL2Registry(_registry);
    selfStorage = ISelfStorage(_selfStorage);
  }

  // ============ Public Functions ============

  /**
   * @notice Claims a subdomain after successful identity verification
   * @param label The subdomain label to claim
   * @param owner The address that will own the subdomain
   * @param resolverData Optional array of resolver function calls to execute
   *
   * Requirements:
   * - Label must be valid length (3-64 characters)
   * - User must be verified via Self protocol
   * - User must not have exceeded maximum claims limit
   * - Name must not have been claimed already
   */
  function claim(
    string calldata label,
    address owner,
    bytes[] calldata resolverData
  ) external {
    // Validate label length
    uint len = label.strlen();
    if (len < MIN_SUBNAME_LENGTH || len > MAX_SUBNAME_LENGTH) {
      revert InvalidLabel();
    }

    // Check if user is verified via self protocol
    if (!selfStorage.isVerified(_msgSender())) {
      revert NotSelfVerified(_msgSender());
    }

    // Check if user claimed max amount of free names
    if (selfStorage.claimed(_msgSender()) >= maximumClaim) {
      revert MaximumNamesClaimed();
    }

    bytes32 node = _namehash(label, registry.rootNode());
    // Update storage (checks-effects-interactions pattern)
    selfStorage.claim(_msgSender(), node);

    // Create the subnode in registry
    uint64 oneYearExpiry = uint64(block.timestamp) + ONE_YEAR_SECONDS;
    registry.createSubnode(label, oneYearExpiry, owner, resolverData);

    emit NameClaimed(label, node, owner);
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
   * @param _maximumClaim The new maximum number of names per user
   *
   * Requirements:
   * - Caller must be the contract owner
   */
  function setMaximumClaim(uint64 _maximumClaim) external onlyOwner {
    maximumClaim = _maximumClaim;
  }

  // ============ Internal Functions ============

  /**
   * @notice Implementation of customVerificationHook for Self protocol integration
   * @dev This function is called by onVerificationSuccess after hub address validation
   * @param output The verification output from the Self hub
   * @param userData The user data passed through verification (unused in current implementation)
   */
  function customVerificationHook(
    ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
    bytes memory userData
  ) internal override {
    uint256 verificationId = output.nullifier;
    address user = address(uint160(output.userIdentifier));

    // Prevent double verification
    if (
      selfStorage.isVerified(user) ||
      selfStorage.claimedVerifications(verificationId)
    ) {
      revert VerificationClaimed();
    }

    selfStorage.setVerificationId(user, verificationId);
    emit VerificationCompleted(user, verificationId, block.timestamp);
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
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(parent, keccak256(bytes(label))));
  }

  /**
   * @notice Initializes the Self protocol with verification configuration
   * @param _identityVerificationHubV2Address The address of the Self Identity Verification Hub V2
   */
  function _initSelfProtocol(
    address _identityVerificationHubV2Address
  ) internal {
    SelfUtils.UnformattedVerificationConfigV2 memory _config = SelfUtils
      .UnformattedVerificationConfigV2(18, new string[](0), false);
    SelfStructs.VerificationConfigV2 memory _verificationConfig = SelfUtils
      .formatVerificationConfigV2(_config);

    verificationConfigId = IIdentityVerificationHubV2(
      _identityVerificationHubV2Address
    ).setVerificationConfigV2(_verificationConfig);
  }
}
