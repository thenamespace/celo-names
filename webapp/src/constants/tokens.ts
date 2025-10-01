import { zeroAddress, type Address, type Hash } from "viem";

export type CurrencyToken = "CELO" | "USDT" | "USDC" | "SUSD";

export const EIP712_DOMAIN_SEPARATORS: Record<CurrencyToken, Hash> = {
  CELO: zeroAddress,
  USDC: "0xb2ce31d2838445fa765a491f550e7c78ac7280ab0f3bc9d6063a86df9c3fb578",
  USDT: "0xbcb4d62e4834b598d0eacecd84c0b397a0254e077c41cf2143e394d5701d1088",
  SUSD: "0xc3f163090e72ee987c14636c13818d3d97aabfdded2ea52508310d723815e485",
};

export const EIP719_PERMIT_TYPEHASH: Record<CurrencyToken, Hash> = {
  CELO: zeroAddress,
  USDC: "0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9",
  USDT: zeroAddress,
  SUSD: "0x0",
};

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
export const SUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

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
export const SUSD_TOKEN: PaymentToken = {
  name: "SUSD",
  address: SUSD_TOKEN_ADDRESS,
  decimals: 18,
  token_name: "Celo Dollar",
  token_version: "3",
};
