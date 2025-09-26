import L2RegistrarABI from './L2Registrar.json'
import L2RegistryABI from './L2Registry.json'
import L1ResolverABI from './L1Resolver.json'

export const ABIS = {
  L2_REGISTRAR: L2RegistrarABI,
  L2_REGISTRY: L2RegistryABI,
  L1_RESOLVER: L1ResolverABI,
} as const

export type ContractABI = typeof L2RegistrarABI | typeof L2RegistryABI | typeof L1ResolverABI
