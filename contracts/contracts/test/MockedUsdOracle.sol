// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from '../interfaces/AggregatorV3Interface.sol';

// Mocked USD Oracle for test purposes
contract MockedUsdOracle is AggregatorV3Interface {
  uint256 private immutable ETH_PRICE_USD;
  uint80 private constant ROUND_ID = 1;
  uint256 private immutable STARTED_AT;
  uint256 private immutable UPDATED_AT;

  constructor(uint256 _ethPriceUsd) {
    ETH_PRICE_USD = _ethPriceUsd;
    STARTED_AT = block.timestamp;
    UPDATED_AT = block.timestamp;
  }

  function decimals() external pure returns (uint8) {
    return 8;
  }

  function description() external pure returns (string memory) {
    return "ETH / USD";
  }

  function version() external pure returns (uint256) {
    return 1;
  }

  function getRoundData(
    uint80 _roundId
  )
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    return (
      _roundId,
      int256(ETH_PRICE_USD),
      STARTED_AT,
      UPDATED_AT,
      _roundId
    );
  }

  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    return (
      ROUND_ID,
      int256(ETH_PRICE_USD),
      STARTED_AT,
      UPDATED_AT,
      ROUND_ID
    );
  }
}
