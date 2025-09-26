import { CONTRACT_ADDRESSES, L2_CHAIN_ID } from "@/constants";
import { usePublicClient, useWalletClient } from "wagmi";
import { ABIS } from "@/constants";
import type { EnsRecords } from "@thenamespace/ens-components";

export const useRegistrar = () => {
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: L2_CHAIN_ID });

  const isNameAvailable = async (label: string): Promise<boolean> => {
    const available = await publicClient!.readContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR,
      functionName: "available",
      args: [label],
    });
    return available as boolean;
  };

  const rentPrice = async (label: string, durationInYears: number): Promise<bigint> => {

     const price = await publicClient!.readContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR,
      functionName: "rentPrice",
      args: [label, durationInYears],
    });

    return price as bigint;
  }

  const register = async (
    label: string,
    durationInYears: number,
    owner: string,
    records: EnsRecords = {texts: [], addresses: []}
  ) => {
    const { request } = await publicClient!.simulateContract({
      address: CONTRACT_ADDRESSES.L2_REGISTRAR,
      abi: ABIS.L2_REGISTRAR,
      functionName: "available",
      args: [label, durationInYears, owner, []],
    });

    return await walletClient!.writeContract(request);
  };

  return {
    isNameAvailable,
    register,
    rentPrice
  };
};
