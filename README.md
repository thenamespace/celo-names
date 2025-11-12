# Celo Usernames

A ENS based naming system for the Celo network, enabling users to register and manage human-readable subnames under the `celo.eth` parent domain.

## Components

### [Contracts](./contracts/)

Smart contracts for L1 (Ethereum) and L2 (Celo) including Registry, Resolver, Registrar, and SelfRegistrar contracts.

**Deployed Contracts:**
```
CeloNames Registry: 0x4d7912779679AFdC592CBd4674b32Fcb189395F7
Multicoin Registrar: 0x9Eb22700eFa1558eb2e0E522eB1DECC8025C3127
Self Verification Registrar: 0x063E9F0bA0061F6C3c6169674c81f43BE21fe8cc
Registrar Storage: 0xaAF67A46b99bE9a183580Cd86236cd0c6f2a85cb
```

### [Gateway](./gateway/)

CCIP-read gateway server for off-chain name resolution. Handles cross-chain resolution requests from Ethereum to Celo.

Deployed at: https://celo-gateway.namespace.ninja

### [Indexer](./indexer/)

Blockchain event indexer using Ponder. Indexes contract events and provides a queryable API for names and records.

Deployed at: https://celo-indexer.namespace.ninja

### [Metadata](./metadata/)

NFT metadata image generation service. Generates dynamic images for registered names.

### [Webapp](./webapp/)

React frontend for registering names, managing resolver records, and transferring ownership.

Deployed at: [Celonames App](https://names.celo.org/)

## Parent Domain

All subnames are registered under `celo.eth` (e.g., `alice.celo.eth`).
