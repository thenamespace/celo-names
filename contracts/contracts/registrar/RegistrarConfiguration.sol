// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

contract RegistrarConfiguration is Ownable {
  constructor() Ownable(_msgSender()) {}

  uint8 private reservationVersion;
  mapping(bytes32 => bool) public reservations;

  uint8 private whitelistVersion;
  mapping(bytes32 => bool) public whitelist;
  bool whitelistEnabled = true;

  uint8 private blacklistVersion;
  mapping(uint8 => mapping(bytes32 => bool)) blacklist;

  uint256 public maxLabelLen;
  uint256 public minLabelLen;

  uint8 labelPricesVersion;
  mapping(uint8 => mapping(uint256 => uint256)) labelPrices;

  uint256 private basePriceUsd;
  // We can support minimum price of to 0.001$;
  uint256 public basePriceDecimals = 3;

  function _getUsdPriceForLabel(
    string calldata label
  ) private view returns (uint256) {}

  function _isBlacklisted(string calldata label) internal view returns (bool) {
    return blacklist[blacklistVersion][_labelhash(label)];
  }

  function setBlacklist(
    string[] calldata labels,
    bool enabled,
    bool clearPreviousEntries
  ) public onlyOwner {
    if (clearPreviousEntries) {
      blacklistVersion++;
    }

    for (uint i = 0; i < labels.length; i++) {
      _modifyBlacklist(_labelhash(labels[i]), enabled);
    }
  }

  function _modifyBlacklist(bytes32 node, bool enabled) internal {
    blacklist[blacklistVersion][node] = enabled;
  }

  function _labelhash(string calldata label) internal pure returns (bytes32) {
    return keccak256(abi.encode(label));
  }
}
