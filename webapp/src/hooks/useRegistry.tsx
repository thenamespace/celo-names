import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { namehash } from "viem/ens";
import { CONTRACT_ADDRESSES, L2_CHAIN_ID, ABIS } from "@/constants";
import { ENV } from "@/constants/environment";
import type { Address, Hash } from "viem";

export const useRegistry = () => {
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: L2_CHAIN_ID });
  const { address } = useAccount();

  const transferName = async (
    name: string,
    to: Address
  ): Promise<Hash> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    if (!publicClient || !walletClient) {
      throw new Error("Client not available");
    }

    // Convert full name to namehash
    const fullName = `${name}.${ENV.PARENT_NAME}`;
    const namehashNode = namehash(fullName);
    const tokenId = BigInt(namehashNode);

    // Call safeTransferFrom on the registry contract
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRY,
      abi: ABIS.L2_REGISTRY,
      functionName: "safeTransferFrom",
      args: [address, to, tokenId],
      account: address,
    });

    return await walletClient.writeContract(request);
  };

  return {
    transferName,
  };
};
