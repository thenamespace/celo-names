// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {AggregatorV3Interface} from '../interfaces/AggregatorV3Interface.sol';

/// @title Native Payments
///
/// @notice Abstract contract for handling native token payments with USD price conversion.
///         Uses a Chainlink oracle for conversion of native tokens to usd and vice verase
abstract contract NativePayments is Ownable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice USD price oracle for native token conversion.
    AggregatorV3Interface private immutable usdOracle;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when USD price oracle is not set.
    error PriceFeedNotSet();

    /// @notice Thrown when price feed returns invalid data.
    error InvalidPriceFeedAnswer(int256 answer);

    /// @notice Thrown when insufficient funds are provided for registration.
    error InsufficientFunds(uint256 provided, uint256 required);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IMPLEMENTATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Constructor that sets the USD price oracle.
    ///
    /// @param _usdOracle The address of the USD price oracle for native token conversion.
    constructor(address _usdOracle) {
        usdOracle = AggregatorV3Interface(_usdOracle);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Collects native token funds for registration, handling refunds and treasury splits.
    ///
    /// @dev Processes payment in native tokens, validates sufficient funds, splits payment
    ///      between ENS treasury and regular treasury, and refunds any excess amount.
    ///
    /// @param price The required price in wei for the registration.
    function _collectFunds(uint256 price) internal {
        if (msg.value < price) {
            revert InsufficientFunds(msg.value, price);
        }

        if (price == 0) {
            // If price is 0, we don't need to do anything
            return;
        }

        // Calculate ENS treasury fee and regular treasury amount
        (uint256 ensTreasuryAmount, uint256 treasuryAmount) = _splitPayment(price);

        // Transfer ENS treasury portion if configured
        if (ensTreasuryAmount > 0) {
            address ensTreasury = _ensTreasury();
            if (ensTreasury != address(0)) {
                (bool success, ) = ensTreasury.call{value: ensTreasuryAmount}('');
                if (!success) {
                    revert('ENS Treasury transfer failed');
                }
            }
        }

        // Transfer remaining amount to regular treasury
        if (treasuryAmount > 0) {
            (bool success, ) = _treasury().call{value: treasuryAmount}('');
            if (!success) {
                revert('Treasury transfer failed');
            }
        }

        uint256 remainder = msg.value - price;
        // Return remainder to sender
        if (remainder > 0) {
            (bool success, ) = msg.sender.call{value: remainder}('');
            if (!success) {
                revert('Refund transfer failed');
            }
        }
    }

    /// @notice Convert USD price to native token (ETH/CELO) equivalent.
    ///
    /// @dev Converts a price in USD cents to the equivalent amount in native token wei
    ///      using Chainlink price oracle. Validates oracle data and handles price conversion.
    ///
    /// @param priceInCents Price in USD cents (e.g., 500 = $5.00, 1 = $0.01).
    ///
    /// @return Price in native token wei.
    function _convertToNativePrice(
        uint256 priceInCents
    ) internal view returns (uint256) {
        if (address(usdOracle) == address(0)) {
            revert PriceFeedNotSet();
        }

        (uint80 roundId, int256 answer, , , uint80 answeredInRound) = usdOracle
            .latestRoundData();

        // Check if round is complete
        if (answeredInRound != roundId) {
            revert InvalidPriceFeedAnswer(answer);
        }

        // Check if answer is valid (positive)
        if (answer <= 0) {
            revert InvalidPriceFeedAnswer(answer);
        }

        // 1. Convert usdPrice from cents to dollars, then scale to feed decimals
        // usdPrice is in cents, so divide by USD cents divisor to get dollars
        // e.g. 500 cents ($5.00) => 5 dollars => 5 * 1e8
        // e.g. 1 cent ($0.01) => 0.01 dollars => 0.01 * 1e8 = 1e6
        uint256 usdPriceScaled = (priceInCents * 1e8) / _usdCentsDivisor();

        // 2. Convert USD → native token with overflow protection
        // answer = price of 1 native token in USD with `decimals`
        // so: nativeWei = (usdPriceScaled * 1e18) / answer
        uint256 nativeWei = (usdPriceScaled * 1e18) / uint256(answer);

        return nativeWei;
    }

    /// @dev Returns the treasury address for fund collection.
    ///
    /// @return The treasury address.
    function _treasury() internal virtual returns (address);

    /// @dev Returns the ENS treasury address for ENS fee collection.
    ///
    /// @return The ENS treasury address.
    function _ensTreasury() internal virtual view returns (address);

    /// @dev Returns the ENS treasury fee percentage in basis points.
    ///
    /// @return The fee percentage in basis points.
    function _ensTreasuryFeePercent() internal virtual view returns (uint16);

    /// @dev Returns the basis points divisor for fee calculations.
    ///
    /// @return The basis points divisor (typically 10000).
    function _basisPointsDivisor() internal virtual pure returns (uint256);

    /// @dev Returns the USD cents divisor for converting cents to dollars.
    ///
    /// @return The USD cents divisor (typically 100).
    function _usdCentsDivisor() internal virtual pure returns (uint256);

    /// @notice Splits payment between ENS treasury and regular treasury based on fee percentage.
    ///
    /// @dev Calculates the split of payment amount between ENS treasury and regular treasury
    ///      based on the configured fee percentage. Returns the split amounts.
    ///
    /// @param totalAmount The total payment amount to split.
    ///
    /// @return ensTreasuryAmount The amount to send to ENS treasury.
    /// @return treasuryAmount The amount to send to regular treasury.
    function _splitPayment(uint256 totalAmount) internal view returns (uint256 ensTreasuryAmount, uint256 treasuryAmount) {
        uint16 feePercent = _ensTreasuryFeePercent();
        
        if (feePercent == 0 || _ensTreasury() == address(0)) {
            // No ENS treasury configured, send everything to regular treasury
            return (0, totalAmount);
        }

        // Calculate ENS treasury amount (feePercent is in basis points, so divide by basis points divisor)
        uint256 divisor = _basisPointsDivisor();
        ensTreasuryAmount = (totalAmount * feePercent) / divisor;
        treasuryAmount = totalAmount - ensTreasuryAmount;
    }
}
