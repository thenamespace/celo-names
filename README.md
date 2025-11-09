# Celo Usernames

A ENS based naming system for the Celo network, enabling users to register and manage human-readable subnames under the `celo.eth` parent domain.

## Components

### [Contracts](./contracts/)

Smart contracts for L1 (Ethereum) and L2 (Celo) including Registry, Resolver, Registrar, and SelfRegistrar contracts.

**Deployed Contracts:**
```
registry: 0x8fDA856EF4691A9A2ac57e28eC313c9b8A12dD79
registrar: 0xcd8342EDDFc87BB1C5904f794C34cbCc91f1c57c
selfRegistrar: 0x5F8268DB98f4AB54649AF562811C388D85429e5f
storage: 0x4fd8CA373a13f61c46f5B42cf57a9877516F1B76
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

Deployed at: https://webapp-738104270314.europe-west1.run.app/

## Parent Domain

All subnames are registered under `celoo.eth` (e.g., `alice.celoo.eth`).
