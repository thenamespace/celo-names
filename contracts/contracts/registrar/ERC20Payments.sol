// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';

struct ERC20Permit {
  uint256 value;
  uint256 deadline;
  uint8 v;
  bytes32 r;
  bytes32 s;
}

abstract contract ERC20Payments is Ownable {
  uint8 allowedErc20Version;
  mapping(uint8 => mapping(address => bool)) allowedErc20;

  function _sendERC20Permit(
    address token,
    uint256 amount,
    ERC20Permit calldata permit
  ) internal {
    require(_isErc20Allowed(token), 'Token not allowed');

    IERC20Permit _permit = IERC20Permit(token);

    require(permit.value >= amount, 'Insufficient pemit amount');

    // Execute permit
    _permit.permit(
      _msgSender(),
      address(this),
      permit.value,
      permit.deadline,
      permit.v,
      permit.r,
      permit.s
    );

    // Transfer tokens
    IERC20(token).transferFrom(_msgSender(), treasury(), amount);
  }

  function _sendERC20Approval(address token, uint256 amount) internal {
    require(_isErc20Allowed(token), 'Token not allowed');
    IERC20 _token = IERC20(token);
    require(
      _token.allowance(_msgSender(), address(this)) >= amount,
      'Insufficient approval amount'
    );

    _token.transferFrom(_msgSender(), treasury(), amount);
  }

  function modifyApprovedTokens(
    address[] calldata tokens,
    bool enabled,
    bool clearPreviousEntries
  ) public onlyOwner {}

  function _isErc20Allowed(address token) internal view returns (bool) {
    return allowedErc20[allowedErc20Version][token];
  }

  function treasury() internal virtual returns (address);
}
