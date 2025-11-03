// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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

  // ============ CUSTOM ERRORS ============

  /// @dev Thrown when user attempts to register a name with unsupported length
  error InvalidLabelLength();
 
  /// @dev Thrown when arrays length mismatch in setLabelPrices
  error ArraysLengthMismatch(uint256 lengthsLength, uint256 pricesLength);

  // ============ EVENTS ============

  /// @dev Emitted when base price is changed
  event BasePriceChanged(uint256 indexed newBasePrice);

  /// @dev Emitted when label length limits are changed
  event LabelLengthLimitsChanged(uint256 indexed newMinLength, uint256 indexed newMaxLength);

  /// @dev Emitted when label prices are updated
  event LabelPricesChanged(uint256[] lengths, uint256[] prices, bool clearPrevious);

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
  /// @param prices Array of prices in USD cents for each length (e.g., 500 = $5.00, 1 = $0.01)
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
  /// @param _basePrice Base price in USD cents (e.g., 500 = $5.00, 1 = $0.01)
  function setBasePrice(uint256 _basePrice) external onlyOwner {
    _setBasePrice(_basePrice);
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
    emit LabelLengthLimitsChanged(_minLabelLength, _maxLabelLength);
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

    emit LabelPricesChanged(lengths, prices, clearPrevious);
  }

  function _setBasePrice(uint256 _basePrice) internal {
    basePrice = _basePrice;
    emit BasePriceChanged(_basePrice);
  }

  function _getPriceForLabel(
    string calldata label
  ) internal view returns (uint256) {
    uint256 labelLength = label.strlen();

    // Use special price if set, otherwise use base price
    if (labelPriceSet[labelPricesVersion][labelLength]) {
      return labelPrices[labelPricesVersion][labelLength];
    }
    
    return basePrice;
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
