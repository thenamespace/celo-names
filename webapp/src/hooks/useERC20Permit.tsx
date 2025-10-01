import { useWeb3Client } from "@thenamespace/ens-components";
import { ABIS } from "@/constants";
import { type Address, type Hash } from "viem";
import { useAccount } from "wagmi";
import type { ERC20Permit } from "./useRegistrar";

const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

export const useERC20Permit = ({ chainId }: { chainId: number }) => {
  const { publicClient, walletClient } = useWeb3Client({ chainId });
  const { address } = useAccount();

  const createSignedPermit = async (
    token: Address,
    spender: Address,
    spendingValue: bigint
  ): Promise<ERC20Permit> => {
    const nonce = await getNonce(address!, token);
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + Math.ceil(3600 / 12)
    ); // 5 minutes from now

    // EIP-712 signature data
    // TODO - This wont work, use domain separator/permit_typehash from
    // contract read
    const domain = {
      name: "USDC",
      version: "1",
      chainId: chainId,
      verifyingContract: token,
    };

    const message = {
      owner: address!,
      spender: spender,
      value: spendingValue,
      nonce: nonce,
      deadline: deadline,
    };

    // Sign the permit
    const signature = await walletClient!.signTypedData({
      domain,
      types: PERMIT_TYPES,
      primaryType: "Permit",
      message,
    });

    const serialized_signature = serializeSig(signature);

    return {
        value: spendingValue,
        deadline,
        r: serialized_signature.r,
        v: serialized_signature.v,
        s: serialized_signature.s
    }
  };

  const serializeSig = (signature: Hash): {r: Hash, s: Hash, v: number} => {
    const sig = signature.slice(2);
    const r = `0x${sig.slice(0, 64)}` as Hash;
    const s = `0x${sig.slice(64, 128)}` as Hash;
    const v = parseInt(sig.slice(128, 130), 16);
    return {
        r,s,v
    }
  };

  const getNonce = async (owner: Address, token: Address): Promise<bigint> => {
    const nonce: bigint = (await publicClient!.readContract({
      address: token,
      abi: ABIS.ERC20_PERMIT,
      functionName: "nonces",
      args: [owner],
    })) as bigint;
    return nonce;
  };

  return {
    createSignedPermit,
  };
};