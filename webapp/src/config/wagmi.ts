import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { celo, celoAlfajores, mainnet } from 'wagmi/chains';
import { http } from 'viem';

export const config = getDefaultConfig({
  appName: 'Celo Usernames',
  projectId: 'YOUR_PROJECT_ID', // Get this from https://cloud.walletconnect.com/
  chains: [celo, celoAlfajores, mainnet],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: false, // If your dApp uses server side rendering (SSR)
});
