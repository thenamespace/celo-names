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
  'function setContenthash(bytes32 node, bytes content) public',
  'function text(bytes32 node, string key) public view returns (string memory)',
  'function addr(bytes32 node) public view returns (address)'
]);

// Pricing Constants
export const ETH_PRICE_DOLLARS = 5000;
export const ETH_PRICE_DECIMALS_DOLLARS = 5000_00000000n;
export const LABEL_LEN_1_PRICE_DOLLARS = 1000n;
export const LABEL_LEN_2_PRICE_DOLLARS = 500n;
export const LABEL_LEN_3_PRICE_DOLLARS = 250n;
export const LABEL_LEN_4_PRICE_DOLLARS = 50n;
export const BASE_PRICE_DOLLARS = 5n;

export const MAX_LABEL_LEN = 255;
export const MIN_LABEL_LEN = 1;

export interface RegistrarConfig {
  base_price: bigint
  label_price: bigint[]
  label_length: bigint[]
  max_label_len: bigint
  min_label_len: bigint
}

export const DEFAULT_REGISTRAR_CONFIG: RegistrarConfig = {
  base_price: BASE_PRICE_DOLLARS,
  max_label_len: 55n,
  min_label_len: 1n,
  label_length: [],
  label_price: []
}