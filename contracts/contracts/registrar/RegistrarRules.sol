// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {StringUtils} from '../common/StringUtils.sol';

// Custom errors for gas efficiency
error InvalidLabelLength();
error InvalidPriceConfiguration();
error WhitelistDisabled();
error BlacklistedName(string label);

struct RegistrarRulesConfig {
  uint256 maxLabelLength;
  uint256 minLabelLength;
  uint256[] labelPrices;
  uint256[] labelLength;
  uint256 basePrice;
}

/**
 * @title RegistrarRules
 * @notice Abstract contract for managing registrar rules and validation
 * @dev Provides label validation, pricing logic, and whitelist management for registrars
 */
abstract contract RegistrarRules is Ownable {
  using StringUtils for string;

  // ============ State Variables ============

  // Label length constraints
  uint256 public minLabelLength;
  uint256 public maxLabelLength;

  // Dynamic pricing system with versioning
  uint8 private labelPricesVersion;
  mapping(uint8 => mapping(uint256 => uint256)) private labelPrices;
  mapping(uint8 => mapping(uint256 => bool)) private labelPriceSet;

  // Base pricing configuration
  uint256 private basePriceUsd;

  // Blacklisted labels, cannot be minted by anyone
  uint8 blacklistedLabelsVersion;
  mapping(uint8 => mapping(bytes32 => bool)) blacklistedLabels;

  // ============ Events ============

  event WhitelistUpdated(string[] labels, bool enabled, uint8 version);
  event LabelLengthsUpdated(uint256 minLength, uint256 maxLength);
  event BasePriceUpdated(uint256 basePrice);
  event WhitelistToggled(bool enabled);

  // ============ INTERNAL FUNCTIONS ============

  /// @notice Calculate USD price for a label based on length
  /// @param label Label to calculate price for
  /// @return Price in USD with decimals
  function _getUsdPriceForLabel(
    string calldata label
  ) internal view returns (uint256) {
    uint256 labelLength = label.strlen();

    // Use special price if set, otherwise use base price
    if (labelPriceSet[labelPricesVersion][labelLength]) {
      return labelPrices[labelPricesVersion][labelLength];
    }

    return basePriceUsd;
  }

  function _isBlacklisted(string calldata label) internal view returns (bool) {
    return blacklistedLabels[blacklistedLabelsVersion][_labelhash(label)];
  }

  /// @notice Validate label against all constraints
  /// @param label Label to validate
  function _isValidLabel(string calldata label) internal view {
    uint256 labelLength = label.strlen();
    if (labelLength < minLabelLength || labelLength > maxLabelLength) {
      revert InvalidLabelLength();
    }
  }

  /// @notice Check if label length is valid
  /// @param label Label to check
  /// @return Whether label length is valid
  function _isValidLabelLength(
    string calldata label
  ) internal view returns (bool) {
    uint256 labelLength = label.strlen();
    return labelLength >= minLabelLength && labelLength <= maxLabelLength;
  }

  /// @notice Get base price in USD
  /// @return Base price in USD
  function _getBasePriceUsd() internal view returns (uint256) {
    return basePriceUsd;
  }

  /// @notice Generate label hash
  /// @param label Label to hash
  /// @return Keccak256 hash of label
  function _labelhash(string calldata label) internal pure returns (bytes32) {
    return keccak256(abi.encode(label));
  }

  // ============ OWNER FUNCTIONS ============

  /// @notice Set multiple label prices at once
  /// @param lengths Array of label lengths
  /// @param prices Array of prices for each length
  function setLabelPrices(
    uint256[] calldata lengths,
    uint256[] calldata prices
  ) external onlyOwner {
    if (lengths.length != prices.length) {
      revert InvalidPriceConfiguration();
    }

    for (uint256 i = 0; i < lengths.length; i++) {
      labelPrices[labelPricesVersion][lengths[i]] = prices[i];
      labelPriceSet[labelPricesVersion][lengths[i]] = true;
    }
  }

  function setBasePrice(uint256 _basePrice) external onlyOwner {
    basePriceUsd = _basePrice;
  }

  function setBlacklist(
    bytes32[] calldata blacklisted,
    bool clearPreviousEntries
  ) external onlyOwner {
    if (clearPreviousEntries) {
      blacklistedLabelsVersion++;
    }

    for (uint i = 0; i < blacklisted.length; i++) {
      blacklistedLabels[blacklistedLabelsVersion][blacklisted[i]] = true;
    }
  }
}
