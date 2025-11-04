// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IRegistrarStorage} from './interfaces/IRegistrarStorage.sol';

/**
 * @title IRegistrarStorage
 * @notice Centralized storage for registrars
 * @dev This contract stores verification IDs and claim counts for users across
 *      multiple registrar contracts. Only authorized registrars can update storage.
 *      Contains blacklist/whitelist functionality shared among different registrars
 */
contract RegistrarStorage is IRegistrarStorage, Ownable {
  // ============ State Variables ============

  /// @dev Maps registrar addresses to their authorization status
  mapping(address => bool) private registrars;

  /// @dev Maps user addresses to their verification IDs
  mapping(address => uint256) public verificationIds;

  /// @dev Maps verification IDs to their claimed status (prevents reuse)
  mapping(uint256 => bool) public claimedVerifications;

  /// @dev Maps user addresses to the number of names they have claimed
  mapping(address => uint256) public claimed;

  /// @dev Maps namehashes to claimed status to track all names claimed via self protocol
  mapping(bytes32 => bool) public names;

  /// @dev Ability to set blacklisted labels that cannot be minted
  mapping(uint8 => mapping(bytes32 => bool)) blacklist;
  uint8 blacklistVersion;

  /// @dev whitelistVersion ->
  mapping(uint8 => mapping(address => bool)) whitelist;
  /// @dev whitelist -> only whitelisted names can mint
  uint8 whitelistVersion;
  /// @dev whitelistEnabled ->
  bool public whitelistEnabled;

  // ============ Modifiers ============

  /**
   * @dev Modifier to restrict access to authorized registrars only
   */
  modifier isRegistrar() {
    if (!registrars[_msgSender()]) {
      revert NotRegistrar();
    }
    _;
  }

  // ============ Constructor ============

  /**
   * @notice Initializes the SelfStorage contract
   * @dev Sets the deployer as the contract owner
   */
  constructor() Ownable(_msgSender()) {}

  // ============ External Functions ============

  /**
   * @notice Sets the verification ID for a user
   * @dev Can only be called by authorized registrars
   * @param user The address of the user
   * @param verificationId The verification ID to associate with the user
   */
  function setVerificationId(
    address user,
    uint256 verificationId
  ) external isRegistrar {
    if (claimedVerifications[verificationId]) {
      revert VerificationIdClaimed(verificationId);
    }

    claimedVerifications[verificationId] = true;
    verificationIds[user] = verificationId;
  }

  /**
   * @notice Increments the claim count for a user
   * @dev Can only be called by authorized registrars when a user claims a name
   * @param user The address of the user who is claiming a name
   * @param namehash The namehash of the claimed name
   */
  function claim(address user, bytes32 namehash) external isRegistrar {
    claimed[user]++;
    names[namehash] = true;
  }

  /**
   * @notice Checks if a user has completed verification
   * @dev Returns true if the user has a non-zero verification ID
   * @param user The address of the user to check
   * @return True if the user has completed verification, false otherwise
   */
  function isVerified(address user) external view returns (bool) {
    return verificationIds[user] > 0;
  }

  /**
   * @notice Checks if a label is blacklisted and cannot be registered
   * @dev Uses the current blacklist version to check if the label hash is blacklisted
   * @param label The domain label to check (e.g., "admin", "test")
   * @return True if the label is blacklisted and cannot be registered, false otherwise
   */
  function isBlacklisted(string calldata label) external view returns (bool) {
    bytes32 labelhash = keccak256(bytes(label));
    return blacklist[blacklistVersion][labelhash];
  }

  /**
   * @notice Checks if a user address is whitelisted for registration
   * @dev If whitelist is disabled, all users are considered whitelisted
   * @param user The address of the user to check
   * @return True if the user is whitelisted or whitelist is disabled, false otherwise
   */
  function isWhitelisted(address user) external view returns (bool) {
    if (!whitelistEnabled) {
      return true;
    }
    return whitelist[whitelistVersion][user];
  }

  /**
   * @notice Checks if an address is an authorized registrar
   * @param registrar The address to check
   * @return True if the address is an authorized registrar, false otherwise
   */
  function isAuthorizedRegistrar(
    address registrar
  ) external view returns (bool) {
    return registrars[registrar];
  }

  // ============ Owner Functions ============

  /**
   * @notice Updates the whitelist with new user addresses
   * @dev Can add or remove multiple users from the whitelist in a single transaction
   * @param users Array of user addresses to update
   * @param enabled True to add users to whitelist, false to remove them
   * @param clearEntries True to clear all previous whitelist entries before adding new ones
   */
  function setWhitelist(
    address[] calldata users,
    bool enabled,
    bool clearEntries
  ) external onlyOwner {
    
    if (clearEntries) {
      whitelistVersion++;
    }

    for (uint i = 0; i < users.length; i++) {
      whitelist[whitelistVersion][users[i]] = enabled;
    }

    emit WhitelistEntriesUpdated(users, enabled, whitelistVersion);
  }

  /**
   * @notice Enables or disables the whitelist functionality
   * @dev When disabled, all users are considered whitelisted and can register
   * @param enabled True to enable whitelist restrictions, false to disable them
   */
  function setWhitelistEnabled(bool enabled) external onlyOwner {
    whitelistEnabled = enabled;
    emit WhitelistChanged(enabled);
  }

  /**
   * @notice Updates the blacklist with new label hashes
   * @dev Can add or remove multiple labels from the blacklist in a single transaction
   * @param labelhashes Array of keccak256 hashes of labels to update
   * @param enabled True to add labels to blacklist, false to remove them
   * @param clearEntries True to clear all previous blacklist entries before adding new ones
   */
  function setBlacklist(
    bytes32[] calldata labelhashes,
    bool enabled,
    bool clearEntries
  ) external onlyOwner {
    if (clearEntries) {
      blacklistVersion++;
    }

    for (uint i = 0; i < labelhashes.length; i++) {
      blacklist[blacklistVersion][labelhashes[i]] = enabled;
    }

    emit BlacklistChanged(labelhashes, enabled, blacklistVersion);
  }

  /**
   * @notice Authorizes or deauthorizes a registrar contract
   * @dev Can only be called by the contract owner
   * @param registrar The address of the registrar contract
   * @param enabled True to authorize, false to revoke authorization
   */
  function setRegistrar(address registrar, bool enabled) external onlyOwner {
    registrars[registrar] = enabled;
    emit RegistrarChanged(registrar, enabled);
  }

  /**
   * @notice Removes an existing verification
   * @dev Can only be called by the contract owner
   * @param user The address of the user whose verification is being removed
   * @param verificationId The verification ID to remove
   */
  function deleteVerification(
    address user,
    uint256 verificationId
  ) external onlyOwner {
    delete verificationIds[user];
    delete claimedVerifications[verificationId];
    emit VerificationDeleted(user, verificationId);
  }
}
