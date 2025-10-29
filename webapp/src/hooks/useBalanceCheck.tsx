import { usePublicClient } from "wagmi";
import { type Address } from "viem";
import { L2_CHAIN_ID, ABIS, CELO_TOKEN, type PaymentToken } from "@/constants";

export const useBalanceCheck = () => {
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const getTokenBalance = async (
    paymentToken: PaymentToken,
    user: Address
  ): Promise<bigint> => {
    if (!publicClient) {
      throw new Error("Public client not available");
    }

    // If paymentToken is native CELO token, get native CELO balance
    if (paymentToken.address === CELO_TOKEN.address) {
      const balance = await publicClient.getBalance({
        address: user,
      });
      return balance;
    }

    // Otherwise, get ERC20 token balance
    const balance = await publicClient.readContract({
      address: paymentToken.address,
      abi: ABIS.ERC20,
      functionName: "balanceOf",
      args: [user],
    });

    return balance as bigint;
  };

  return {
    getTokenBalance,
  };
};

