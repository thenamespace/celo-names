import { parseAbi } from "viem";

const L2_SELF_REGISTRAR_ABI = parseAbi([
  // TextChanged event from TextResolver
  "event NameClaimed(string label, bytes32 node, address owner)",
  "event VerificationCompleted(address user, uint256 verificationId, uint256 timestamp)"
]);

export default L2_SELF_REGISTRAR_ABI;

