import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-viem';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-verify';
import 'solidity-coverage';
import { celo, celoSepolia, mainnet } from 'viem/chains';
import * as dotenv from "dotenv";
dotenv.config();


const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
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
      url: process.env.CELO_RPC_URL,
      accounts: [process.env.DEPLOYER_KEY || ""],
    },
    mainnet: {
      chainId: mainnet.id,
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.DEPLOYER_KEY || ""]
    },
      celotest: {
      chainId: celoSepolia.id,
      url: process.env.CELO_SEPOLIA_RPC,
      accounts: [process.env.DEPLOYER_KEY || ""]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
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
