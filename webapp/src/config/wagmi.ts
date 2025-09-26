import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { celo, mainnet } from 'wagmi/chains';
import { http } from 'viem';

export const config = getDefaultConfig({
  appName: 'Celo Usernames',
  projectId: 'YOUR_PROJECT_ID', // Get this from https://cloud.walletconnect.com/
  chains: [celo, mainnet],
  transports: {
    [celo.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: false, // If your dApp uses server side rendering (SSR)
});
