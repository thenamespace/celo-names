import { createConfig } from "ponder";
import { celo } from "viem/chains";
import { getEnvironment } from "./src/env";

const env = getEnvironment();
import L2_RESOLVER_ABI from "./src/abis/l2-resolver.abi";
import L2_REGISTRY_ABI from "./src/abis/l2-registry.abi";
import L2_REGISTRAR_ABI from "./src/abis/l2-registrar.abi";

export default createConfig({
  database: {
    kind: env.db_type,
    connectionString: env.db_connection_string,
  },
  chains: {
    celo: {
      id: celo.id,
      rpc: process.env.RPC_URL,
    },
  },
  contracts: {
    Registry: {
      chain: "celo",
      abi: L2_REGISTRY_ABI,
      address: "0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE",
      startBlock: 46660369,
    },
    Resolver: {
      chain: "celo",
      abi: L2_RESOLVER_ABI,
      address: "0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE",
      startBlock: 46660369,
    },
    Registrar: {
      chain: "celo",
      abi: L2_REGISTRAR_ABI,
      address: "0x650b162Ef4812097E2005845A7baAE9DeeB22723",
      startBlock: 46660369,
    },
  },
});
