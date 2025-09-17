// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract L2Registrar {

    struct LabelPrice {
        uint16 letters;
        uint256 price;
    }

    
    mapping(uint256 => mapping(uint256 => uint256)) versionable_label_prices;
    mapping(uint256 => mapping(uint256 => bool)) versionable_price_usage;
    uint256 base_price = 0;
    uint256 price_version = 0;
    address registry;

    function register(string calldata label, uint256 expiry, address owner, bytes[] calldata data) public {

    }

    function rentPrice(string calldata label) public {

    }

    function setLabelPrices(LabelPrice[] calldata prices) public {
        price_version++;
        for (uint i = 0; i < prices.length; i++) {
            versionable_label_prices[price_version][prices[i].letters] = prices[i].price;
            versionable_price_usage[price_version][prices[i].letters] = true;
        }
    }

    function setBasePrice(uint256 basePrice) public {
        basePrice = basePrice;
    }
}