// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ENSNamehash
 * @dev Solidity library implementation of the ENS namehash algorithm (EIP-137).
 * 
 * Warning! Does not normalize or validate names before hashing.
 * Names should be normalized according to ENSIP-15 before calling this library.
 */
library ENSNamehash {
  /**
   * @dev Computes the namehash for a domain name string
   * @param domain The domain name (e.g., "test.eth")
   * @return The namehash (node) for the given domain
   */
  function namehash(string memory domain) internal pure returns (bytes32) {
    return namehash(bytes(domain), 0);
  }

  /**
   * @dev Recursive namehash computation starting at offset i
   * @param domain The domain name as bytes
   * @param i Starting offset in the domain bytes
   * @return The namehash starting from offset i
   */
  function namehash(bytes memory domain, uint256 i) internal pure returns (bytes32) {
    if (domain.length <= i) {
      return 0x0000000000000000000000000000000000000000000000000000000000000000;
    }

    uint256 len = labelLength(domain, i);

    return keccak256(
      abi.encodePacked(
        namehash(domain, i + len + 1),
        keccak256(abi.encodePacked(extractLabel(domain, i, len)))
      )
    );
  }

  /**
   * @dev Gets the length of the label starting at offset i
   * @param domain The domain name as bytes
   * @param i Starting offset
   * @return The length of the label (up to the next '.' or end of string)
   */
  function labelLength(bytes memory domain, uint256 i) private pure returns (uint256) {
    uint256 len;
    while (i + len != domain.length && domain[i + len] != 0x2e) {
      len++;
    }
    return len;
  }

  /**
   * @dev Extracts a label from domain bytes
   * @param domain The domain name as bytes
   * @param offset Starting offset
   * @param len Length of the label to extract
   * @return The extracted label as bytes
   */
  function extractLabel(
    bytes memory domain,
    uint256 offset,
    uint256 len
  ) private pure returns (bytes memory) {
    bytes memory label = new bytes(len);
    for (uint256 i = 0; i < len; i++) {
      label[i] = domain[offset + i];
    }
    return label;
  }
}
