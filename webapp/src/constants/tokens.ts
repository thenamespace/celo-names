import { zeroAddress, type Address } from "viem";

export type CurrencyToken = "CELO" | "USDT" | "USDC" | "cUSD";

export interface PaymentToken {
  name: CurrencyToken;
  address: Address;
  decimals: number;
  // used in permit signature generation
  token_name?: string;
  token_version?: string;
}

export const USDC_TOKEN_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
export const USDT_TOKEN_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";
export const CUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

export const CELO_TOKEN: PaymentToken = {
  name: "CELO",
  address: zeroAddress,
  decimals: 18,
};
export const USDC_TOKEN: PaymentToken = {
  name: "USDC",
  address: USDC_TOKEN_ADDRESS,
  decimals: 6,
  token_name: "USDC",
  token_version: "2",
};
export const USDT_TOKEN: PaymentToken = {
  name: "USDT",
  address: USDT_TOKEN_ADDRESS,
  decimals: 6,
  token_name: "Tether USD",
  token_version: "1",
};
export const CUSD_TOKEN: PaymentToken = {
  name: "cUSD",
  address: CUSD_TOKEN_ADDRESS,
  decimals: 18,
  token_name: "cUSD",
  token_version: "1",
};
