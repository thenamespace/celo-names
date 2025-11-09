// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';


/// @title Registrar Control
///
/// @notice Abstract contract that provides access control for registrar functionality.
///         Allows the owner to grant and revoke registrar roles to accounts.
abstract contract RegistrarControl is Ownable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when attempting to set a role that is already set to the same value.
    error RoleAlreadySet(address account, string role, bool enabled);

    /// @notice Thrown when attempting to perform an action without the required role.
    error InsufficientRole(string requiredRole, address account);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Mapping of addresses to registrar status.
    mapping(address => bool) public registrars;

    string constant ROLE_REGISTRAR = "REGISTRAR";

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a registrar role is granted or revoked.
    ///
    /// @param account The address whose registrar role was changed.
    /// @param enabled Whether the registrar role was enabled or disabled.
    event RegistrarRoleChanged(address account, bool enabled);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IMPLEMENTATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Registrar Control constructor.
    ///
    /// @dev Initializes the contract and sets up the owner. The deployer becomes the owner
    ///      and can grant/revoke other roles.
    constructor() Ownable(_msgSender()) {}

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         MODIFIERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Restricts access to accounts with registrar role.
    ///
    /// @dev Only registrars can register subdomains and set expiry.
    modifier onlyRegistrar() {
        if (!registrars[_msgSender()]) {
            revert InsufficientRole(ROLE_REGISTRAR, _msgSender());
        }
        _;
    }

    /// @notice Grants or revokes registrar role for an account.
    ///
    /// @dev Allows the owner to manage registrar permissions.
    ///
    /// @param registrar The account to grant/revoke registrar role.
    /// @param enabled True to grant role, false to revoke.
    ///
    /// Requirements:
    /// - Caller must be the contract owner.
    function setRegistrar(address registrar, bool enabled) public onlyOwner {
        if (registrars[registrar] == enabled) {
            revert RoleAlreadySet(registrar, ROLE_REGISTRAR, enabled);
        }

        registrars[registrar] = enabled;
        emit RegistrarRoleChanged(registrar, enabled);
    }

    /// @notice Checks if an account has registrar role.
    ///
    /// @param account The account to check.
    ///
    /// @return True if the account has registrar role.
    function isRegistrar(address account) public view returns (bool) {
        return registrars[account];
    }
}
