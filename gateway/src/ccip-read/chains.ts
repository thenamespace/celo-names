import type { Chain } from "viem";
import { base, celo } from "viem/chains";


const chain_map: Record<number, Chain> = {
    [celo.id]: celo,
    [base.id]: base
}

export const getChainById = (chainId: number): Chain | null => {

    if (chain_map[chainId]) {
        return chain_map[chainId];
    }
    return null;
}