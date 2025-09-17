import { type Address, namehash } from 'viem';
import { viem } from 'hardhat';

export const TOKEN_NAME = 'Celo ENS';
export const TOKEN_SYMBOL = 'CENS';
export const PARENT_ENS = 'celo.eth';
export const PARENT_NODE = namehash(PARENT_ENS);
