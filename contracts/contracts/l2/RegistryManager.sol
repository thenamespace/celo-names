// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract RegistryManager is Ownable {
    mapping(address => bool) registrars;
    mapping(address => bool) admins;

    event AdminChanged(address manager, bool enabled);
    event RegistrarChanged(address controller, bool enabled);

    modifier onlyAdmin() {
        require(isAdmin(_msgSender()));
        _;
    }

    modifier onlyRegistrar() {
        require(isRegistrar(_msgSender()));
        _;
    }

    constructor() Ownable(_msgSender()) {}

    function isAdmin(address admin) internal view returns (bool) {
        return admins[admin];
    }

    function isRegistrar(address controller) internal view returns (bool) {
        return registrars[controller];
    }

    function setAdmin(address admin, bool enabled) public onlyOwner {
        require(admins[admin] != enabled, "Admin already set");

        admins[admin] = enabled;
        emit AdminChanged(admin, enabled);
    }

    function setRegistrar(address registrar, bool enabled) public onlyOwner {
        require(registrars[registrar] != enabled, "Registrar already set");

        registrars[registrar] = enabled;
        emit RegistrarChanged(registrar, enabled);
    }
}
