// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import {IL2Registrar} from './interfaces/IL2Registrar.sol';
import {ERC20Permit} from './registrar/StableERC20Payments.sol';
import {RegistrarTreasury} from './registrar/RegistrarTreasury.sol';
import {RegistrarRules, RegistrarRulesConfig} from './registrar/RegistrarRules.sol';
import {IRegistrarStorage} from "./interfaces/IRegistrarStorage.sol";

/// @title L2 Registrar
///
/// @notice Registrar contract that handles subdomain registration and renewal
///         with support for both native token and ERC20 stablecoin payments.
///
/// @author artii.eth (arti@namespace.ninja)
contract L2Registrar is
    Ownable,
    Pausable,
    ERC721Holder,
    RegistrarTreasury,
    RegistrarRules,
    IL2Registrar
{
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Native token address (address(0).
    address constant NATIVE_TOKEN_ADDRESS = address(0);

    /// @notice Seconds in a year for expiry calculations.
    uint64 private constant SECONDS_IN_YEAR = 31_536_000;

    /// @notice The registry contract for subdomain management.
    IL2Registry private immutable registry;

    /// @notice The registrar storage that contains whitelist/blacklist data.
    IRegistrarStorage private immutable registrarStorage;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when attempting to renew a subname that doesn't exist.
    error SubnameDoesNotExist(bytes32 node);

    /// @notice Thrown when duration is outside valid range.
    error InvalidDuration(uint64 duration);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a name is registered.
    ///
    /// @param label The subdomain label that was registered.
    /// @param node The namehash of the registered subdomain.
    /// @param owner The address that owns the registered subdomain.
    /// @param durationInYears Registration duration in years.
    /// @param token The payment token address (native or ERC20).
    /// @param price The price paid for the registration.
    event NameRegistered(
        string label,
        bytes32 node,
        address owner,
        uint64 durationInYears,
        address token,
        uint256 price
    );

    /// @notice Emitted when a name is renewed.
    ///
    /// @param label The subdomain label that was renewed.
    /// @param node The namehash of the renewed subdomain.
    /// @param durationInYears Additional registration duration in years.
    /// @param token The payment token address (native or ERC20).
    /// @param price The price paid for the renewal.
    event NameRenewed(
        string label,
        bytes32 node,
        uint64 durationInYears,
        address token,
        uint256 price
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        IMPLEMENTATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice L2 Registrar constructor used to establish the necessary contract configuration.
    ///
    /// @param _registry The address of the L2Registry contract.
    /// @param _usdOracle The address of the USD price oracle.
    /// @param __treasury The address of the treasury for collecting fees.
    /// @param _registrarStorage The address of the RegistrarStorage contract.
    /// @param _rules Configuration struct containing registrar rules (pricing, label length limits).
    constructor(
        address _registry,
        address _usdOracle,
        address __treasury,
        address _registrarStorage,
        RegistrarRulesConfig memory _rules
    ) Ownable(_msgSender()) RegistrarTreasury(_usdOracle, __treasury) {
        registry = IL2Registry(_registry);
        registrarStorage = IRegistrarStorage(_registrarStorage);
        _configureRules(_rules, false);
    }

    /// @notice Register a subname under root node using ERC20 stablecoin payment.
    ///
    /// @dev Allows registration with ERC20 stablecoin payment using permit signature for
    ///      gasless approval. The subdomain is registered for the specified duration and
    ///      minted as an NFT to the specified owner.
    ///
    /// @param label The subdomain label to register.
    /// @param durationInYears Registration duration in years (1-10000).
    /// @param owner Address that will own the registered subname.
    /// @param resolverData Optional resolver function calls for initial setup.
    /// @param paymentToken Address of the ERC20 stablecoin for payment.
    /// @param permit Permit signature data for gasless approval.
    ///
    /// Requirements:
    /// - Contract must not be paused.
    /// - Label must be valid and available.
    /// - Duration must be within valid range.
    /// - User must be whitelisted (if whitelist is enabled).
    function registerERC20(
        string calldata label,
        uint64 durationInYears,
        address owner,
        bytes[] calldata resolverData,
        address paymentToken,
        ERC20Permit calldata permit
    ) public whenNotPaused {
        bytes32 node = _register(label, durationInYears, owner, resolverData);
        uint256 price = _price(label, durationInYears, paymentToken);
        _collectERC20Coins(paymentToken, price, permit);

        emit NameRegistered(
            label,
            node,
            owner,
            durationInYears,
            paymentToken,
            price
        );
    }

    /// @notice Register a subname under root node.
    ///
    /// @dev The payment is done in native currency (ETH/CELO). The subdomain is registered
    ///      for the specified duration and minted as an NFT to the specified owner.
    ///
    /// @param label The subdomain label to register.
    /// @param durationInYears Registration duration in years (1-10000).
    /// @param owner Address that will own the registered subname.
    /// @param resolverData Optional resolver function calls for initial setup.
    ///
    /// Requirements:
    /// - Contract must not be paused.
    /// - Label must be valid and available.
    /// - Duration must be within valid range.
    /// - User must be whitelisted (if whitelist is enabled).
    /// - Sufficient native token amount must be sent.
    function register(
        string calldata label,
        uint64 durationInYears,
        address owner,
        bytes[] calldata resolverData
    ) external payable whenNotPaused {
        bytes32 node = _register(label, durationInYears, owner, resolverData);
        uint256 price = _price(label, durationInYears, NATIVE_TOKEN_ADDRESS);
        _collectFunds(price);

        emit NameRegistered(
            label,
            node,
            owner,
            durationInYears,
            NATIVE_TOKEN_ADDRESS,
            price
        );
    }

    /// @notice Extend subname registration duration using native currency payment.
    ///
    /// @dev The payment is done in native currency (ETH/CELO). Extends the registration
    ///      duration by the specified number of years.
    ///
    /// @param label The subdomain label to renew.
    /// @param durationInYears Additional registration duration in years (1-10000).
    ///
    /// Requirements:
    /// - Subname must exist and not be expired.
    /// - Duration must be within valid range.
    /// - Sufficient native token amount must be sent.
    function renew(
        string calldata label,
        uint64 durationInYears
    ) external payable {
        bytes32 node = _renew(label, durationInYears);
        uint256 price = _price(label, durationInYears, NATIVE_TOKEN_ADDRESS);
        _collectFunds(price);

        emit NameRenewed(label, node, durationInYears, NATIVE_TOKEN_ADDRESS, price);
    }

    /// @notice Extend subname registration duration using ERC20 stablecoin payment.
    ///
    /// @dev Allows renewal with ERC20 stablecoin payment using permit signature for
    ///      gasless approval. Extends the registration duration by the specified number of years.
    ///
    /// @param label The subdomain label to renew.
    /// @param durationInYears Additional registration duration in years (1-10000).
    /// @param paymentToken Address of the ERC20 stablecoin for payment.
    /// @param permit Permit signature data for gasless approval.
    ///
    /// Requirements:
    /// - Subname must exist and not be expired.
    /// - Duration must be within valid range.
    function renewERC20(
        string calldata label,
        uint64 durationInYears,
        address paymentToken,
        ERC20Permit calldata permit
    ) external {
        bytes32 node = _renew(label, durationInYears);
        uint256 price = _price(label, durationInYears, paymentToken);
        _collectERC20Coins(paymentToken, price, permit);

        emit NameRenewed(label, node, durationInYears, paymentToken, price);
    }

    /// @notice Get registration price for label and duration when payment is done in native currency.
    ///
    /// @param label The subdomain label to price.
    /// @param durationInYears Registration duration in years.
    ///
    /// @return Price in wei for the registration.
    function rentPrice(
        string calldata label,
        uint64 durationInYears
    ) public view returns (uint256) {
        return rentPrice(label, durationInYears, NATIVE_TOKEN_ADDRESS);
    }

    /// @notice Get registration price for label and duration when payment is done in ERC20 stablecoins.
    ///
    /// @param label The subdomain label to price.
    /// @param durationInYears Registration duration in years.
    /// @param paymentToken Address of a supported stablecoin (address(0) for native token).
    ///
    /// @return Price in wei for the registration.
    function rentPrice(
        string calldata label,
        uint64 durationInYears,
        address paymentToken
    ) public view returns (uint256) {
        return _price(label, durationInYears, paymentToken);
    }

    /// @notice Check if a subname is available for registration.
    ///
    /// @param label The subdomain label to check availability for.
    ///
    /// @return True if the subname is available (not registered), false otherwise.
    function available(string calldata label) external view returns (bool) {
        if (!_isValidLabelLength(label) || registrarStorage.isBlacklisted(label)) {
            return false;
        }

        bytes32 node = registry.nodehash(label);
        return registry.ownerOf(uint256(node)) == address(0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       OWNER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Pause contract operations.
    ///
    /// @dev Prevents new registrations while allowing renewals.
    ///
    /// Requirements:
    /// - Caller must be the contract owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause contract operations.
    ///
    /// @dev Re-enables new registrations.
    ///
    /// Requirements:
    /// - Caller must be the contract owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Internal function to register a subname with validation.
    ///
    /// @param label The subdomain label to register.
    /// @param durationInYears Registration duration in years.
    /// @param owner Address that will own the registered subname.
    /// @param resolverData Optional resolver function calls for initial setup.
    ///
    /// @return The namehash of the registered subdomain.
    function _register(
        string calldata label,
        uint64 durationInYears,
        address owner,
        bytes[] calldata resolverData
    ) internal returns (bytes32) {
        if (registrarStorage.isBlacklisted(label)) {
            revert IRegistrarStorage.BlacklistedName(label);
        }

        if (registrarStorage.whitelistEnabled()
            && !registrarStorage.isWhitelisted(_msgSender())) {
            revert IRegistrarStorage.NotWhitelisted(_msgSender());
        }

        if (!_isValidDuration(durationInYears)) {
            revert InvalidDuration(
                durationInYears
            );
        }

        if (!_isValidLabelLength(label)) {
            revert InvalidLabelLength();
        }

        _createSubnode(label, durationInYears, owner, resolverData);

        return registry.nodehash(label);
    }

    /// @dev Internal function to renew a subname with validation.
    ///
    /// @param label The subdomain label to renew.
    /// @param durationInYears Additional registration duration in years.
    ///
    /// @return The namehash of the renewed subdomain.
    function _renew(
        string calldata label,
        uint64 durationInYears
    ) internal returns (bytes32) {
        bytes32 root = registry.rootNode();
        bytes32 node = registry.nodehash(label, root);

        if (_available(node)) {
            revert SubnameDoesNotExist(node);
        }

        if (!_isValidDuration(durationInYears)) {
            revert InvalidDuration(
                durationInYears
            );
        }

        _setNodeExpiry(node, durationInYears);

        return node;
    }

    /// @dev Internal function to calculate registration price.
    ///
    /// @param label The subdomain label to price.
    /// @param durationInYears Registration duration in years.
    /// @param paymentToken Address of the payment token (native or ERC20).
    ///
    /// @return The price in wei for the registration.
    function _price(
        string calldata label,
        uint64 durationInYears,
        address paymentToken
    ) internal view returns (uint256) {
        uint256 price = _getPriceForLabel(label);

        if (paymentToken == NATIVE_TOKEN_ADDRESS) {
            return _convertToNativePrice(price * durationInYears);
        }

        return durationInYears * _stablecoinPrice(paymentToken, price);
    }

    /// @dev Internal function to create a subnode in the registry.
    ///
    /// @param label The subdomain label to create.
    /// @param durationInYears Registration duration in years.
    /// @param owner Address that will own the subdomain.
    /// @param resolverData Optional resolver function calls for initial setup.
    function _createSubnode(
        string calldata label,
        uint64 durationInYears,
        address owner,
        bytes[] calldata resolverData
    ) internal {
        uint64 expiry = _toExpiry(durationInYears);
        registry.createSubnode(label, expiry, owner, resolverData);
    }

    /// @dev Internal function to set node expiry by extending current expiry.
    ///
    /// @param node The namehash of the subdomain.
    /// @param durationInYears Additional registration duration in years.
    function _setNodeExpiry(bytes32 node, uint64 durationInYears) internal {
        uint256 currentExpiry = registry.expiries(node);
        uint64 durationSeconds = durationInYears * SECONDS_IN_YEAR;
        registry.setExpiry(node, currentExpiry + durationSeconds);
    }

    /// @dev Internal function to check if a node is available (not registered or expired).
    ///
    /// @param node The namehash to check.
    ///
    /// @return True if the node is available, false otherwise.
    function _available(bytes32 node) internal view returns (bool) {
        return registry.ownerOf(uint256(node)) == address(0);
    }

    /// @dev Internal function to convert duration in years to expiry timestamp.
    ///
    /// @param expiryInYears Registration duration in years.
    ///
    /// @return The expiry timestamp in seconds.
    function _toExpiry(uint64 expiryInYears) internal view returns (uint64) {
        uint64 expiry = expiryInYears * SECONDS_IN_YEAR;
        return uint64(block.timestamp + expiry);
    }
}
