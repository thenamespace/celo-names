// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract RegistryManager is Ownable {
    mapping(address => bool) controllers;
    mapping(address => bool) admins;

    event AdminChanged(address manager, bool enabled);

    event ControllerChanged(address controller, bool enabled);

    modifier onlyAdmin() {
        require(isAdmin(_msgSender()));
        _;
    }

    modifier onlyController() {
        require(isController(_msgSender()));
        _;
    }

    constructor() Ownable(_msgSender()) {}

    function isAdmin(address admin) internal view returns (bool) {
        return admins[admin];
    }

    function isController(address controller) internal view returns (bool) {
        return controllers[controller];
    }

    function setAdmin(address admin, bool enabled) public onlyOwner {
        require(admins[admin] != enabled, "Already same");

        admins[admin] = enabled;
        emit AdminChanged(admin, enabled);
    }

    function setController(address controller, bool enabled) public onlyOwner {
        require(controllers[controller] != enabled, "Already same");

        controllers[controller] = enabled;
        emit ControllerChanged(controller, enabled);
    }
}
