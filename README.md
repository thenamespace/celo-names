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

Contract Addresses : {
  registry: 0xf1f32c316fF183A27F3b6966adAA0c0781606028,
  registrar: 0x07406B4C49eE511bB059004907AB83390f10B831
  selfRegistrar: 0x995Fc9C8e01dde9FbD3c6eC4A034456e9D24BCA3
  storage: 0x78E117f74FAdc8722A5E7A02278494080A9EEf14
}


## Indexer/Metadata

Indexer created and deployed at -> https://celo-indexer.namespace.ninja

## Webapp

Webapp created 60-70% and deployed at -> https://webapp-738104270314.europe-west1.run.app/
