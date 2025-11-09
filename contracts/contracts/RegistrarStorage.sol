// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IRegistrarStorage} from './interfaces/IRegistrarStorage.sol';
import {RegistrarControl} from './RegistrarControl.sol';

/// @title Registrar Storage
///
/// @notice Centralized storage for registrars. This contract stores verification IDs and claim
///         counts for users across multiple registrar contracts. Only authorized registrars can
///         update storage. Contains blacklist/whitelist functionality shared among different registrars.
///
/// @author artii.eth (arti@namespace.ninja)
contract RegistrarStorage is IRegistrarStorage, RegistrarControl {
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          STORAGE                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Maps user addresses to their verification IDs.
  mapping(address => uint256) public verificationIds;

  /// @notice Maps verification IDs to their claimed status (prevents reuse).
  mapping(uint256 => bool) public claimedVerifications;

  /// @notice Maps user addresses to the number of names they have claimed.
  mapping(address => uint256) public claimCount;

  /// @notice Maps namehashes to claimed status to track all names claimed via self protocol.
  mapping(bytes32 => bool) public verifiedNames;

  /// @notice Ability to set blacklisted labels that cannot be minted.
  mapping(uint8 => mapping(bytes32 => bool)) blacklist;

  /// @notice Current version of the blacklist.
  uint8 blacklistVersion;

  /// @notice Maps whitelist version to user addresses to their whitelisted status.
  mapping(uint8 => mapping(address => bool)) whitelist;

  /// @notice Current version of the whitelist.
  uint8 whitelistVersion;

  /// @notice Whether the whitelist is enabled (when disabled, all users are considered whitelisted).
  bool public whitelistEnabled;

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        IMPLEMENTATION                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Sets the verification ID for a user.
  ///
  /// @dev Can only be called by authorized registrars. Prevents reuse of verification IDs.
  ///
  /// @param user The address of the user.
  /// @param verificationId The verification ID to associate with the user.
  function setVerificationId(
    address user,
    uint256 verificationId
  ) external onlyRegistrar {
    if (claimedVerifications[verificationId]) {
      revert VerificationIdClaimed(verificationId);
    }

    claimedVerifications[verificationId] = true;
    verificationIds[user] = verificationId;
  }

  /// @notice Increments the claim count for a user.
  ///
  /// @dev Can only be called by authorized registrars when a user claims a name.
  ///
  /// @param user The address of the user who is claiming a name.
  /// @param namehash The namehash of the claimed name.
  function claim(address user, bytes32 namehash) external onlyRegistrar {
    claimCount[user]++;
    verifiedNames[namehash] = true;
  }

  /// @notice Checks if a user has completed verification.
  ///
  /// @dev Returns true if the user has a non-zero verification ID.
  ///
  /// @param user The address of the user to check.
  ///
  /// @return True if the user has completed verification, false otherwise.
  function isVerified(address user) public view returns (bool) {
    return verificationIds[user] > 0;
  }

  /// @notice Checks if a name is claimed via slef verification
  /// by a verified user
  ///
  /// @param user The address of the user to check.
  /// @param nodehash The nodehash of the subname
  /// @return True if the name has been claimed via self by verified user
  function isClaimedViaSelf(
    address user,
    bytes32 nodehash
  ) public view returns (bool) {
    return isVerified(user) && verifiedNames[nodehash];
  }

  /// @notice Checks if a label is blacklisted and cannot be registered.
  ///
  /// @dev Uses the current blacklist version to check if the label hash is blacklisted.
  ///
  /// @param label The domain label to check (e.g., "admin", "test").
  ///
  /// @return True if the label is blacklisted and cannot be registered, false otherwise.
  function isBlacklisted(string calldata label) external view returns (bool) {
    bytes32 labelhash = keccak256(bytes(label));
    return blacklist[blacklistVersion][labelhash];
  }

  /// @notice Checks if a user address is whitelisted for registration.
  ///
  /// @dev If whitelist is disabled, all users are considered whitelisted.
  ///
  /// @param user The address of the user to check.
  ///
  /// @return True if the user is whitelisted or whitelist is disabled, false otherwise.
  function isWhitelisted(address user) external view returns (bool) {
    return !whitelistEnabled || whitelist[whitelistVersion][user];
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       OWNER FUNCTIONS                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @notice Updates the whitelist with new user addresses.
  ///
  /// @dev Can add or remove multiple users from the whitelist in a single transaction.
  ///
  /// @param users Array of user addresses to update.
  /// @param enabled True to add users to whitelist, false to remove them.
  /// @param clearEntries True to clear all previous whitelist entries before adding new ones.
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

  /// @notice Enables or disables the whitelist functionality.
  ///
  /// @dev When disabled, all users are considered whitelisted and can register.
  ///
  /// @param enabled True to enable whitelist restrictions, false to disable them.
  function setWhitelistEnabled(bool enabled) external onlyOwner {
    whitelistEnabled = enabled;
    emit WhitelistChanged(enabled);
  }

  /// @notice Updates the blacklist with new label hashes.
  ///
  /// @dev Can add or remove multiple labels from the blacklist in a single transaction.
  ///
  /// @param labelhashes Array of keccak256 hashes of labels to update.
  /// @param enabled True to add labels to blacklist, false to remove them.
  /// @param clearEntries True to clear all previous blacklist entries before adding new ones.
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

  /// @notice Removes an existing verification.
  ///
  /// @dev Can only be called by the contract owner. Allows cleanup of verification data.
  ///
  /// @param user The address of the user whose verification is being removed.
  /// @param verificationId The verification ID to remove.
  function deleteVerification(
    address user,
    uint256 verificationId
  ) external onlyOwner {
    delete verificationIds[user];
    delete claimedVerifications[verificationId];
    emit VerificationDeleted(user, verificationId);
  }
}
