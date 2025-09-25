import { createConfig } from "ponder";
import { celo } from "viem/chains";

import L2_RESOLVER_ABI from "./abis/l2-resolver.abi";
import L2_REGISTRY_ABI from "./abis/l2-registry.abi";
import L2_REGISTRAR_ABI from "./abis/l2-registrar.abi";

export default createConfig({
  chains: {
    celo: {
      id: celo.id,
      rpc: "https://celo-mainnet.g.alchemy.com/v2/-qUes-gxhpWt7QLPNQBQQ",
    },
  },
  contracts: {
    Registry: {
      chain: "celo",
      abi: L2_REGISTRY_ABI,
      address: "0x560d5b159c46d219e45affa47b2b9fFdecf6c31D",
      startBlock: 46660369,
    },
    Resolver: {
      chain: "celo",
      abi: L2_RESOLVER_ABI,
      address: "0x560d5b159c46d219e45affa47b2b9fFdecf6c31D",
      startBlock: 46660369,
    },
    Registrar: {
      chain: "celo",
      //@ts-ignore
      abi: L2_REGISTRAR_ABI,
      address: "0x560d5b159c46d219e45affa47b2b9fFdecf6c31D"
    }
  },
});
