import { parseAbi } from "viem";

export const L2RegistryAbi = parseAbi([
  // NewName event from L2Registry
  "event NewName(string label, uint64 expiry, address indexed owner, bytes32 indexed node)",
  
  // TextChanged event from TextResolver
  "event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value)",
  
  // AddrChanged event from AddrResolver
  "event AddrChanged(bytes32 indexed node, address a)",
  
  // AddressChanged event from AddrResolver (multicoin)
  "event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress)",
  
  // ContenthashChanged event from ContentHashResolver
  "event ContenthashChanged(bytes32 indexed node, bytes hash)"
]);
