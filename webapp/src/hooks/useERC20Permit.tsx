import { useWeb3Client } from "@thenamespace/ens-components";
import { ABIS, EIP712_DOMAIN_SEPARATORS, type PaymentToken } from "@/constants";
import { keccak256, type Address, type Hash, concat, encodeAbiParameters } from "viem";
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

const PERMIT_TYPEHASH = keccak256(
  new TextEncoder().encode(
    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
  )
);

export const useERC20Permit = ({ chainId }: { chainId: number }) => {
  const { publicClient, walletClient } = useWeb3Client({ chainId });
  const { address } = useAccount();

  // We have to create permit hash manually
  // Since viem doesn't allow using a custom domain_separator hash
  const _createPermit = async (
    token: PaymentToken,
    spender: Address,
    value: bigint
  ) => {
    const nonce = await getNonce(address!, token.address);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes from now

    // Fetch the DOMAIN_SEPARATOR from your map
    const DOMAIN_SEPARATOR = EIP712_DOMAIN_SEPARATORS[token.name]; // adjust for token

    // Encode the Permit struct
    const structHash = keccak256(
      concat([
        PERMIT_TYPEHASH,
        encodeAbiParameters(
          [
            { type: "address" },
            { type: "address" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
          ],
          [address!, spender, value, nonce, deadline]
        ),
      ])
    );

    // EIP-712 digest: "\x19\x01" || DOMAIN_SEPARATOR || structHash
    const digest = keccak256(
      concat([
        new Uint8Array([0x19, 0x01]),
        DOMAIN_SEPARATOR as unknown as Uint8Array, // DOMAIN_SEPARATOR hash as bytes
        structHash,
      ])
    );

    // Sign digest
    const signature = await walletClient!.signMessage({ message: digest });

    const serialized_signature = serializeSig(signature);

    return {
      value,
      deadline,
      r: serialized_signature.r,
      v: serialized_signature.v,
      s: serialized_signature.s,
    };
  };

  const createSignedPermit = async (
    token: PaymentToken,
    spender: Address,
    spendingValue: bigint
  ): Promise<ERC20Permit> => {

    if (true) {
        return _createPermit(token, spender, spendingValue);
    }

    const nonce = await getNonce(address!, token.address);
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
      verifyingContract: token.address,
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
      domain: domain,
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
      s: serialized_signature.s,
    };
  };

  const serializeSig = (signature: Hash): { r: Hash; s: Hash; v: number } => {
    const sig = signature.slice(2);
    const r = `0x${sig.slice(0, 64)}` as Hash;
    const s = `0x${sig.slice(64, 128)}` as Hash;
    const v = parseInt(sig.slice(128, 130), 16);
    return {
      r,
      s,
      v,
    };
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

const createSignedPermit = () => {};
