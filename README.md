A home for CELO usernames

1. Contracts
We need:
  - L1 Contracts
     Resolver that supports CCIP-read ( the same one we ENS uses )
     For starters, it doesn't need to be unruggable, we can always update it in the future
  - L2 Contracts
    1. Registry/Resolver -> contract which will store subname NFTS and name records, i am still thinking if they need to be separate contracts or the same ( ex. Durin ). Subnames need to be expirable and revokable
    2. MintController. -> Has minting logic, prices, token gating, reservations ETC.

2. CCIP-gatway
  Offchain server responsible for resolving CCIP requests

3. Indexer
  A service for indexing l2 subnames, we can use ponder, the graph, subsquid or we can write our own

4. Metadata service -> We need something to create NFT images

5. Frontend -> Simple frontend app which will show all this

We will first do a POC with "celoo.eth" name

## Gateway:

Deployed at -> https://celo-gateway.namespace.ninja

## Contracts:

Contracts deployed at: {
  registry: 0x3e5D74A8D791b381d86678c4Fd8a616a9b9BF180
  registrar: '0x1C650333ECB93408bD5f64761B9ABFED19369Ade',
  selfRegistrar: '0x5C9599EB6AD051e250d4608f064E3bae2C476154',
  storage: '0x08D97997291a1D555e7bfAA8a5921024d1D2a943'
}


## Indexer/Metadata

Indexer created and deployed at -> https://celo-indexer.namespace.ninja

## Webapp

Webapp created 60-70% and deployed at -> https://webapp-738104270314.europe-west1.run.app/
