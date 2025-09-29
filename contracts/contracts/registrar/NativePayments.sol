// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {AggregatorV3Interface} from '../interfaces/AggregatorV3Interface.sol';

abstract contract NativePayments is Ownable {
  /// @dev Thrown when price feed is not set
  error PriceFeedNotSet();

  /// @dev Thrown when price feed returns invalid data
  error InvalidPriceFeedAnswer(int256 answer);

  /// @dev USD price oracle for ETH conversion
  AggregatorV3Interface private immutable usdOracle;

  constructor(address _usdOracle) {
    usdOracle = AggregatorV3Interface(_usdOracle);
  }

  function _transferNativeFunds(uint256 value) internal {
    if (msg.value == 0) return;

    uint256 remainder = msg.value - value;

    // Transfer required amount to treasury
    if (value > 0) {
      (bool success, ) = _treasury().call{value: value}('');
      if (!success) {
        revert('Treasury transfer failed');
      }
    }

    // Return remainder to sender
    if (remainder > 0) {
      (bool success, ) = msg.sender.call{value: remainder}('');
      if (!success) {
        revert('Refund transfer failed');
      }
    }
  }

  // Dev converts USD to ETH/CELO equivalent
  // to its
  function _convertToStablePrice(
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

    // 2. Convert USD → ETH with overflow protection
    // answer = price of 1 ETH in USD with `decimals`
    // so: ethWei = (usdPriceScaled * 1e18) / answer
    uint256 ethWei = (usdPriceScaled * 1e18) / uint256(answer);

    return ethWei;
  }

  /// @notice Get treasury address for token transfers
  /// @return Treasury address
  function _treasury() internal virtual returns (address);
}
