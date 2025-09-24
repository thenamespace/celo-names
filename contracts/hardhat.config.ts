import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-viem';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-verify';
import 'solidity-coverage';
import { celo } from 'viem/chains';
import dotenv from 'dotenv';
import { getEnvironment } from './src/env';

// Load environment variables
dotenv.config();

// Get environment variables
const env = getEnvironment();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    celo: {
      chainId: celo.id,
      url: env.celo_rpc_url,
      accounts: [env.deployer_key],
    },
  },
  etherscan: {
    apiKey: env.etherscan_key,
    customChains: [
      {
        network: 'Celo',
        chainId: celo.id,
        urls: {
          apiURL: 'https://api.celoscan.io/api',
          browserURL: 'https://celoscan.io',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

export default config;
