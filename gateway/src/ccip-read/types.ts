import { parseAbi, type Address, type Hash } from "viem"

export interface CCIPReadRequest {
    sender: Address
    data: Hash
}

export const RESOLVER_ABI = parseAbi([
  "function resolve(bytes name, bytes data) view returns(bytes)",
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes memory)",
  "function text(bytes32 node, string key) view returns (string memory)",
  "function contenthash(bytes32 node) view returns (bytes memory)",
  "function ABI(bytes32 node, uint256 contentTypes) view returns (uint256, bytes memory)",
]);