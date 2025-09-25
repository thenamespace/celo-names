import { parseAbi } from "viem";

const L2_REGISTRAR_ABI = parseAbi([
  "event NameRegistered(string label, address owner, uint64 durationInYears,uint256 price bytes32 parentNode)",
]);

export default L2_REGISTRAR_ABI;