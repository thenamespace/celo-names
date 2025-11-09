// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {NativePayments} from './NativePayments.sol';
import {StableERC20Payments} from './StableERC20Payments.sol';

/// @title Registrar Treasury
///
/// @notice Combined payment contract that extends both NativePayments and StableERC20Payments.
///         Provides unified payment handling for both native tokens and ERC20 stablecoins.
abstract contract RegistrarTreasury is Ownable, NativePayments, StableERC20Payments {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTANTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Basis points divisor for fee calculations (10000 = 100%).
    uint256 private constant BASIS_POINTS_DIVISOR = 10000;

    /// @notice USD cents divisor for converting cents to dollars (100 cents = 1 dollar).
    uint256 private constant USD_CENTS_DIVISOR = 100;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Treasury address for collecting registration fees.
    address private treasury;

    /// @notice ENS treasury address for collecting ENS fees.
    address private ensTreasury;

    /// @notice ENS treasury fee percentage in basis points (1 = 0.01%, 1000 = 10%).
    ///         Range: 10 (0.1%) to 1000 (10%).
    uint16 private ensTreasuryFeePercent;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when ENS treasury fee percent is outside valid range.
    error InvalidEnsTreasuryFeePercent(uint16 feePercent);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when treasury address is changed.
    ///
    /// @param oldTreasury The previous treasury address.
    /// @param newTreasury The new treasury address.
    event TreasuryChanged(address oldTreasury, address newTreasury);

    /// @notice Emitted when ENS treasury address is changed.
    ///
    /// @param oldEnsTreasury The previous ENS treasury address.
    /// @param newEnsTreasury The new ENS treasury address.
    event EnsTreasuryChanged(address oldEnsTreasury, address newEnsTreasury);

    /// @notice Emitted when ENS treasury fee percentage is changed.
    ///
    /// @param oldFeePercent The previous fee percentage in basis points.
    /// @param newFeePercent The new fee percentage in basis points.
    event EnsFeeChanged(uint16 oldFeePercent, uint16 newFeePercent);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IMPLEMENTATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Constructor that sets the USD price oracle and treasury address.
    ///
    /// @param _usdOracle The address of the USD price oracle for native token conversion.
    /// @param __treasury The address of the treasury for collecting fees.
    constructor(address _usdOracle, address __treasury) NativePayments(_usdOracle) {
        treasury = __treasury;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Returns the treasury address for fund collection.
    ///
    /// @return The treasury address.
    function _treasury()
        internal
        view
        override(NativePayments, StableERC20Payments)
        returns (address)
    {
        return treasury;
    }

    /// @dev Returns the ENS treasury address for ENS fee collection.
    ///
    /// @return The ENS treasury address.
    function _ensTreasury()
        internal
        view
        override(NativePayments, StableERC20Payments)
        returns (address)
    {
        return ensTreasury;
    }

    /// @dev Returns the ENS treasury fee percentage in basis points.
    ///
    /// @return The fee percentage in basis points.
    function _ensTreasuryFeePercent()
        internal
        view
        override(NativePayments, StableERC20Payments)
        returns (uint16)
    {
        return ensTreasuryFeePercent;
    }

    /// @dev Returns the basis points divisor for fee calculations.
    ///
    /// @return The basis points divisor (typically 10000).
    function _basisPointsDivisor()
        internal
        pure
        override(NativePayments, StableERC20Payments)
        returns (uint256)
    {
        return BASIS_POINTS_DIVISOR;
    }

    /// @dev Returns the USD cents divisor for converting cents to dollars.
    ///
    /// @return The USD cents divisor (typically 100).
    function _usdCentsDivisor()
        internal
        pure
        override(NativePayments, StableERC20Payments)
        returns (uint256)
    {
        return USD_CENTS_DIVISOR;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       OWNER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set treasury address for fund collection.
    ///
    /// @param __treasury Address where registration fees will be sent.
    function setTreasury(address __treasury) external onlyOwner {
        address oldTreasury = treasury;
        treasury = __treasury;
        emit TreasuryChanged(oldTreasury, __treasury);
    }

    /// @notice Set ENS treasury address for ENS fee collection.
    ///
    /// @param __ensTreasury Address where ENS fees will be sent.
    function setEnsTreasury(address __ensTreasury) external onlyOwner {
        address oldEnsTreasury = ensTreasury;
        ensTreasury = __ensTreasury;
        emit EnsTreasuryChanged(oldEnsTreasury, __ensTreasury);
    }

    /// @notice Set ENS treasury fee percentage.
    ///
    /// @param _feePercent Fee percentage in basis points (10 = 0.1%, 1000 = 10%).
    ///                    Must be between 10 and 1000 (0.1% to 10%).
    function setEnsTreasuryFeePercent(uint16 _feePercent) external onlyOwner {
        if (_feePercent > 1000) {
            revert InvalidEnsTreasuryFeePercent(_feePercent);
        }
        uint16 oldFeePercent = ensTreasuryFeePercent;
        ensTreasuryFeePercent = _feePercent;
        emit EnsFeeChanged(oldFeePercent, _feePercent);
    }
}
