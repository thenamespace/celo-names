import {
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  http,
  keccak256,
  serializeSignature,
  type Address,
  type Hash,
} from "viem";
import { RESOLVER_ABI } from "./types";
import { type Env } from "../env";
import { sign } from "viem/accounts";
import { alchemy } from "evm-providers";

// 5 minute cache per request
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

export class Web3Client {
  // We can store the the 5 minutes resolution cache
  // so we don't hit the rpc on every request
  private resolveCache: Record<string, { exp: number; result: Hash }> = {};
  private client: ReturnType<typeof createPublicClient>;

  constructor(private readonly env: Env) {
    const rpc_url = env.alchemy_token
      ? alchemy(env.chain.id as any, env.alchemy_token)
      : undefined;
    //@ts-ignore
    this.client = createPublicClient({
      transport: http(rpc_url),
      chain: env.chain,
    });
  }

  public async performL2ResolverCall(
    dnsName: Hash,
    encodedFunctionCall: Hash
  ): Promise<Hash> {
    const cacheKey = this.getCacheKey(dnsName, encodedFunctionCall);
    const cachedResult = this.resolveCache[cacheKey];
    const now = new Date().getTime();

    if (cachedResult && cachedResult.exp > now) {
      return cachedResult.result;
    }

    const result = await this.client.readContract({
      abi: RESOLVER_ABI,
      functionName: "resolve",
      args: [dnsName, encodedFunctionCall],
      address: this.env.l2_resolver,
    });

    this.resolveCache[cacheKey] = {
      exp: now + CACHE_EXPIRY_TIME,
      result,
    };

    return result;
  }

  public async signedResolverResponse(
    sender: Address,
    originalData: Hash,
    result: Hash
  ) {
    const ttl = 1000;
    const validUntil = Math.floor(Date.now() / 1000 + ttl);

    // Specific to `makeSignatureHash()` defined in SignatureVerifier contract
    const messageHash = keccak256(
      encodePacked(
        ["bytes", "address", "uint64", "bytes32", "bytes32"],
        [
          "0x1900", // This is hardcoded in the contract (EIP-191).
          sender, // target: The address the signature is for.
          BigInt(validUntil), // expires: The timestamp at which the response becomes invalid.
          keccak256(originalData), // request: The original request that was sent.
          keccak256(result), // result: The `result` field of the response (not including the signature part).
        ]
      )
    );
    const sig = await sign({
      hash: messageHash,
      privateKey: this.env.signer_wallet_key as Hash,
    });

    // An ABI encoded tuple of `(bytes result, uint64 expires, bytes sig)`, where
    // `result` is the data to return to the caller and `sig` is the (r,s,v) encoded message signature.
    // Specific to `verify()` in SignatureVerifier.sol
    const encodedResponse = encodeAbiParameters(
      [
        { name: "result", type: "bytes" },
        { name: "expires", type: "uint64" },
        { name: "sig", type: "bytes" },
      ],
      [result, BigInt(validUntil), serializeSignature(sig)]
    );
    return encodedResponse;
  }

  // Create more optimal cache key mechanism
  private getCacheKey = (dnsName: Hash, functionCall: Hash) => {
    return `${keccak256(dnsName)}-${keccak256(functionCall)}`;
  };
}
