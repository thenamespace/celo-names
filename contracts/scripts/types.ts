import { Address, Hash } from 'viem';

/**
 * Registry configuration matching RegistryCfg struct in L2MainDeployer
 */
export interface RegistryConfig {
  name: string;
  symbol: string;
  ens_name: string;
  ens_nodehash: Hash;
  metadata_uri: string;
}

/**
 * Storage configuration matching StorageCfg struct in L2MainDeployer
 */
export interface StorageConfig {
  blacklist: Hash[];
  whitelist_enabled: boolean;
  whitelist: Address[];
}

/**
 * Registrar configuration matching RegistrarCfg struct in L2MainDeployer
 */
export interface RegistrarConfig {
  usdOracle: Address;
  treasury: Address;
  ensTreasury: Address;
  ensTreasuryFee: number; // uint16 in Solidity
  base_price: bigint;
  label_lengths: bigint[];
  label_prices: bigint[];
  min_label_len: bigint;
  max_label_len: bigint;
  allowed_stablecoins: Address[]
}

/**
 * Self Registrar configuration matching SelfRegistrarCfg struct in L2MainDeployer
 */
export interface SelfRegistrarConfig {
  verification_hub: Address;
  scope_seed: string;
  max_claims: bigint;
}

/**
 * Registrar rules configuration matching RegistrarRulesConfig struct
 */
export interface RegistrarRulesConfig {
  maxLabelLength: bigint;
  minLabelLength: bigint;
  labelPrices: bigint[];
  labelLength: bigint[];
  basePrice: bigint;
}