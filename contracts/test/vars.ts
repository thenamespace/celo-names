import { namehash, parseAbi } from 'viem';

export const TOKEN_NAME = 'Celo ENS';
export const TOKEN_SYMBOL = 'CENS';
export const PARENT_ENS = 'celo.eth';
export const PARENT_NODE = namehash(PARENT_ENS);
export const METADATA_URI = 'https://metadata.example.com';
export const YEAR_IN_SECONDS = 31536000n;

export const RESOLVER_ABI = parseAbi([
  'function setText(bytes32 node, string key, string value) public',
  'function setAddr(bytes32 node, uint256 coinType, bytes value) public',
  'function setAddr(bytes32 node, address value) public',
  'function setContenthash(bytes32 node, bytes content) public'
]);

// Pricing Constants
export const ETH_PRICE_DOLLARS = 5000;
export const ETH_PRICE_DECIMALS_DOLLARS = 5000_00000000n;
export const LABEL_LEN_1_PRICE_DOLLARS = 1000n;
export const LABEL_LEN_2_PRICE_DOLLARS = 500n;
export const LABEL_LEN_3_PRICE_DOLLARS = 250n;
export const LABEL_LEN_4_PRICE_DOLLARS = 50n;
export const BASE_PRICE_DOLLARS = 5n;
