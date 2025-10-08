// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ISelfStorage} from './interfaces/ISelfStorage.sol';

/**
 * @title SelfStorage
 * @notice Centralized storage for Self-verification based registrars
 * @dev This contract stores verification IDs and claim counts for users across
 *      multiple registrar contracts. Only authorized registrars can update storage.
 */
contract SelfStorage is ISelfStorage, Ownable {
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

  // ============ Owner Functions ============

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

  // ============ View Functions ============

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
}
