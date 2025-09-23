// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IExtendedResolver} from './IExtendedResolver.sol';
import {ERC165} from '@openzeppelin/contracts/utils/introspection/ERC165.sol';

contract ExtendedResolver is IExtendedResolver, ERC165 {
  function resolve(
    bytes calldata name,
    bytes calldata data
  ) external view virtual returns (bytes memory) {
   return _resolve(name, data);
  }

  function _resolve(
    bytes calldata /** name **/,
    bytes calldata data
  ) internal view returns (bytes memory) {
    (bool success, bytes memory result) = address(this).staticcall(data);
    if (success) {
      return result;
    } else {
      // Revert with the reason provided by the call
      assembly {
        revert(add(result, 0x20), mload(result))
      }
    }
  }

  function supportsInterface(
    bytes4 interfaceID
  ) public view virtual override returns (bool) {
    return
      interfaceID == type(IExtendedResolver).interfaceId ||
      super.supportsInterface(interfaceID);
  }
}
