import { celo } from "viem/chains"

// Contract addresses from README.md
export const CONTRACT_ADDRESSES = {
  // L1 Contracts (Ethereum)
  L1_RESOLVER: '0xC6FC912C5DACb6BF0a24Bad113493c900fEA254a',
  
  // L2 Contracts (Celo)
  L2_REGISTRAR: '0x650b162Ef4812097E2005845A7baAE9DeeB22723',
  L2_REGISTRY: '0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE',
  L2_REGISTRAR_V2: '0x43D76cb9be60f677e58e15F71Dd760Aaa0a2fae0'
} as const

// Network configurations
export const NETWORKS = {
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
  },
  CELO: {
    chainId: 42220,
    name: 'Celo',
    rpcUrl: 'https://forno.celo.org',
  },
} as const

// Gateway URL
export const GATEWAY_URL = 'https://celo-gateway.namespace.ninja'

export const L2_CHAIN_ID = celo.id;
