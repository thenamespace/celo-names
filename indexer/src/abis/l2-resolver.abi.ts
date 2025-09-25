import { parseAbi } from "viem";

const RESOLVER_ABI = parseAbi([
  // TextChanged event from TextResolver
  "event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value)",

  // AddrChanged event from AddrResolver
  "event AddrChanged(bytes32 indexed node, address a)",

  // AddressChanged event from AddrResolver (multicoin)
  "event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress)",

  // ContenthashChanged event from ContentHashResolver
  "event ContenthashChanged(bytes32 indexed node, bytes hash)",
]);

export default RESOLVER_ABI;

