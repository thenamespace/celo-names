// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IL2Registry} from './interfaces/IL2Registry.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ERC721Holder} from '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import {StringUtils} from './common/StringUtils.sol';
import {AggregatorV3Interface} from './interfaces/AggregatorV3Interface.sol';

contract L2Registrar is Ownable, ERC721Holder {
  using StringUtils for string;

  // ============ State Variables ============

  uint256 public basePrice;
  uint256 public minLabelLength = 1;
  uint256 public maxLabelLength = 55;
  uint256 private priceVersion;
  uint64 constant SECONDS_IN_YEAR = 31_536_000;
  bool private useUSDPrice = true;

  uint64 private constant MAX_EXPIRY_YEARS = 10_000;
  uint64 private constant MIX_EXPIRY_YEARS = 1;
  IL2Registry private immutable registry;
  AggregatorV3Interface private immutable usdOracle;

  mapping(uint256 => mapping(uint256 => uint256)) private versionableLabelPrices;
  mapping(uint256 => mapping(uint256 => bool)) private versionableLabelPriceSet;

  address private treasury;

  // ============ Constructor ============

  constructor(address _registry, address _usdOracle, address _treasury) Ownable(_msgSender()) {
    registry = IL2Registry(_registry);
    usdOracle = AggregatorV3Interface(_usdOracle);
    treasury = _treasury;
  }

  // ============ Public Functions ============

    /**
   * @dev Register a subname with the registry
   * @param label The subdomain label to register
   * @param expiryInYears The expiry in years
   * @param owner The intended owner of the subdomain
   * @param resolverData Optional resolver function calls
   */
  function register(
    string calldata label,
    uint64 expiryInYears,
    address owner,
    bytes[] calldata resolverData
  ) external payable {
    _register(label, registry.rootNode(), expiryInYears, owner, resolverData);
  }

  function register(
    string calldata label,
    bytes32 parentNode,
    uint64 expiryInYears,
    address owner,
    bytes[] calldata resolverData
  ) external payable {
    _register(label, parentNode, expiryInYears, owner, resolverData);
  }

    function getPrice(
    string calldata label,
    uint256 expiryInYears
  ) public view returns (uint256) {
    uint256 length = label.strlen();

    if (length < minLabelLength || length > maxLabelLength) {
      revert('Invalid label length');
    }

    if (versionableLabelPriceSet[priceVersion][length]) {
      return versionableLabelPrices[priceVersion][length];
    }

    uint256 totalPrice = basePrice * expiryInYears;
    if (useUSDPrice) {
      return _convertUsdToEth(totalPrice);
    }
    return totalPrice;
  }


  function _register(string calldata label, bytes32 parentNode, uint64 expiryInYears, address owner, bytes[] calldata resolverData) internal {

    require(expiryInYears <= MAX_EXPIRY_YEARS && expiryInYears >= MIX_EXPIRY_YEARS, "Invalid expiry years");

    uint256 labelLength = label.strlen();

    require(labelLength >= minLabelLength && labelLength <= maxLabelLength, "Invalid label length");

    uint256 price = getPrice(label, expiryInYears);

    require(msg.value >= price, "Insufficient funds");

    uint64 expiry = _toExpiry(expiryInYears);
    registry.createSubnode(label, parentNode, expiry, owner, resolverData);

    _transferFunds(price);
  }

  // ============ Internal Functions ============

  function _transferFunds(uint256 value) internal {
    // transfer funds to a treasury

    // transfer back the remainder if found
  }


  function _toExpiry(uint64 expiryInYears) internal view returns(uint64) {
    uint64 expiry = expiryInYears * SECONDS_IN_YEAR;
    return uint64(block.timestamp + expiry);
  }

  function _convertUsdToEth(uint256 usdPrice) internal view returns (uint256) {
    require(address(usdOracle) != address(0), 'priceFeed not set');

    (, int256 answer, , uint256 updatedAt, ) = usdOracle.latestRoundData();
    require(answer > 0, 'invalid price feed answer');

    // 1. Scale usdPrice (whole dollars) to feed decimals
    // e.g. $5 with decimals=8 => 5 * 1e8
    uint256 usdPriceScaled = usdPrice * 1e8;

    // 2. Convert USD → ETH
    // answer = price of 1 ETH in USD with `decimals`
    // so: ethWei = (usdPriceScaled * 1e18) / answer
    uint256 ethWei = (usdPriceScaled * 1e18) / uint256(answer);

    return ethWei;
  }

  // ============ Owner Functions ============

   function setBasePrice(uint256 _basePrice) external onlyOwner {
    basePrice = _basePrice;
  }

  function setLabelPrices(
    uint256[] calldata lengths,
    uint256[] calldata prices
  ) external onlyOwner {
    require(lengths.length == prices.length, 'Arrays length mismatch');

    priceVersion++;

    for (uint256 i = 0; i < lengths.length; i++) {
      versionableLabelPrices[priceVersion][lengths[i]] = prices[i];
      versionableLabelPriceSet[priceVersion][lengths[i]] = true;
    }
  }

  function setLabelLengthLimits(
    uint256 _minLength,
    uint256 _maxLength
  ) external onlyOwner {
    minLabelLength = _minLength;
    maxLabelLength = _maxLength;
  }

  /**
   * @dev Withdraw accumulated funds
   */
  function withdraw(address treasury) external onlyOwner {
    payable(treasury).transfer(address(this).balance);
  }
}
