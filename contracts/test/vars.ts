import { namehash, parseAbi } from 'viem';

export const TOKEN_NAME = 'Celo ENS';
export const TOKEN_SYMBOL = 'CENS';
export const PARENT_ENS = 'celo.eth';
export const PARENT_NODE = namehash(PARENT_ENS);
export const METADATA_URI = 'https://metadata.example.com';

export const RESOLVER_ABI = parseAbi([
  'function setText(bytes32 node, string key, string value) public',
  'function setAddr(bytes32 node, uint256 coinType, bytes value) public',
  'function setAddr(bytes32 node, address value) public',
  'function setContenthash(bytes32 node, bytes content) public'
]);
