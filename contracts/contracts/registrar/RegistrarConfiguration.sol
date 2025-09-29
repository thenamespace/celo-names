// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

// Custom errors for gas efficiency
error InvalidLabelLength();
error InvalidPriceConfiguration();
error WhitelistDisabled();

contract RegistrarConfiguration is Ownable {
  constructor() Ownable(_msgSender()) {}

  // Whitelist system for access control
  uint8 private whitelistVersion;
  mapping(bytes32 => bool) public whitelist;
  bool public whitelistEnabled = true;

  // Label length constraints
  uint256 public maxLabelLength;
  uint256 public minLabelLength;

  // Dynamic pricing system
  uint8 private labelPricesVersion;
  mapping(uint8 => mapping(uint256 => uint256)) private labelPrices;

  // Base pricing configuration
  uint256 private basePriceUsd;
  uint256 public basePriceDecimals = 3; // Minimum price: 0.001$

  // Events for configuration changes
  event WhitelistUpdated(string[] labels, bool enabled, uint8 version);
  event LabelLengthsUpdated(uint256 minLength, uint256 maxLength);
  event PricingUpdated(uint256 basePrice, uint8 decimals);
  event WhitelistToggled(bool enabled);

  /// @notice Calculate USD price for a label based on length
  /// @param label Label to calculate price for
  /// @return Price in USD with decimals
  function _getUsdPriceForLabel(
    string calldata label
  ) private view returns (uint256) {
    uint256 labelLength = bytes(label).length;
    if (labelLength < minLabelLength || labelLength > maxLabelLength) {
      revert InvalidLabelLength();
    }
    
    // Base price + length-based pricing
    uint256 lengthPrice = labelPrices[labelPricesVersion][labelLength];
    return basePriceUsd + lengthPrice;
  }


  /// @notice Check if label is whitelisted (if whitelist enabled)
  /// @param label Label to check
  /// @return Whether label is whitelisted
  function _isWhitelisted(string calldata label) internal view returns (bool) {
    if (!whitelistEnabled) return true;
    return whitelist[_labelhash(label)];
  }

  /// @notice Validate label against all constraints
  /// @param label Label to validate
  function _validateLabel(string calldata label) internal view {
    uint256 labelLength = bytes(label).length;
    if (labelLength < minLabelLength || labelLength > maxLabelLength) {
      revert InvalidLabelLength();
    }
    
    if (!_isWhitelisted(label)) revert WhitelistDisabled();
  }

  // ============ OWNER CONFIGURATION FUNCTIONS ============


  /// @notice Update whitelist entries
  /// @param labels Array of labels to modify
  /// @param enabled Whether to add or remove from whitelist
  /// @param clearPreviousEntries Whether to clear existing entries
  function setWhitelist(
    string[] calldata labels,
    bool enabled,
    bool clearPreviousEntries
  ) external onlyOwner {
    if (clearPreviousEntries) {
      whitelistVersion++;
    }

    for (uint256 i = 0; i < labels.length; i++) {
      whitelist[_labelhash(labels[i])] = enabled;
    }
    
    emit WhitelistUpdated(labels, enabled, whitelistVersion);
  }


  /// @notice Set label length constraints
  /// @param minLength Minimum label length
  /// @param maxLength Maximum label length
  function setLabelLengths(
    uint256 minLength,
    uint256 maxLength
  ) external onlyOwner {
    if (minLength == 0 || maxLength == 0 || minLength > maxLength) {
      revert InvalidLabelLength();
    }
    
    minLabelLength = minLength;
    maxLabelLength = maxLength;
    
    emit LabelLengthsUpdated(minLength, maxLength);
  }

  /// @notice Set base pricing configuration
  /// @param basePrice Base price in USD
  /// @param decimals Number of decimal places
  function setBasePricing(
    uint256 basePrice,
    uint8 decimals
  ) external onlyOwner {
    if (decimals > 18) revert InvalidPriceConfiguration();
    
    basePriceUsd = basePrice;
    basePriceDecimals = decimals;
    
    emit PricingUpdated(basePrice, decimals);
  }

  /// @notice Set length-based pricing
  /// @param length Label length
  /// @param price Additional price for this length
  function setLengthPrice(
    uint256 length,
    uint256 price
  ) external onlyOwner {
    labelPrices[labelPricesVersion][length] = price;
  }

  /// @notice Toggle whitelist functionality
  /// @param enabled Whether to enable whitelist
  function toggleWhitelist(bool enabled) external onlyOwner {
    whitelistEnabled = enabled;
    emit WhitelistToggled(enabled);
  }

  // ============ INTERNAL HELPER FUNCTIONS ============

  /// @notice Generate label hash
  /// @param label Label to hash
  /// @return Keccak256 hash of label
  function _labelhash(string calldata label) internal pure returns (bytes32) {
    return keccak256(abi.encode(label));
  }
}
