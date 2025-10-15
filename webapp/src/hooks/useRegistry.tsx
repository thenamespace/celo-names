import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { namehash } from "viem/ens";
import { CONTRACT_ADDRESSES, L2_CHAIN_ID, ABIS } from "@/constants";
import { ENV } from "@/constants/environment";
import type { Address, Hash } from "viem";
import {
  getEnsRecordsDiff,
  type EnsRecords,
} from "@thenamespace/ens-components";
import { convertRecordsDiffToResolverData } from "@/utils";

export const useRegistry = () => {
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: L2_CHAIN_ID });
  const { address } = useAccount();

  const updateRecords = async (
    full_name: string,
    oldRecords: EnsRecords,
    newRecords: EnsRecords
  ) => {
    const diff = getEnsRecordsDiff(oldRecords, newRecords);
    const resolverData = convertRecordsDiffToResolverData(full_name, diff);

    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRY,
      abi: ABIS.L2_REGISTRY,
      functionName: "multicall",
      args: [resolverData],
      account: address,
    });
    return await walletClient!.writeContract(request);
  };

  const transferName = async (name: string, to: Address): Promise<Hash> => {
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
    updateRecords
  };
};
