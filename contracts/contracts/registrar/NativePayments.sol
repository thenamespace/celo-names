// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {AggregatorV3Interface} from '../interfaces/AggregatorV3Interface.sol';

/**
 * @title NativePayments
 * @notice Abstract contract for handling native token payments (ETH/CELO) with USD price conversion
 * @dev Provides secure payment processing for native tokens with:
 *      - USD to native token price conversion via Chainlink oracles
 *      - Automatic refund of excess funds
 *      - Treasury fund management
 *      - Price feed validation and error handling
 */
abstract contract NativePayments is Ownable {
  // ============ State Variables ============
  
  // USD price oracle for native token (ETH/CELO) conversion
  AggregatorV3Interface private immutable usdOracle;

  // ============ Custom Errors ============
  
  /// @dev Thrown when USD price oracle is not set
  error PriceFeedNotSet();
  /// @dev Thrown when price feed returns invalid data
  error InvalidPriceFeedAnswer(int256 answer);
  /// @dev Thrown when insufficient funds are provided for registration
  error InsufficientFunds(uint256 provided, uint256 required);

  // ============ Constructor ============
  
  constructor(address _usdOracle) {
    usdOracle = AggregatorV3Interface(_usdOracle);
  }

  // ============ INTERNAL FUNCTIONS ============

  function _collectFunds(uint256 value) internal {

    if (value == 0) {
      return;
    }

    if (msg.value < value) {
      revert InsufficientFunds(value, msg.value);
    }

    // Transfer required amount to treasury
    if (value > 0) {
      (bool success, ) = _treasury().call{value: value}('');
      if (!success) {
        revert('Treasury transfer failed');
      }
    }

    uint256 remainder = msg.value - value;
    // Return remainder to sender
    if (remainder > 0) {
      (bool success, ) = msg.sender.call{value: remainder}('');
      if (!success) {
        revert('Refund transfer failed');
      }
    }
  }

  /// @notice Convert USD price to native token (ETH/CELO) equivalent
  /// @param usdPrice Price in USD (whole dollars)
  /// @return Price in native token wei
  function _convertToNativePrice(
    uint256 usdPrice
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

    // 1. Scale usdPrice (whole dollars) to feed decimals
    // e.g. $5 with decimals=8 => 5 * 1e8
    uint256 usdPriceScaled = usdPrice * 1e8;

    // 2. Convert USD → native token with overflow protection
    // answer = price of 1 native token in USD with `decimals`
    // so: nativeWei = (usdPriceScaled * 1e18) / answer
    uint256 nativeWei = (usdPriceScaled * 1e18) / uint256(answer);

    return nativeWei;
  }

  function _treasury() internal virtual returns (address);
}
