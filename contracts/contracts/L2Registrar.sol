// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Strings} from '@openzeppelin/contracts/utils/Strings.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

contract L2Registrar is Ownable {
  using Strings for string;

  // ============ State Variables ============

  uint256 public basePrice;
  uint256 public minLabelLength = 1;
  uint256 public maxLabelLength = 55;
  uint256 public priceVersion;

  mapping(uint256 => mapping(uint256 => uint256)) public versionableLabelPrices;
  mapping(uint256 => mapping(uint256 => bool)) public versionableLabelPriceSet;

  // ============ Constructor ============

  constructor() Ownable(msg.sender) {}

  // ============ Owner Functions ============

  function setBasePrice(uint256 _basePrice) external onlyOwner {
    basePrice = _basePrice;
  }

  function setLabelPrices(
    uint256[] calldata lengths,
    uint256[] calldata prices
  ) external onlyOwner {
    require(lengths.length == prices.length, 'Arrays length mismatch');

    priceVersion++;

    for (uint256 i = 0; i < lengths.length; i++) {
      versionableLabelPrices[priceVersion][lengths[i]] = prices[i];
      versionableLabelPriceSet[priceVersion][lengths[i]] = true;
    }
  }

  function setLabelLengthLimits(
    uint256 _minLength,
    uint256 _maxLength
  ) external onlyOwner {
    minLabelLength = _minLength;
    maxLabelLength = _maxLength;
  }

  // ============ View Functions ============

  function getPrice(string calldata label) external view returns (uint256) {
    uint256 length = bytes(label).length;

    if (length < minLabelLength || length > maxLabelLength) {
      revert('Invalid label length');
    }

    if (versionableLabelPriceSet[priceVersion][length]) {
      return versionableLabelPrices[priceVersion][length];
    }

    return basePrice;
  }
}
