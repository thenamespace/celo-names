// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ENSNamehash} from '../common/ENSNamehash.sol';

/**
 * @title ENSNamehashTest
 * @dev Test contract to expose ENSNamehash library functions for testing
 */
contract ENSNamehashTest {
  function namehash(string memory domain) public pure returns (bytes32) {
    return ENSNamehash.namehash(domain);
  }

  function namehash(bytes memory domain, uint256 i) public pure returns (bytes32) {
    return ENSNamehash.namehash(domain, i);
  }
}
