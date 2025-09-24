import { type Address, type Chain } from "viem";
import { getChainById } from "./ccip-read/chains";
import dotenv from "dotenv";
dotenv.config();

export interface Env {
  alchemy_token: string | undefined;
  signer_wallet_key: string;
  l2_resolver: Address;
  chain: Chain;
  app_port: number
}

export const getEnvironment = (): Env => {
  const alchemy_token = process.env.ALCHEMY_TOKEN;
  const signer_wallet_key = process.env.SIGNER_WALLET_KEY;
  const l2_resolver = process.env.L2_RESOLVER as Address;
  const chain_id = process.env.CHAIN_ID;
  const app_port =  Number(process.env.PORT || 3000)

  if (!app_port) {
    throw new Error("APP_PORT environment variable is required");
  }

  if (!signer_wallet_key) {
    throw new Error("SIGNER_WALLET_KEY environment variable is required");
  }
  if (!l2_resolver) {
    throw new Error("L2_RESOLVER environment variable is required");
  }

  if (!chain_id) {
    throw new Error("CHAIN_ID environment variable is required");
  }

  let chain_id_int = -1;
  try {
    chain_id_int = parseInt(chain_id);
  } catch (err) {
    throw new Error("CHAIN_ID must be a valid number");
  }

  const current_chain = getChainById(chain_id_int);

  if (!current_chain) {
    throw new Error(`Unsupported chain with id: ${chain_id_int}`);
  }

  return {
    alchemy_token: alchemy_token,
    signer_wallet_key,
    l2_resolver,
    chain: current_chain,
    app_port: app_port
  };
};
