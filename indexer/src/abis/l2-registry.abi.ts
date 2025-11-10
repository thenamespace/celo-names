import { parseAbi } from "viem";

const L2_REGISTRY_ABI = parseAbi([
  // NewName event from L2Registry when name is registered
  "event NewName(string label, uint64 expiry, address indexed owner, bytes32 indexed node)",

  "event ExpiryUpdated(bytes32 indexed node, uint256 expiry)",

  'event NameRevoked(bytes32 indexed node, address admin)',

  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',

  'event NewOwner(bytes32 node, address newOwner)'
]);

export default L2_REGISTRY_ABI;