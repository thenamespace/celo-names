// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {StringUtils} from '../common/StringUtils.sol';

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
 * @dev Provides label validation, pricing logic, and blacklist management
 */
abstract contract RegistrarRules is Ownable {
  using StringUtils for string;

  // ============ State Variables ============

  /// @dev Maximum allowed registration duration in years
  uint64 private constant MAX_EXPIRY_YEARS = 10_000;

  /// @dev Minimum allowed registration duration in years
  uint64 private constant MIN_EXPIRY_YEARS = 1;

  // Label length constraints
  uint256 public minLabelLength;
  uint256 public maxLabelLength;

  // Dynamic pricing system with versioning
  uint8 private labelPricesVersion;
  mapping(uint8 => mapping(uint256 => uint256)) private labelPrices;
  mapping(uint8 => mapping(uint256 => bool)) private labelPriceSet;

  // Base pricing configuration
  uint256 public basePrice;

  // Blacklisted labels, cannot be minted by anyone
  uint8 blacklistedLabelsVersion;
  mapping(uint8 => mapping(bytes32 => bool)) blacklistedLabels;

  // ============ CUSTOM ERRORS ============

  /// @dev Thrown when user attempts to register a name with unsupported length
  error InvalidLabelLength();
  /// @dev Thrown when when a name is blacklisted
  error BlacklistedName(string label);
  /// @dev Thrown when arrays length mismatch in setLabelPrices
  error ArraysLengthMismatch(uint256 lengthsLength, uint256 pricesLength);

  // ============ OWNER FUNCTIONS ============

  /// @notice Configure registrar rules with a single configuration struct
  /// @param _rules Configuration struct containing all rule parameters
  /// @param _clearPrevious Whether to clear previous label price settings
  function configureRules(
    RegistrarRulesConfig memory _rules,
    bool _clearPrevious
  ) external onlyOwner {
    _configureRules(_rules, _clearPrevious);
  }

  /// @notice Set multiple label prices at once
  /// @param lengths Array of label lengths
  /// @param prices Array of prices for each length
  function setLabelPrices(
    uint256[] calldata lengths,
    uint256[] calldata prices,
    bool clearPrevious
  ) external onlyOwner {
    _setLabelPrices(lengths, prices, clearPrevious);
  }

  /// @notice Set minimum and maximum allowed label lengths
  /// @param minLength Minimum allowed label length
  /// @param maxLength Maximum allowed label length
  function setLabelLengthLimits(uint256 minLength, uint256 maxLength) external onlyOwner {
    _setLabelLimits(minLength, maxLength);
  } 

  /// @notice Set the base price for labels without specific length pricing
  /// @param _basePrice Base price in USD for labels
  function setBasePrice(uint256 _basePrice) external onlyOwner {
    _setBasePrice(_basePrice);
  }

  /// @notice Add labels to the blacklist to prevent registration
  /// @param blacklisted Array of label hashes to blacklist
  /// @param clearPreviousEntries Whether to clear existing blacklist entries
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

  // ============ INTERNAL FUNCTIONS ============

  function _configureRules(
    RegistrarRulesConfig memory _rules,
    bool clearPrevious
  ) internal {
    _setLabelLimits(_rules.minLabelLength, _rules.maxLabelLength);
    _setBasePrice(_rules.basePrice);
    _setLabelPrices(_rules.labelLength, _rules.labelPrices, clearPrevious);
  }

  function _setLabelLimits(
    uint256 _minLabelLength,
    uint256 _maxLabelLength
  ) internal {
    minLabelLength = _minLabelLength;
    maxLabelLength = _maxLabelLength;
  }

  function _setLabelPrices(
    uint256[] memory lengths,
    uint256[] memory prices,
    bool clearPrevious
  ) internal {
    if (lengths.length != prices.length) {
      revert ArraysLengthMismatch(lengths.length, prices.length);
    }

    if (clearPrevious) {
      labelPricesVersion++;
    }

    for (uint256 i = 0; i < lengths.length; i++) {
      labelPrices[labelPricesVersion][lengths[i]] = prices[i];
      labelPriceSet[labelPricesVersion][lengths[i]] = true;
    }
  }

  function _setBasePrice(uint256 _basePrice) internal {
    basePrice = _basePrice;
  }

  function _getUsdPriceForLabel(
    string calldata label
  ) internal view returns (uint256) {
    uint256 labelLength = label.strlen();

    // Use special price if set, otherwise use base price
    if (labelPriceSet[labelPricesVersion][labelLength]) {
      return labelPrices[labelPricesVersion][labelLength];
    }

    return basePrice;
  }

  function _isBlacklisted(string calldata label) internal view returns (bool) {
    return blacklistedLabels[blacklistedLabelsVersion][_labelhash(label)];
  }

  function _isValidLabelLength(
    string calldata label
  ) internal view returns (bool) {
    uint256 labelLength = label.strlen();
    return labelLength >= minLabelLength && labelLength <= maxLabelLength;
  }

  function _isValidDuration(
    uint64 durationInYears
  ) internal pure returns (bool) {
    return
      durationInYears <= MAX_EXPIRY_YEARS &&
      durationInYears >= MIN_EXPIRY_YEARS;
  }

  function _labelhash(string calldata label) internal pure returns (bytes32) {
    return keccak256(bytes(label));
  }
}
