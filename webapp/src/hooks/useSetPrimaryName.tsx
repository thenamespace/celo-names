import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ABIS, CONTRACT_ADDRESSES } from "@/constants";
import { type Address, type Hash } from "viem";

export const useSetPrimaryName = ({ chainId }: { chainId: number }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: chainId });
  const signer = useWalletClient({ chainId: chainId });

  const setEthPrimaryName = async (fullName: string): Promise<Hash> => {


    console.log(signer, "SIGNER!!")

    if (!address) throw new Error("Wallet not connected");
    if (!publicClient || !signer.data) throw new Error("Ethereum client unavailable");

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESSES.ETH_REVERSE_REGISTRAR as Address,
      abi: ABIS.REVERSE_REGISTRAR_ABI,
      functionName: "setName",
      args: [fullName],
      account: address as Address,
    });

    return signer.data!.writeContract(request);
  };

  return { setEthPrimaryName };
};


