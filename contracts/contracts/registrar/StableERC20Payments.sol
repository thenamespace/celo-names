// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

/// @notice Permit data structure for ERC20 permit functionality.
struct ERC20Permit {
    uint256 value;      // Amount to approve
    uint256 deadline;   // Permit expiration timestamp
    uint8 v;           // Signature recovery id
    bytes32 r;         // Signature r component
    bytes32 s;         // Signature s component
}

/// @title Stable ERC20 Payments
///
/// @notice Abstract contract for handling ERC20 stablecoin payments with permit or 
/// pre-approval functionality.
abstract contract StableERC20Payments is Ownable {
    using SafeERC20 for IERC20;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  
    /// @notice Dynamic allowlist system version for approved tokens.
    uint8 private allowedTokensVersion;

    /// @notice Mapping from version and token address to whether token is allowed.
    mapping(uint8 => mapping(address => bool)) private allowedStablecoins;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  
    /// @notice Thrown when payment token is not in the allowlist.
    error TokenNotAllowed();

    /// @notice Thrown when permit amount is insufficient for the payment.
    error InsufficientPermitAmount();

    /// @notice Thrown when approval amount is insufficient for the payment.
    error InsufficientApprovalAmount();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       OWNER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Modify approved ERC20 tokens list.
    ///
    /// @param tokens Array of token addresses to modify.
    /// @param enabled Whether to enable or disable tokens.
    /// @param clearPreviousEntries Whether to clear existing entries.
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Process ERC20 payment using permit signature for gasless approval.
    ///
    /// @dev Processes payment using ERC20 permit functionality, allowing users to approve
    ///      tokens without a separate transaction. Validates token allowlist and permit amount,
    ///      then splits payment between ENS treasury and regular treasury.
    ///
    /// @param token ERC20 token address.
    /// @param amount Amount to transfer.
    /// @param permit Permit signature data for gasless approval.
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

    /// @notice Process ERC20 payment using pre-approved allowance.
    ///
    /// @dev Processes payment using pre-approved ERC20 allowance. Validates token allowlist
    ///      and approval amount, then splits payment between ENS treasury and regular treasury.
    ///
    /// @param token ERC20 token address.
    /// @param amount Amount to transfer.
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

    /// @notice Convert USD price in cents to stablecoin amount with proper decimals.
    ///
    /// @dev Converts a price in USD cents to the equivalent amount in stablecoin tokens,
    ///      accounting for the token's decimal places.
    ///
    /// @param token The ERC20 token address.
    /// @param priceInCents Price in USD cents (e.g., 500 = $5.00, 1 = $0.01).
    ///
    /// @return Price in token units with proper decimals.
    function _stablecoinPrice(address token, uint256 priceInCents) internal view returns(uint256) {
        // priceInCents is in cents, so divide by USD cents divisor to get dollars, then multiply by token decimals
        // e.g. 500 cents ($5.00) with 6 decimals => (500 / 100) * 1e6 = 5 * 1e6
        // e.g. 1 cent ($0.01) with 6 decimals => (1 / 100) * 1e6 = 0.01 * 1e6 = 1e4
        return (priceInCents * (10 ** _decimals(token))) / _usdCentsDivisor();
    }

    /// @dev Check if a token is in the allowlist.
    ///
    /// @param token The token address to check.
    ///
    /// @return True if token is allowed, false otherwise.
    function _isTokenAllowed(address token) internal view returns (bool) {
        return allowedStablecoins[allowedTokensVersion][token];
    }

    /// @dev Get the number of decimals for a token.
    ///
    /// @param token The token address.
    ///
    /// @return The number of decimals.
    function _decimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /// @dev Returns the treasury address for fund collection.
    ///
    /// @return The treasury address.
    function _treasury() internal virtual returns (address);

    /// @dev Returns the ENS treasury address for ENS fee collection.
    ///
    /// @return The ENS treasury address.
    function _ensTreasury() internal virtual view returns (address);

    /// @dev Returns the ENS treasury fee percentage in basis points.
    ///
    /// @return The fee percentage in basis points.
    function _ensTreasuryFeePercent() internal virtual view returns (uint16);

    /// @dev Returns the basis points divisor for fee calculations.
    ///
    /// @return The basis points divisor (typically 10000).
    function _basisPointsDivisor() internal virtual pure returns (uint256);

    /// @dev Returns the USD cents divisor for converting cents to dollars.
    ///
    /// @return The USD cents divisor (typically 100).
    function _usdCentsDivisor() internal virtual pure returns (uint256);

    /// @notice Splits ERC20 payment between ENS treasury and regular treasury based on fee percentage.
    ///
    /// @dev Calculates the split of payment amount between ENS treasury and regular treasury
    ///      based on the configured fee percentage. Returns the split amounts.
    ///
    /// @param totalAmount The total payment amount to split.
    ///
    /// @return ensTreasuryAmount The amount to send to ENS treasury.
    /// @return treasuryAmount The amount to send to regular treasury.
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
