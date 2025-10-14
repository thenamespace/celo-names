import { createConfig } from "ponder";
import { celo } from "viem/chains";
import { getEnvironment } from "./src/env";
import { CONTRACTS } from "./src/contracts";
import L2_RESOLVER_ABI from "./src/abis/l2-resolver.abi";
import L2_REGISTRY_ABI from "./src/abis/l2-registry.abi";
import L2_REGISTRAR_ABI from "./src/abis/l2-registrar.abi";
import L2_SELF_REGISTRAR_ABI from "./src/abis/l2-self-registrar.abi";

const env = getEnvironment();

export default createConfig({
  database: {
    kind: env.db_type,
    connectionString: env.db_connection_string,
  },
  chains: {
    celo: {
      id: celo.id,
      rpc: env.rpc_url,
    },
  },
  contracts: {
    Registry: {
      chain: "celo",
      abi: L2_REGISTRY_ABI,
      address: CONTRACTS.L2_REGISTRY,
      startBlock: 46660369,
    },
    Resolver: {
      chain: "celo",
      abi: L2_RESOLVER_ABI,
      address: CONTRACTS.L2_REGISTRY,
      startBlock: 46660369,
    },
    Registrar: {
      chain: "celo",
      abi: L2_REGISTRAR_ABI,
      address: CONTRACTS.L2_REGISTRAR,
      startBlock: 46660369
    },
    SelfRegistrar: {
      chain: "celo",
      abi: L2_SELF_REGISTRAR_ABI,
      address: CONTRACTS.L2_SELF_REGISTRAR,
      startBlock: 48572249
    }
  },
});
