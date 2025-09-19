// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from '../interfaces/AggregatorV3Interface.sol';

contract MockedUsdOracle is AggregatorV3Interface {
  function decimals() external view returns (uint8) {
    return 0;
  }

  function description() external view returns (string memory) {
    return '';
  }

  function version() external view returns (uint256) {
    return 0;
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
    return (1, 1, 1, 1, 1);
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
    return (1, 1, 1, 1, 1);
  }
}
