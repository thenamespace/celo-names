// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import {StringUtils} from './common/StringUtils.sol';
import {AggregatorV3Interface} from './interfaces/AggregatorV3Interface.sol';

contract L2Registrar is Ownable, Pausable, ERC721Holder {
  using StringUtils for string;

  // ============ State Variables ============

  /// @dev Base price in USD for one year of registration
  uint256 public basePrice;
  
  /// @dev Minimum allowed label length
  uint256 public minLabelLength = 1;
  
  /// @dev Maximum allowed label length
  uint256 public maxLabelLength = 55;
  
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
  
  /// @dev USD price oracle for ETH conversion
  AggregatorV3Interface private immutable usdOracle;

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
  error InvalidDuration(uint64 duration, uint64 minDuration, uint64 maxDuration);

  /// @dev Thrown when label length is outside valid range
  error InvalidLabelLength(uint256 length, uint256 minLength, uint256 maxLength);

  /// @dev Thrown when insufficient funds are provided for registration
  error InsufficientFunds(uint256 provided, uint256 required);

  /// @dev Thrown when price feed is not set
  error PriceFeedNotSet();

  /// @dev Thrown when price feed returns invalid data
  error InvalidPriceFeedAnswer(int256 answer);

  /// @dev Thrown when arrays length mismatch in setLabelPrices
  error ArraysLengthMismatch(uint256 lengthsLength, uint256 pricesLength);

  // ============ Events ============

  /// @dev Emitted when a name is registered
  event NameRegistered(
    string label,
    address owner,
    uint64 durationInYears,
    uint256 price,
    bytes32 parentNode
  );

  /// @dev Emitted when a name is renewed
  event NameRenewed(
    string label,
    bytes32 parentNode,
    uint64 durationInYears,
    uint256 price,
    address indexed extender
  );

  // ============ Constructor ============

  constructor(
    address _registry,
    address _usdOracle,
    address _treasury
  ) Ownable(_msgSender()) {
    registry = IL2Registry(_registry);
    usdOracle = AggregatorV3Interface(_usdOracle);
    treasury = _treasury;
  }

  // ============ Public Functions ============

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
    _register(label, registry.rootNode(), durationInYears, owner, resolverData);
  }

  /// @dev Register a subname under specified parent node
  /// @param label The subdomain label to register
  /// @param parentNode Parent node hash under which to register the subname
  /// @param durationInYears Registration duration in years (1-10000)
  /// @param owner Address that will own the registered subname
  /// @param resolverData Optional resolver function calls for initial setup
  function register(
    string calldata label,
    bytes32 parentNode,
    uint64 durationInYears,
    address owner,
    bytes[] calldata resolverData
  ) external payable whenNotPaused {
    _register(label, parentNode, durationInYears, owner, resolverData);
  }

  /// @dev Extend subname registration duration
  /// We currently only support renewals for 3 level domains level.example.eth
  /// and not for deeper levels
  /// @param label The subdomain label to renew
  /// @param durationInYears Additional registration duration in years (1-10000)
  function renew(string calldata label, uint64 durationInYears) external payable {
    bytes32 node = _namehash(label, registry.rootNode());
    if (!_available(node)) {
      revert SubnameDoesNotExist(node);
    }

    if (!_isValidDuration(durationInYears)) {
      revert InvalidDuration(durationInYears, MIN_EXPIRY_YEARS, MAX_EXPIRY_YEARS);
    }

    uint256 price = _price(label, durationInYears);
    uint256 currentExpiry = registry.expiries(node);
    registry.setExpiry(node, currentExpiry + _toExpiry(durationInYears));

    _sendFees(price);
    
    emit NameRenewed(label, registry.rootNode(), durationInYears, price, msg.sender);
  }

  /// @dev Get registration price for label and duration
  /// @param label The subdomain label to price
  /// @param durationInYears Registration duration in years
  /// @return Price in wei for the registration
  function rentPrice(
    string calldata label,
    uint64 durationInYears
  ) public view returns (uint256) {
    return _price(label, durationInYears);
  }

  // ============ Owner Functions ============

  /// @dev Set base price for registration
  /// @param _basePrice Base price in USD for one year of registration
  function setBasePrice(uint256 _basePrice) external onlyOwner {
    basePrice = _basePrice;
  }

  /// @dev Set custom prices for specific label lengths
  /// @param lengths Array of label lengths to set custom prices for
  /// @param prices Array of custom prices in USD corresponding to each length
  function setLabelPrices(
    uint256[] calldata lengths,
    uint256[] calldata prices
  ) external onlyOwner {
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
  ) external onlyOwner {
    minLabelLength = _minLength;
    maxLabelLength = _maxLength;
  }

  /// @dev Set treasury address for fund collection
  /// @param _treasury Address where registration fees will be sent
  function setTreasury(address _treasury) external onlyOwner {
    treasury = _treasury;
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

  function _price(string calldata label, uint64 durationInYears) internal view returns (uint256) {
    uint256 length = label.strlen();

    uint256 price = basePrice;
    if (versionableLabelPriceSet[priceVersion][length]) {
      price = versionableLabelPrices[priceVersion][length];
    }

    return _convertToStablePrice(price * durationInYears);
  }

  function _register(
    string calldata label,
    bytes32 parentNode,
    uint64 expiryInYears,
    address owner,
    bytes[] calldata resolverData
  ) internal {
    if (!_isValidDuration(expiryInYears)) {
      revert InvalidDuration(expiryInYears, MIN_EXPIRY_YEARS, MAX_EXPIRY_YEARS);
    }
    if (!_isValidLabelLen(label)) {
      revert InvalidLabelLength(label.strlen(), minLabelLength, maxLabelLength);
    }

    uint256 price = _price(label, expiryInYears);

    if (msg.value < price) {
      revert InsufficientFunds(msg.value, price);
    }

    uint64 expiry = _toExpiry(expiryInYears);
    registry.createSubnode(label, parentNode, expiry, owner, resolverData);

    _sendFees(price);
    
    emit NameRegistered(label, owner, expiryInYears, price, parentNode);
  }

  function _isValidDuration(uint64 durationInYears) internal pure returns (bool) {
    return durationInYears <= MAX_EXPIRY_YEARS && durationInYears >= MIN_EXPIRY_YEARS;
  }

  function _isValidLabelLen(string calldata label) internal view returns (bool) {
    uint256 labelLength = label.strlen();
    return labelLength >= minLabelLength && labelLength <= maxLabelLength;
  }

  function _sendFees(uint256 value) internal {
    if (msg.value == 0) return;
    
    uint256 remainder = msg.value - value;
    
    // Transfer required amount to treasury
    if (value > 0) {
      (bool success, ) = treasury.call{value: value}("");
      if (!success) {
        revert("Treasury transfer failed");
      }
    }
    
    // Return remainder to sender
    if (remainder > 0) {
      (bool success, ) = msg.sender.call{value: remainder}("");
      if (!success) {
        revert("Refund transfer failed");
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

  function _namehash(
    string calldata label,
    bytes32 parent
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(parent, keccak256(bytes(label))));
  }

  function _convertToStablePrice(uint256 usdPrice) internal view returns (uint256) {
    if (address(usdOracle) == address(0)) {
      revert PriceFeedNotSet();
    }

    (
      uint80 roundId,
      int256 answer,
      ,
      ,
      uint80 answeredInRound
    ) = usdOracle.latestRoundData();

    // Check if round is complete
    if (answeredInRound != roundId) {
      revert InvalidPriceFeedAnswer(answer);
    }

    // Check if answer is valid (positive)
    if (answer <= 0) {
      revert InvalidPriceFeedAnswer(answer);
    }

    // 1. Scale usdPrice (whole dollars) to feed decimals
    // e.g. $5 with decimals=8 => 5 * 1e8
    uint256 usdPriceScaled = usdPrice * 1e8;

    // 2. Convert USD → ETH with overflow protection
    // answer = price of 1 ETH in USD with `decimals`
    // so: ethWei = (usdPriceScaled * 1e18) / answer
    uint256 ethWei = (usdPriceScaled * 1e18) / uint256(answer);

    return ethWei;
  }

}
