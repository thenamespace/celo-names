// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import {StringUtils} from './common/StringUtils.sol';
import {IL2Registrar} from './interfaces/IL2Registrar.sol';
import {StableERC20Payments, ERC20Permit} from './registrar/StableERC20Payments.sol';
import {NativePayments} from './registrar/NativePayments.sol';

contract L2Registrar is
  Ownable,
  Pausable,
  ERC721Holder,
  StableERC20Payments,
  NativePayments,
  IL2Registrar
{
  using StringUtils for string;

  // ============ State Variables ============

  address constant NATIVE_TOKEN_ADDRESS = address(0);

  /// @dev Base price in USD for one year of registration
  uint256 public basePrice;

  /// @dev Minimum allowed label length
  uint256 public minLabelLength;

  /// @dev Maximum allowed label length
  uint256 public maxLabelLength;

  /// @dev Current version for price updates
  uint256 private priceVersion;

  /// @dev Seconds in a year for expiry calculations
  uint64 private constant SECONDS_IN_YEAR = 31_536_000;

  /// @dev Maximum allowed registration duration in years
  uint64 private constant MAX_EXPIRY_YEARS = 10_000;

  /// @dev Minimum allowed registration duration in years
  uint64 private constant MIN_EXPIRY_YEARS = 1;

  /// @dev Registry contract for subdomain management
  IL2Registry private immutable registry;

  /// @dev Custom prices per version and label length
  mapping(uint256 => mapping(uint256 => uint256))
    private versionableLabelPrices;

  /// @dev Tracks which label lengths have custom prices set
  mapping(uint256 => mapping(uint256 => bool)) private versionableLabelPriceSet;

  /// @dev Treasury address for collecting registration fees
  address private treasury;

  // ============ Custom Errors ============

  /// @dev Thrown when attempting to renew a subname that doesn't exist
  error SubnameDoesNotExist(bytes32 node);

  /// @dev Thrown when duration is outside valid range
  error InvalidDuration(
    uint64 duration,
    uint64 minDuration,
    uint64 maxDuration
  );

  /// @dev Thrown when label length is outside valid range
  error InvalidLabelLength(
    uint256 length,
    uint256 minLength,
    uint256 maxLength
  );

  /// @dev Thrown when insufficient funds are provided for registration
  error InsufficientFunds(uint256 provided, uint256 required);

  /// @dev Thrown when arrays length mismatch in setLabelPrices
  error ArraysLengthMismatch(uint256 lengthsLength, uint256 pricesLength);

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

  // ============ Structs ============

  /// @dev Config struct used to configure
  /// label and pricing rules
  struct RegistrarConfig {
    uint min_label_len;
    uint max_label_len;
    uint base_price;
    uint[] label_length;
    uint[] label_price;
  }

  // ============ Constructor ============

  constructor(
    address _registry,
    address _usdOracle,
    address __treasury,
    RegistrarConfig memory config
  ) Ownable(_msgSender()) NativePayments(_usdOracle) {
    registry = IL2Registry(_registry);
    treasury = __treasury;
    // Configure prices and labels
    setBasePrice(config.base_price);
    setLabelLengthLimits(config.min_label_len, config.max_label_len);
    setLabelPrices(config.label_length, config.label_price);
  }

  // ============ Public Functions ============

  function registerERC20(
    string calldata label,
    uint64 durationInYears,
    address owner,
    bytes[] calldata resolverData,
    address paymentToken,
    ERC20Permit calldata permit
  ) public whenNotPaused {
    if (!_isValidDuration(durationInYears)) {
      revert InvalidDuration(
        durationInYears,
        MIN_EXPIRY_YEARS,
        MAX_EXPIRY_YEARS
      );
    }
    if (!_isValidLabelLen(label)) {
      revert InvalidLabelLength(label.strlen(), minLabelLength, maxLabelLength);
    }

    bytes32 root = registry.rootNode();
    uint256 price = rentPrice(label, durationInYears, paymentToken);

    _createSubnode(label, root, durationInYears, owner, resolverData);
    _sendStableERC20Permit(paymentToken, price, permit);

    emit NameRegistered(
      label,
      _namehash(label, root),
      owner,
      durationInYears,
      paymentToken,
      price
    );
  }

  /// @dev Register a subname under root node
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
    if (!_isValidDuration(durationInYears)) {
      revert InvalidDuration(
        durationInYears,
        MIN_EXPIRY_YEARS,
        MAX_EXPIRY_YEARS
      );
    }
    if (!_isValidLabelLen(label)) {
      revert InvalidLabelLength(label.strlen(), minLabelLength, maxLabelLength);
    }

    bytes32 root = registry.rootNode();
    uint256 price = _price(label, durationInYears, NATIVE_TOKEN_ADDRESS);

    if (msg.value < price) {
      revert InsufficientFunds(msg.value, price);
    }

    _createSubnode(label, root, durationInYears, owner, resolverData);
    _transferNativeFunds(price);

    emit NameRegistered(
      label,
      _namehash(label, root),
      owner,
      durationInYears,
      NATIVE_TOKEN_ADDRESS,
      price
    );
  }

  /// @dev Extend subname registration duration
  /// We currently only support renewals for 3 level domains level.example.eth
  /// and not for deeper levels
  /// @param label The subdomain label to renew
  /// @param durationInYears Additional registration duration in years (1-10000)
  function renew(
    string calldata label,
    uint64 durationInYears
  ) external payable {
    _renew(label, registry.rootNode(), durationInYears);
  }

  /// @dev Get registration price for label and duration
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
  /// @param label The subdomain label to price
  /// @param durationInYears Registration duration in years
  /// @return Price in wei for the registration
  function rentPrice(
    string calldata label,
    uint64 durationInYears,
    address paymentToken
  ) public view returns (uint256) {
    if (!_isValidLabelLen(label)) {
      revert InvalidLabelLength(label.strlen(), minLabelLength, maxLabelLength);
    }

    return _price(label, durationInYears, paymentToken);
  }

  /// @dev Check if a subname is available for registration
  /// @param label The subdomain label to check availability for
  /// @return True if the subname is available (not registered), false otherwise
  function available(string calldata label) external view returns (bool) {
    if (!_isValidLabelLen(label)) {
      return false;
    }

    bytes32 node = _namehash(label, registry.rootNode());
    return registry.ownerOf(uint256(node)) == address(0);
  }

  // ============ Owner Functions ============

  /// @dev Configure all registration pricing and limits in a single transaction
  function configure(RegistrarConfig calldata config) external onlyOwner {
    setBasePrice(config.base_price);
    setLabelLengthLimits(config.min_label_len, config.max_label_len);
    setLabelPrices(config.label_length, config.label_price);
  }

  /// @dev Set base price for registration
  /// @param _basePrice Base price in USD for one year of registration
  function setBasePrice(uint256 _basePrice) public onlyOwner {
    basePrice = _basePrice;
  }

  /// @dev Set custom prices for specific label lengths
  /// @param lengths Array of label lengths to set custom prices for
  /// @param prices Array of custom prices in USD corresponding to each length
  function setLabelPrices(
    uint256[] memory lengths,
    uint256[] memory prices
  ) public onlyOwner {
    if (lengths.length != prices.length) {
      revert ArraysLengthMismatch(lengths.length, prices.length);
    }

    priceVersion++;

    for (uint256 i = 0; i < lengths.length; i++) {
      versionableLabelPrices[priceVersion][lengths[i]] = prices[i];
      versionableLabelPriceSet[priceVersion][lengths[i]] = true;
    }
  }

  /// @dev Set minimum and maximum label length limits
  /// @param _minLength Minimum allowed label length (inclusive)
  /// @param _maxLength Maximum allowed label length (inclusive)
  function setLabelLengthLimits(
    uint256 _minLength,
    uint256 _maxLength
  ) public onlyOwner {
    minLabelLength = _minLength;
    maxLabelLength = _maxLength;
  }

  /// @dev Set treasury address for fund collection
  /// @param __treasury Address where registration fees will be sent
  function setTreasury(address __treasury) external onlyOwner {
    treasury = __treasury;
  }

  /// @dev Pause contract operations
  function pause() external onlyOwner {
    _pause();
  }

  /// @dev Unpause contract operations
  function unpause() external onlyOwner {
    _unpause();
  }

  // ============ Internal Functions ============

  function _price(
    string calldata label,
    uint64 durationInYears,
    address paymentToken
  ) internal view returns (uint256) {
    uint256 length = label.strlen();

    uint256 usdAmount = basePrice;
    if (versionableLabelPriceSet[priceVersion][length]) {
      usdAmount = versionableLabelPrices[priceVersion][length];
    }

    if (paymentToken == NATIVE_TOKEN_ADDRESS) {
      return _convertToStablePrice(usdAmount * durationInYears);
    }

    return durationInYears * _tokenPrice(paymentToken, usdAmount);
  }

  function _renew(
    string calldata label,
    bytes32 parentNode,
    uint64 durationInYears
  ) internal {
    bytes32 node = _namehash(label, parentNode);
    if (_available(node)) {
      revert SubnameDoesNotExist(node);
    }

    if (!_isValidDuration(durationInYears)) {
      revert InvalidDuration(
        durationInYears,
        MIN_EXPIRY_YEARS,
        MAX_EXPIRY_YEARS
      );
    }

    uint256 price = _price(label, durationInYears, NATIVE_TOKEN_ADDRESS);

    if (msg.value < price) {
      revert InsufficientFunds(msg.value, price);
    }
    uint256 currentExpiry = registry.expiries(node);
    registry.setExpiry(
      node,
      currentExpiry + _durationInSeconds(durationInYears)
    );

    _transferNativeFunds(price);

    emit NameRenewed(
      label,
      registry.rootNode(),
      durationInYears,
      NATIVE_TOKEN_ADDRESS,
      price
    );
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

  function _isValidDuration(
    uint64 durationInYears
  ) internal pure returns (bool) {
    return
      durationInYears <= MAX_EXPIRY_YEARS &&
      durationInYears >= MIN_EXPIRY_YEARS;
  }

  function _isValidLabelLen(
    string calldata label
  ) internal view returns (bool) {
    uint256 labelLength = label.strlen();
    return labelLength >= minLabelLength && labelLength <= maxLabelLength;
  }

  function _sendFees(uint256 value) internal {
    if (msg.value == 0) return;

    uint256 remainder = msg.value - value;

    // Transfer required amount to treasury
    if (value > 0) {
      (bool success, ) = treasury.call{value: value}('');
      if (!success) {
        revert('Treasury transfer failed');
      }
    }

    // Return remainder to sender
    if (remainder > 0) {
      (bool success, ) = msg.sender.call{value: remainder}('');
      if (!success) {
        revert('Refund transfer failed');
      }
    }
  }

  function _available(bytes32 node) internal view returns (bool) {
    return registry.ownerOf(uint256(node)) == address(0);
  }

  function _toExpiry(uint64 expiryInYears) internal view returns (uint64) {
    uint64 expiry = expiryInYears * SECONDS_IN_YEAR;
    return uint64(block.timestamp + expiry);
  }

  function _durationInSeconds(
    uint64 durationInYears
  ) internal pure returns (uint64) {
    return durationInYears * SECONDS_IN_YEAR;
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
