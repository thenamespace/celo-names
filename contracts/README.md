# Celo Names - ERC721 NFT Contract

A simple ERC721 NFT contract for managing unique names on the Celo network, built with Hardhat, TypeScript, and OpenZeppelin.

## Features

- **ERC721 Compliance**: Full ERC721 standard implementation with metadata support
- **Unique Names**: Each NFT is associated with a unique name that cannot be duplicated
- **Owner-Only Minting**: Only the contract owner can mint new NFTs
- **Name Management**: Query names by token ID and check name availability
- **Metadata Support**: Configurable base URI for token metadata
- **Gas Optimized**: Efficient storage and gas usage

## Contract Overview

The `Names` contract extends OpenZeppelin's ERC721 and Ownable contracts to provide:

- **Minting**: `mint(address to, string memory name)` - Mint a new NFT with a unique name
- **Name Queries**: `getName(uint256 tokenId)` - Get the name associated with a token
- **Availability Check**: `isNameAvailable(string memory name)` - Check if a name is available
- **Supply Tracking**: `totalSupply()` - Get the total number of minted tokens
- **URI Management**: `setBaseURI(string memory baseURI)` - Update the base URI for metadata

## Project Structure

```
contracts/
├── contracts/
│   └── Names.sol              # Main ERC721 contract
├── test/
│   └── Names.test.ts          # Comprehensive test suite
├── scripts/
│   └── deploy.ts              # Deployment script
├── hardhat.config.ts          # Hardhat configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npm run compile
```

3. Run tests:
```bash
npm test
```

4. Run tests with gas reporting:
```bash
npm run test:gas
```

### Deployment

Deploy to local network:
```bash
npm run deploy:local
```

Deploy to mainnet/testnet:
```bash
npm run deploy
```

## Usage Examples

### Minting a Name

```solidity
// Only the contract owner can mint
await names.mint(userAddress, "alice");
```

### Querying Names

```solidity
// Get the name associated with token ID 0
string memory name = await names.getName(0);

// Check if a name is available
bool available = await names.isNameAvailable("bob");
```

### Transferring NFTs

```solidity
// Transfer NFT from one address to another
await names.transferFrom(fromAddress, toAddress, tokenId);
```

## Testing

The test suite includes comprehensive coverage for:

- Contract deployment and initialization
- Minting functionality and access control
- Name management and uniqueness
- ERC721 compliance and metadata
- Edge cases and error handling

Run the full test suite:
```bash
npm test
```

## Gas Usage

The contract is optimized for gas efficiency:

- **Mint**: ~127,667 - 885,482 gas (depending on name length)
- **Transfer**: ~55,031 gas
- **Set Base URI**: ~40,613 gas
- **Deployment**: ~1,425,938 gas

## Security Features

- **Access Control**: Only the contract owner can mint new NFTs
- **Name Uniqueness**: Prevents duplicate names across all tokens
- **Input Validation**: Validates name length and address validity
- **OpenZeppelin Security**: Built on battle-tested OpenZeppelin contracts

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Support

For questions or issues, please open an issue on the GitHub repository.
