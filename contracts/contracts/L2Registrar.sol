// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import {IL2Registrar} from './interfaces/IL2Registrar.sol';
import {StableERC20Payments, ERC20Permit} from './registrar/StableERC20Payments.sol';
import {NativePayments} from './registrar/NativePayments.sol';
import {RegistrarRules, RegistrarRulesConfig} from './registrar/RegistrarRules.sol';
import {IRegistrarStorage} from "./interfaces/IRegistrarStorage.sol";

contract L2Registrar is
  Ownable,
  Pausable,
  ERC721Holder,
  StableERC20Payments,
  NativePayments,
  RegistrarRules,
  IL2Registrar
{
  // ============ State Variables ============

  address constant NATIVE_TOKEN_ADDRESS = address(0);

  /// @dev Seconds in a year for expiry calculations
  uint64 private constant SECONDS_IN_YEAR = 31_536_000;

  /// @dev Registry contract for subdomain management
  IL2Registry private immutable registry;

  /// @dev Registrar storage that contains whitelist/blacklist data
  IRegistrarStorage private immutable registrarStorage;

  /// @dev Treasury address for collecting registration fees
  address private treasury;

  // ============ Custom Errors ============

  /// @dev Thrown when attempting to renew a subname that doesn't exist
  error SubnameDoesNotExist(bytes32 node);

  /// @dev Thrown when duration is outside valid range
  error InvalidDuration(uint64 duration);

  // ============ Events ============

  /// @dev Emitted when a name is registered
  event NameRegistered(
    string label,
    bytes32 node,
    address owner,
    uint64 durationInYears,
    address token,
    uint256 price
  );

  /// @dev Emitted when a name is renewed
  event NameRenewed(
    string label,
    bytes32 node,
    uint64 durationInYears,
    address token,
    uint256 price
  );

  // ============ Constructor ============

  constructor(
    address _registry,
    address _usdOracle,
    address __treasury,
    address _registrarStorage,
    RegistrarRulesConfig memory _rules
  ) Ownable(_msgSender()) NativePayments(_usdOracle) {
    registry = IL2Registry(_registry);
    registrarStorage = IRegistrarStorage(_registrarStorage);
    treasury = __treasury;
    _configureRules(_rules, false);
  }

  // ============ Public Functions ============

  /// @notice Register a subname under root node using ERC20 stablecoin payment
  /// @param label The subdomain label to register
  /// @param durationInYears Registration duration in years (1-10000)
  /// @param owner Address that will own the registered subname
  /// @param resolverData Optional resolver function calls for initial setup
  /// @param paymentToken Address of the ERC20 stablecoin for payment
  /// @param permit Permit signature data for gasless approval
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

  /// @notice Register a subname under root node
  /// The payment is done in native currency
  /// @param label The subdomain label to register
  /// @param durationInYears Registration duration in years (1-10000)
  /// @param owner Address that will own the registered subname
  /// @param resolverData Optional resolver function calls for initial setup
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

  /// @notice Extend subname registration duration using native currency payment
  /// @param label The subdomain label to renew
  /// @param durationInYears Additional registration duration in years (1-10000)
  function renew(
    string calldata label,
    uint64 durationInYears
  ) external payable {
    bytes32 node = _renew(label, durationInYears);
    uint256 price = _price(label, durationInYears, NATIVE_TOKEN_ADDRESS);
    _collectFunds(price);

    emit NameRenewed(label, node, durationInYears, NATIVE_TOKEN_ADDRESS, price);
  }

  /// @notice Extend subname registration duration using ERC20 stablecoin payment
  /// @param label The subdomain label to renew
  /// @param durationInYears Additional registration duration in years (1-10000)
  /// @param paymentToken Address of the ERC20 stablecoin for payment
  /// @param permit Permit signature data for gasless approval
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

  /// @dev Get registration price for label and duration
  /// when payment is done in native currency
  /// @param label The subdomain label to price
  /// @param durationInYears Registration duration in years
  /// @return Price in wei for the registration
  function rentPrice(
    string calldata label,
    uint64 durationInYears
  ) public view returns (uint256) {
    return rentPrice(label, durationInYears, NATIVE_TOKEN_ADDRESS);
  }

  /// @dev Get registration price for label and duration
  /// when payment is done in erc20 stablecoins
  /// @param label The subdomain label to price
  /// @param durationInYears Registration duration in years
  /// @param paymentToken Address of a supported stablecoin
  /// address(0) for native token
  /// @return Price in wei for the registration
  function rentPrice(
    string calldata label,
    uint64 durationInYears,
    address paymentToken
  ) public view returns (uint256) {
    return _price(label, durationInYears, paymentToken);
  }

  /// @dev Check if a subname is available for registration
  /// @param label The subdomain label to check availability for
  /// @return True if the subname is available (not registered), false otherwise
  function available(string calldata label) external view returns (bool) {
    if (!_isValidLabelLength(label) || registrarStorage.isBlacklisted(label)) {
      return false;
    }

    bytes32 node = _namehash(label, registry.rootNode());
    return registry.ownerOf(uint256(node)) == address(0);
  }

  // ============ Owner Functions ============

  /// @notice Set treasury address for fund collection
  /// @param __treasury Address where registration fees will be sent
  function setTreasury(address __treasury) external onlyOwner {
    treasury = __treasury;
  }

  /// @notice Pause contract operations
  function pause() external onlyOwner {
    _pause();
  }

  /// @notice Unpause contract operations
  function unpause() external onlyOwner {
    _unpause();
  }

  // ============ Internal Functions ============

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

    bytes32 root = registry.rootNode();
    _createSubnode(label, root, durationInYears, owner, resolverData);

    return _namehash(label, root);
  }

  function _renew(
    string calldata label,
    uint64 durationInYears
  ) internal returns (bytes32) {
    bytes32 root = registry.rootNode();
    bytes32 node = _namehash(label, root);

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

  function _price(
    string calldata label,
    uint64 durationInYears,
    address paymentToken
  ) internal view returns (uint256) {
    uint256 usdAmount = _getUsdPriceForLabel(label);

    if (paymentToken == NATIVE_TOKEN_ADDRESS) {
      return _convertToNativePrice(usdAmount * durationInYears);
    }

    return durationInYears * _stablecoinPrice(paymentToken, usdAmount);
  }

  function _createSubnode(
    string calldata label,
    bytes32 parentNode,
    uint64 durationInYears,
    address owner,
    bytes[] calldata resolverData
  ) internal {
    uint64 expiry = _toExpiry(durationInYears);
    registry.createSubnode(label, parentNode, expiry, owner, resolverData);
  }

  function _setNodeExpiry(bytes32 node, uint64 durationInYears) internal {
    uint256 currentExpiry = registry.expiries(node);
    uint64 durationSeconds = durationInYears * SECONDS_IN_YEAR;
    registry.setExpiry(node, currentExpiry + durationSeconds);
  }

  function _available(bytes32 node) internal view returns (bool) {
    return registry.ownerOf(uint256(node)) == address(0);
  }

  function _toExpiry(uint64 expiryInYears) internal view returns (uint64) {
    uint64 expiry = expiryInYears * SECONDS_IN_YEAR;
    return uint64(block.timestamp + expiry);
  }

  function _namehash(
    string calldata label,
    bytes32 parent
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(parent, keccak256(bytes(label))));
  }

  function _treasury()
    internal
    view
    override(NativePayments, StableERC20Payments)
    returns (address)
  {
    return treasury;
  }
}
