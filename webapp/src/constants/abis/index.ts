import L2RegistrarABI from './L2Registrar.json'
import L2RegistryABI from './L2Registry.json'
import L1ResolverABI from './L1Resolver.json'
import L2RegistrarV2ABI from "./L2RegistrarV2.json";
import ERC20 from "./ERC20.json"
import ERC20_PERMIT from "./ERC20Permit.json";

export const ABIS = {
  L2_REGISTRAR: L2RegistrarABI,
  L2_REGISTRY: L2RegistryABI,
  L1_RESOLVER: L1ResolverABI,
  L2_REGISTRAR_V2: L2RegistrarV2ABI,
  ERC20,
  ERC20_PERMIT
} as const

export type ContractABI = typeof L2RegistrarABI | typeof L2RegistryABI | typeof L1ResolverABI | typeof L2RegistrarV2ABI
