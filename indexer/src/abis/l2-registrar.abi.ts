import { parseAbi } from "viem";

const L2_REGISTRAR = parseAbi([
  "event NameRegistered(string label,bytes32 node,address owner,uint64 durationInYears,address token,uint256 price)",
]);

export default L2_REGISTRAR;