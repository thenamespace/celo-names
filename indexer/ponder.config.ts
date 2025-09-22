import { createConfig } from "ponder";
import { celo } from "viem/chains";

import { L2RegistryAbi } from "./abis/L2RegistryAbi";

export default createConfig({
  chains: {
    celo: {
      id: celo.id,
      rpc: "https://celo-mainnet.g.alchemy.com/v2/-qUes-gxhpWt7QLPNQBQQ",
    },
  },
  contracts: {
    L2Registry: {
      chain: "celo",
      abi: L2RegistryAbi,
      address: "0x560d5b159c46d219e45affa47b2b9fFdecf6c31D",
      startBlock: 46660369,
    },
  },
});
