import type { HonoRequest } from "hono";
import type { Address, Hash } from "viem";
import { decodeFunctionData, isAddress, isHex, parseAbi } from "viem/utils";
import { z } from "zod";
import type { CCIPReadRequest } from "./types";
import { dnsDecodeName } from "./utils";

const resolver_abi = parseAbi([
  "function resolve(bytes name, bytes data) view returns(bytes)",
  "function addr(bytes32 node) view returns (address)",
  "function addr(bytes32 node, uint256 coinType) view returns (bytes memory)",
  "function text(bytes32 node, string key) view returns (string memory)",
  "function contenthash(bytes32 node) view returns (bytes memory)",
  "function ABI(bytes32 node, uint256 contentTypes) view returns (uint256, bytes memory)",
]);

const schema = z.object({
  sender: z.string().refine((value) => isAddress(value)),
  data: z.string().refine((value) => isHex(value)),
});

export class CCIPReadHandler {
  async handle(req: HonoRequest): Promise<Response> {
    const safe = schema.safeParse(req.param());
    if (!safe.success) {
      return Response.json(
        { message: "Invalid request", error: safe.error.flatten() },
        { status: 400 }
      );
    }

    const { sender, data } = safe.data as CCIPReadRequest;

    const decodedBaseFunction = decodeFunctionData({
      abi: resolver_abi,
      data: data,
    });

    const { args } = decodedBaseFunction;
    const name = dnsDecodeName(args[0]);

    const decodedResolverFunction = decodeFunctionData({
      abi: resolver_abi,
      data: args[1] as any,
    });

    console.log(decodedResolverFunction.args, "RESOLVER ARGS");
    console.log(decodedResolverFunction.functionName, "RESOLVER FUNCTION NAME");

    return Response.json("", { status: 200 });
  }
}
