// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';


abstract contract RegistrarControl is Ownable {
  // ============ Custom Errors ============
  
  /// @dev Thrown when attempting to set a role that is already set to the same value
  error RoleAlreadySet(address account, string role, bool enabled);
  
  /// @dev Thrown when attempting to perform an action without the required role
  error InsufficientRole(string requiredRole, address account);

  // ============ State Variables ============
  
  /// @dev Mapping of addresses to registrar status
  mapping(address => bool) public registrars;

  // ============ Events ============
  
  /// @dev Emitted when a registrar role is granted or revoked
  event RegistrarRoleChanged(address indexed account, bool enabled);

  // ============ Constructor ============
  
  /**
   * @dev Initializes the contract and sets up the owner
   * @notice The deployer becomes the owner and can grant/revoke other roles
   */
  constructor() Ownable(_msgSender()) {}

  // ============ Modifiers ============
  
  /**
   * @dev Restricts access to accounts with registrar role
   * @notice Only registrars can register subdomains and set expiry
   */
  modifier onlyRegistrar() {
    if (!registrars[_msgSender()]) {
      revert InsufficientRole("REGISTRAR", _msgSender());
    }
    _;
  }

  // ============ Public Functions ============
  
  /// @dev Grants or revokes registrar role for an account
  /// @param registrar The account to grant/revoke registrar role
  /// @param enabled True to grant role, false to revoke
  function setRegistrar(address registrar, bool enabled) public onlyOwner {
    if (registrars[registrar] == enabled) {
      revert RoleAlreadySet(registrar, "REGISTRAR", enabled);
    }

    registrars[registrar] = enabled;
    emit RegistrarRoleChanged(registrar, enabled);
  }

  // ============ View Functions ============

  /// @dev Checks if an account has registrar role
  /// @param account The account to check
  /// @return True if the account has registrar role
  function isRegistrar(address account) public view returns (bool) {
    return registrars[account];
  }
}
