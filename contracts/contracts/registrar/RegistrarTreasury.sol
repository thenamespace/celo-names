// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {NativePayments} from './NativePayments.sol';
import {StableERC20Payments} from './StableERC20Payments.sol';

/**
 * @title RegistrarTreasury
 * @notice Combined payment contract that extends both NativePayments and StableERC20Payments
 * @dev Provides unified payment handling for both native tokens and ERC20 stablecoins
 * @dev Ownable must be initialized by the root contract
 */
abstract contract RegistrarTreasury is Ownable, NativePayments, StableERC20Payments {
  // ============ State Variables ============

  /// @dev Treasury address for collecting registration fees
  address private treasury;

  /// @dev ENS treasury address for collecting ENS fees
  address private ensTreasury;

  /// @dev ENS treasury fee percentage in basis points (1 = 0.01%, 1000 = 10%)
  /// Range: 10 (0.1%) to 1000 (10%)
  uint16 private ensTreasuryFeePercent;

  /// @dev Basis points divisor for fee calculations (10000 = 100%)
  uint256 private constant BASIS_POINTS_DIVISOR = 10000;

  /// @dev USD cents divisor for converting cents to dollars (100 cents = 1 dollar)
  uint256 private constant USD_CENTS_DIVISOR = 100;

  // ============ Custom Errors ============

  /// @dev Thrown when ENS treasury fee percent is outside valid range
  error InvalidEnsTreasuryFeePercent(uint16 feePercent);

  // ============ Events ============

  /// @dev Emitted when treasury address is changed
  event TreasuryChanged(address indexed oldTreasury, address indexed newTreasury);

  /// @dev Emitted when ENS treasury address is changed
  event EnsTreasuryChanged(address indexed oldEnsTreasury, address indexed newEnsTreasury);

  /// @dev Emitted when ENS treasury fee percentage is changed
  event EnsFeeChanged(uint16 indexed oldFeePercent, uint16 indexed newFeePercent);

  // ============ Constructor ============

  constructor(address _usdOracle, address __treasury) NativePayments(_usdOracle) {
    treasury = __treasury;
  }

  // ============ Internal Functions ============

  function _treasury()
    internal
    view
    override(NativePayments, StableERC20Payments)
    returns (address)
  {
    return treasury;
  }

  /// @dev Get ENS treasury address
  function _ensTreasury()
    internal
    view
    override(NativePayments, StableERC20Payments)
    returns (address)
  {
    return ensTreasury;
  }

  /// @dev Get ENS treasury fee percentage in basis points
  function _ensTreasuryFeePercent()
    internal
    view
    override(NativePayments, StableERC20Payments)
    returns (uint16)
  {
    return ensTreasuryFeePercent;
  }

  /// @dev Get basis points divisor for fee calculations
  function _basisPointsDivisor()
    internal
    pure
    override(NativePayments, StableERC20Payments)
    returns (uint256)
  {
    return BASIS_POINTS_DIVISOR;
  }

  /// @dev Get USD cents divisor for converting cents to dollars
  function _usdCentsDivisor()
    internal
    pure
    override(NativePayments, StableERC20Payments)
    returns (uint256)
  {
    return USD_CENTS_DIVISOR;
  }

  // ============ Owner Functions ============

  /// @notice Set treasury address for fund collection
  /// @param __treasury Address where registration fees will be sent
  function setTreasury(address __treasury) external onlyOwner {
    address oldTreasury = treasury;
    treasury = __treasury;
    emit TreasuryChanged(oldTreasury, __treasury);
  }

  /// @notice Set ENS treasury address for ENS fee collection
  /// @param __ensTreasury Address where ENS fees will be sent
  function setEnsTreasury(address __ensTreasury) external onlyOwner {
    address oldEnsTreasury = ensTreasury;
    ensTreasury = __ensTreasury;
    emit EnsTreasuryChanged(oldEnsTreasury, __ensTreasury);
  }

  /// @notice Set ENS treasury fee percentage
  /// @param _feePercent Fee percentage in basis points (10 = 0.1%, 1000 = 10%)
  /// Must be between 10 and 1000 (0.1% to 10%)
  function setEnsTreasuryFeePercent(uint16 _feePercent) external onlyOwner {
    if ( _feePercent > 1000) {
      revert InvalidEnsTreasuryFeePercent(_feePercent);
    }
    uint16 oldFeePercent = ensTreasuryFeePercent;
    ensTreasuryFeePercent = _feePercent;
    emit EnsFeeChanged(oldFeePercent, _feePercent);
  }
}
