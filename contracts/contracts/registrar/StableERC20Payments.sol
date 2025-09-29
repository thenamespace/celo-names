// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';


  // ============ Structs ============
  
  /// @notice Permit data structure for ERC20 permit functionality
  struct ERC20Permit {
    uint256 value;      // Amount to approve
    uint256 deadline;   // Permit expiration timestamp
    uint8 v;           // Signature recovery id
    bytes32 r;         // Signature r component
    bytes32 s;         // Signature s component
  }

/**
 * @title StableERC20Payments
 * @notice Abstract contract for handling ERC20 stablecoin payments with permit functionality
 * @dev Provides secure payment processing for stablecoins (USDC, USDT, etc.) with:
 *      - Permit-based approvals (gasless approvals)
 *      - Pre-approved allowance payments
 *      - Token allowlist management
 *      - Automatic decimal handling for different stablecoins
 */
abstract contract StableERC20Payments is Ownable {
  using SafeERC20 for IERC20;

  // ============ State Variables ============
  
  uint8 private allowedTokensVersion;
  mapping(uint8 => mapping(address => bool)) private allowedStablecoins;

  // ============ Custom Errors ============
  
  error TokenNotAllowed();
  error InsufficientPermitAmount();
  error InsufficientApprovalAmount();

  // ============ INTERNAL FUNCTIONS ============

  /// @notice Process ERC20 payment using permit signature
  /// @param token ERC20 token address
  /// @param amount Amount to transfer
  /// @param permit Permit signature data
  function _sendStableERC20Permit(
    address token,
    uint256 amount,
    ERC20Permit calldata permit
  ) internal {
    if (!_isTokenAllowed(token)) revert TokenNotAllowed();

    IERC20Permit tokenContract = IERC20Permit(token);
    if (permit.value < amount) revert InsufficientPermitAmount();

    // Execute permit to approve this contract
    tokenContract.permit(
      _msgSender(),
      address(this),
      permit.value,
      permit.deadline,
      permit.v,
      permit.r,
      permit.s
    );

    // Transfer tokens to treasury
    IERC20(token).safeTransferFrom(_msgSender(), _treasury(), amount);
  }

  /// @notice Process ERC20 payment using pre-approved allowance
  /// @param token ERC20 token address
  /// @param amount Amount to transfer
  function _sendStableERC20Approval(
    address token,
    uint256 amount
  ) internal {
    if (!_isTokenAllowed(token)) revert TokenNotAllowed();

    IERC20 tokenContract = IERC20(token);
    if (tokenContract.allowance(_msgSender(), address(this)) < amount) {
      revert InsufficientApprovalAmount();
    }

    tokenContract.safeTransferFrom(_msgSender(), _treasury(), amount);
  }

  /// @notice Calculate token price based on USD amount and token decimals
  /// @param token Token address to get decimals from
  /// @param usdAmount USD amount to convert
  /// @return Token amount with proper decimal scaling
  function _tokenPrice(address token, uint256 usdAmount) internal view returns(uint256) {
    return usdAmount * (10 ** _decimals(token));
  }

  /// @notice Check if token is allowed for payments
  /// @param token Token address to check
  /// @return Whether token is allowed
  function _isTokenAllowed(address token) internal view returns (bool) {
    return allowedStablecoins[allowedTokensVersion][token];
  }

  /// @notice Get token decimals for price calculation
  /// @param token Token address
  /// @return Number of decimals
  function _decimals(address token) internal view returns (uint8) {
    return IERC20Metadata(token).decimals();
  }

  /// @notice Get treasury address for token transfers
  /// @return Treasury address
  function _treasury() internal virtual returns (address);

  // ============ OWNER FUNCTIONS ============

  /// @notice Modify approved ERC20 tokens list
  /// @param tokens Array of token addresses to modify
  /// @param enabled Whether to enable or disable tokens
  /// @param clearPreviousEntries Whether to clear existing entries
  function modifyApprovedTokens(
    address[] calldata tokens,
    bool enabled,
    bool clearPreviousEntries
  ) public onlyOwner {
    if (clearPreviousEntries) {
      allowedTokensVersion++;
    }

    for (uint256 i = 0; i < tokens.length; i++) {
      allowedStablecoins[allowedTokensVersion][tokens[i]] = enabled;
    }
  }
}
