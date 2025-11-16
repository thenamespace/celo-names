# Celo Names - Smart Contracts

Smart contracts for managing ENS-compatible names on the Celo network. This system enables subdomain registration, resolution, and management through a combination of L1 and L2 contracts.

## Overview

The Celo Names system consists of four main contracts that work together to provide a complete naming service:

- **L1Resolver**: Resolves names on Ethereum mainnet and proxies subname resolution to L2 via CCIP-Read
- **L2Registry**: ERC721-based registry that manages subdomains as NFTs on Celo L2. It also acts on ENS compatible resolver that stores records for a name
- **L2Registrar**: Handles paid registration and renewal of subdomains
- **L2SelfRegistrar**: Allows Self-verified users to claim free subdomains

## Core Contracts

### L1Resolver

The L1Resolver serves two primary purposes:

1. **On-chain Resolution**: Acts as a resolver for storing records for the parent name (e.g., `celo.eth`) on Ethereum mainnet
2. **Off-chain Proxy**: Uses wildcard resolution with CCIP-Read (ENSIP-10) to proxy subname resolution requests to the gateway server, which then queries the L2 registry

### L2Registry

L2Registry is an ERC721-based registry that manages subdomains as NFTs on the Celo network. Each subdomain is minted as an NFT, providing ownership and transfer capabilities. Additionally, L2Registry implements resolver functionality, allowing it to store and read ENS records (addresses, text records, content hashes, etc.) directly on-chain.

### L2Registrar

L2Registrar handles paid registration and renewal of subdomains. It integrates with the L2Registry to create subdomains and manages pricing based on label length and duration.

### L2SelfRegistrar

L2SelfRegistrar allows users who have completed identity verification through the Self protocol to claim free subdomains. This provides a way for verified users to obtain their first subdomain without payment.

## Project Structure

```
contracts/
├── contracts/
│   ├── L1Resolver.sol              # L1 resolver with CCIP-Read support
│   ├── L2Registry.sol             # ERC721 registry for subdomains
│   ├── L2Registrar.sol            # Paid registration registrar
│   ├── L2SelfRegistrar.sol        # Free claims for verified users
│   ├── L2Resolver.sol             # Resolver implementation for L2
│   ├── common/                    # Shared utilities
│   ├── interfaces/                # Contract interfaces
│   ├── registrar/                 # Registrar components (pricing, treasury, rules)
│   ├── resolver/                  # Resolver profiles (ABI, Addr, Text, etc.)
│   └── deployment/                # Deployment helpers
├── test/                          # Comprehensive test suite
├── scripts/                       # Deployment and utility scripts
│   ├── deploy_all_l2.ts          # Main deployment script
│   ├── blacklist.ts              # Blacklist management
│   └── premint.ts                # Premint script
├── hardhat.config.ts             # Hardhat configuration
└── package.json                  # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm or yarn
- Git

### Installation

1. Clone the repository and navigate to the contracts directory:

```bash
cd contracts
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the contracts directory (see `env.example` for reference):

```bash
DEPLOYER_KEY=your_private_key_here
CELO_RPC_URL=https://forno.celo.org
CELO_SEPOLIA_RPC=https://sepolia-forno.celo.org
MAINNET_RPC_URL=https://eth.llamarpc.com
```

### Compilation

Compile the contracts:

```bash
npm run compile
```

### Testing

Run the test suite:

```bash
npm test
```

Run tests with gas reporting:

```bash
npm run test:gas
```

Generate coverage report:

```bash
npm run coverage
```


### Code Formatting

Format code using Prettier:

```bash
npm run format
```

Check formatting without making changes:

```bash
npm run format:check
```

## Deployment

### Local Development

Start a local Hardhat node:

```bash
npm run node
```

In a separate terminal, deploy to localhost:

```bash
npm run deploy:local
```

### Testnet Deployment

Deploy to Celo Sepolia testnet:

```bash
npm run deploy --network celotest
```

### Mainnet Deployment

Deploy to Celo mainnet:

```bash
npm run deploy --network celo
```

Deploy to Ethereum mainnet (for L1Resolver):

```bash
npm run deploy --network mainnet
```

### Deployment Process

The deployment script (`scripts/deploy_all_l2.ts`) follows this order:

1. Deploy `L2RegistryDeployer` which deploys the `L2Registry` with root name configuration
2. Deploy `L2RegistrarDeployer` which deploys:
   - `RegistrarStorage` for whitelist/blacklist management
   - `L2Registrar` with pricing and treasury configuration
   - `L2SelfRegistrar` with Self protocol integration
3. Configure registrars in the registry (set both L2Registrar and L2SelfRegistrar as authorized registrars)
4. Transfer ownership to multisig

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Run code formatting
7. Submit a pull request

## Support

For questions or issues, please open an issue on the GitHub repository or join the [Celonames support Telegram group](https://t.me/+ws37-CaE6zI5YjM6).
