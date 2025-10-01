import { zeroAddress, type Address, type Hash } from "viem";

export type CurrencyToken = "CELO" | "USDT" | "USDC" | "SUSD";

export const EIP709_DOMAIN_SEPARATORS: Record<CurrencyToken, Hash> = {
    CELO: "0x0",
    USDC: "0x0",
    USDT: "0x0",
    SUSD: "0x0",
};

export const EIP709_PERMIT_TYPEHASH: Record<CurrencyToken, Hash> = {
    CELO: "0x0",
    USDC: "0x0",
    USDT: "0x0",
    SUSD: "0x0",
};

export interface PaymentToken {
    name: CurrencyToken;
    address: Address;
    decimals: number;
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
};
export const USDT_TOKEN: PaymentToken = {
    name: "USDT",
    address: USDT_TOKEN_ADDRESS,
    decimals: 6,
};
export const SUSD_TOKEN: PaymentToken = {
    name: "SUSD",
    address: SUSD_TOKEN_ADDRESS,
    decimals: 18,
};
