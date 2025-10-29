import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { celo, mainnet } from 'wagmi/chains';
import { http } from 'viem';
import { ENV } from '@/constants/environment';

export const config = getDefaultConfig({
  appName: 'Celo Usernames',
  projectId: '779581193f5c502d8f55e876b57c6122',
  chains: [celo, mainnet],
  transports: {
    [celo.id]: ENV.ALCHEMY_TOKEN ? http(`https://celo-mainnet.g.alchemy.com/v2/${ENV.ALCHEMY_TOKEN}`) : http(),
    [mainnet.id]: http(),
  },
  ssr: false, // If your dApp uses server side rendering (SSR)
});
