// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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

  // ============ INTERNAL FUNCTIONS ============

  /// @notice Process ERC20 payment using permit signature for gasless approval
  /// @param token ERC20 token address
  /// @param amount Amount to transfer
  /// @param permit Permit signature data for gasless approval
  function _collectERC20Coins(
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

    // Calculate ENS treasury fee and regular treasury amount
    (uint256 ensTreasuryAmount, uint256 treasuryAmount) = _splitPaymentERC20(amount);

    // Transfer ENS treasury portion if configured
    if (ensTreasuryAmount > 0) {
      address ensTreasury = _ensTreasury();
      if (ensTreasury != address(0)) {
        IERC20(token).safeTransferFrom(_msgSender(), ensTreasury, ensTreasuryAmount);
      }
    }

    // Transfer remaining amount to regular treasury
    if (treasuryAmount > 0) {
      IERC20(token).safeTransferFrom(_msgSender(), _treasury(), treasuryAmount);
    }
  }

  /// @notice Process ERC20 payment using pre-approved allowance
  /// @param token ERC20 token address
  /// @param amount Amount to transfer
  function _collectERC20Coins(
    address token,
    uint256 amount
  ) internal {
    if (!_isTokenAllowed(token)) revert TokenNotAllowed();

    IERC20 tokenContract = IERC20(token);
    if (tokenContract.allowance(_msgSender(), address(this)) < amount) {
      revert InsufficientApprovalAmount();
    }

    // Calculate ENS treasury fee and regular treasury amount
    (uint256 ensTreasuryAmount, uint256 treasuryAmount) = _splitPaymentERC20(amount);

    // Transfer ENS treasury portion if configured
    if (ensTreasuryAmount > 0) {
      address ensTreasury = _ensTreasury();
      if (ensTreasury != address(0)) {
        tokenContract.safeTransferFrom(_msgSender(), ensTreasury, ensTreasuryAmount);
      }
    }

    // Transfer remaining amount to regular treasury
    if (treasuryAmount > 0) {
      tokenContract.safeTransferFrom(_msgSender(), _treasury(), treasuryAmount);
    }
  }

  function _stablecoinPrice(address token, uint256 priceInCents) internal view returns(uint256) {
    // priceInCents is in cents, so divide by USD cents divisor to get dollars, then multiply by token decimals
    // e.g. 500 cents ($5.00) with 6 decimals => (500 / 100) * 1e6 = 5 * 1e6
    // e.g. 1 cent ($0.01) with 6 decimals => (1 / 100) * 1e6 = 0.01 * 1e6 = 1e4
    return (priceInCents * (10 ** _decimals(token))) / _usdCentsDivisor();
  }

  function _isTokenAllowed(address token) internal view returns (bool) {
    return allowedStablecoins[allowedTokensVersion][token];
  }

  function _decimals(address token) internal view returns (uint8) {
    return IERC20Metadata(token).decimals();
  }

  function _treasury() internal virtual returns (address);

  function _ensTreasury() internal virtual view returns (address);

  function _ensTreasuryFeePercent() internal virtual view returns (uint16);

  function _basisPointsDivisor() internal virtual pure returns (uint256);

  function _usdCentsDivisor() internal virtual pure returns (uint256);

  function _splitPaymentERC20(uint256 totalAmount) internal view returns (uint256 ensTreasuryAmount, uint256 treasuryAmount) {
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
