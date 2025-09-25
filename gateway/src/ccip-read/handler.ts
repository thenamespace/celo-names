import type { HonoRequest } from "hono";
import { decodeFunctionData, isAddress, isHex } from "viem/utils";
import type { CCIPReadRequest } from "./types";
import { dnsDecodeName } from "./utils";
import { RESOLVER_ABI } from "./types";
import { z } from "zod";
import { Web3Client } from "./web3-client";
import type { Hash } from "viem";
import { type Env } from "../env";

const schema = z.object({
  sender: z.string().refine((value) => isAddress(value)),
  data: z.string().refine((value) => isHex(value)),
});

export class CCIPReadHandler {
  private web3Client: Web3Client;

  constructor(private readonly env: Env) {
    this.web3Client = new Web3Client(env);
  }

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
      abi: RESOLVER_ABI,
      data: data,
    });

    const { args } = decodedBaseFunction;
    const dnsEncodedName = args[0];
    const encodedResolverCall = args[1];
    const name = dnsDecodeName(dnsEncodedName);

    const decodedResolverFunction = decodeFunctionData({
      abi: RESOLVER_ABI,
      data: args[1] as any,
    });
    const { functionName, args: funcArgs } = decodedResolverFunction;

    console.log(`Resolving name: ${name}, function: ${functionName}, args: ${funcArgs}`)

    const resolvedData = await this.web3Client.performL2ResolverCall(
      dnsEncodedName,
      encodedResolverCall as Hash
    );

    const signedResponse = await 
        this.web3Client.signedResolverResponse(sender, data, resolvedData)


    return Response.json({ data: signedResponse }, { status: 200 });
  }
}
