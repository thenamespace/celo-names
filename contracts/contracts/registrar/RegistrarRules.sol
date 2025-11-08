// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {StringUtils} from '../common/StringUtils.sol';

/// @notice Configuration struct for registrar rules.
struct RegistrarRulesConfig {
    uint256 maxLabelLength;
    uint256 minLabelLength;
    uint256[] labelPrices;
    uint256[] labelLength;
    uint256 basePrice;
}

/// @title Registrar Rules
///
/// @notice Abstract contract for managing registrar rules and validation.
///         Provides label validation, pricing logic, and blacklist management.
abstract contract RegistrarRules is Ownable {
    using StringUtils for string;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTANTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Maximum allowed registration duration in years.
    uint64 private constant MAX_EXPIRY_YEARS = 10_000;

    /// @notice Minimum allowed registration duration in years.
    uint64 private constant MIN_EXPIRY_YEARS = 1;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Minimum allowed label length.
    uint256 private minLabelLength;

    /// @notice Maximum allowed label length.
    uint256 private maxLabelLength;

    /// @notice Dynamic pricing system version for label prices.
    uint8 private labelPricesVersion;

    /// @notice Mapping from version and label length to price in USD cents.
    mapping(uint8 => mapping(uint256 => uint256)) private labelPrices;

    /// @notice Mapping from version and label length to whether price is set.
    mapping(uint8 => mapping(uint256 => bool)) private labelPriceSet;

    /// @notice Base price for labels without specific length pricing (in USD cents).
    uint256 private basePrice;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when user attempts to register a name with unsupported length.
    error InvalidLabelLength();
 
    /// @notice Thrown when arrays length mismatch in setLabelPrices.
    error ArraysLengthMismatch(uint256 lengthsLength, uint256 pricesLength);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when base price is changed.
    ///
    /// @param newBasePrice The new base price in USD cents.
    event BasePriceChanged(uint256 indexed newBasePrice);

    /// @notice Emitted when label length limits are changed.
    ///
    /// @param newMinLength The new minimum label length.
    /// @param newMaxLength The new maximum label length.
    event LabelLengthLimitsChanged(uint256 indexed newMinLength, uint256 indexed newMaxLength);

    /// @notice Emitted when label prices are updated.
    ///
    /// @param lengths Array of label lengths that had prices updated.
    /// @param prices Array of prices in USD cents for each length.
    /// @param clearPrevious Whether previous price settings were cleared.
    event LabelPricesChanged(uint256[] lengths, uint256[] prices, bool clearPrevious);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       OWNER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Configure registrar rules with a single configuration struct.
    ///
    /// @param _rules Configuration struct containing all rule parameters.
    /// @param _clearPrevious Whether to clear previous label price settings.
    function configureRules(
        RegistrarRulesConfig memory _rules,
        bool _clearPrevious
    ) external onlyOwner {
        _configureRules(_rules, _clearPrevious);
    }

    /// @notice Set multiple label prices at once.
    ///
    /// @param lengths Array of label lengths.
    /// @param prices Array of prices in USD cents for each length (e.g., 500 = $5.00, 1 = $0.01).
    /// @param clearPrevious Whether to clear previous price settings.
    function setLabelPrices(
        uint256[] calldata lengths,
        uint256[] calldata prices,
        bool clearPrevious
    ) external onlyOwner {
        _setLabelPrices(lengths, prices, clearPrevious);
    }

    /// @notice Set minimum and maximum allowed label lengths.
    ///
    /// @param minLength Minimum allowed label length.
    /// @param maxLength Maximum allowed label length.
    function setLabelLengthLimits(uint256 minLength, uint256 maxLength) external onlyOwner {
        _setLabelLimits(minLength, maxLength);
    } 

    /// @notice Set the base price for labels without specific length pricing.
    ///
    /// @param _basePrice Base price in USD cents (e.g., 500 = $5.00, 1 = $0.01).
    function setBasePrice(uint256 _basePrice) external onlyOwner {
        _setBasePrice(_basePrice);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  
    /// @dev Configure registrar rules with a single configuration struct.
    ///
    /// @param _rules Configuration struct containing all rule parameters.
    /// @param clearPrevious Whether to clear previous label price settings.
    function _configureRules(
        RegistrarRulesConfig memory _rules,
        bool clearPrevious
    ) internal {
        _setLabelLimits(_rules.minLabelLength, _rules.maxLabelLength);
        _setBasePrice(_rules.basePrice);
        _setLabelPrices(_rules.labelLength, _rules.labelPrices, clearPrevious);
    }

    /// @dev Set minimum and maximum label length limits.
    ///
    /// @param _minLabelLength Minimum allowed label length.
    /// @param _maxLabelLength Maximum allowed label length.
    function _setLabelLimits(
        uint256 _minLabelLength,
        uint256 _maxLabelLength
    ) internal {
        minLabelLength = _minLabelLength;
        maxLabelLength = _maxLabelLength;
        emit LabelLengthLimitsChanged(_minLabelLength, _maxLabelLength);
    }

    /// @dev Set multiple label prices at once.
    ///
    /// @param lengths Array of label lengths.
    /// @param prices Array of prices in USD cents for each length.
    /// @param clearPrevious Whether to clear previous price settings.
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

    /// @dev Set the base price for labels without specific length pricing.
    ///
    /// @param _basePrice Base price in USD cents.
    function _setBasePrice(uint256 _basePrice) internal {
        basePrice = _basePrice;
        emit BasePriceChanged(_basePrice);
    }

    /// @dev Get price for a label based on its length.
    ///
    /// @param label The label to get price for.
    ///
    /// @return Price in USD cents (uses special price if set, otherwise base price).
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

    /// @dev Check if label length is within valid range.
    ///
    /// @param label The label to validate.
    ///
    /// @return True if label length is valid, false otherwise.
    function _isValidLabelLength(
        string calldata label
    ) internal view returns (bool) {
        uint256 labelLength = label.strlen();
        return labelLength >= minLabelLength && labelLength <= maxLabelLength;
    }

    /// @dev Check if registration duration is within valid range.
    ///
    /// @param durationInYears Registration duration in years.
    ///
    /// @return True if duration is valid, false otherwise.
    function _isValidDuration(
        uint64 durationInYears
    ) internal pure returns (bool) {
        return
            durationInYears <= MAX_EXPIRY_YEARS &&
            durationInYears >= MIN_EXPIRY_YEARS;
    }

    /// @dev Compute labelhash for a label.
    ///
    /// @param label The label to hash.
    ///
    /// @return The keccak256 hash of the label bytes.
    function _labelhash(string calldata label) internal pure returns (bytes32) {
        return keccak256(bytes(label));
    }
}
