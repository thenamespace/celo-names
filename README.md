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
  registry: 0x9F22e723Bb51B42B551955176b212dbD073D6227
  registrar: '0x9D5Def4994480E8Ba459c397F72Ee45da3621FbD',
  selfRegistrar: '0x8760E1C47CCB065505A52b2b44a20EB7614D2a30',
  storage: '0x882d9369F4E5979BC6e53eA81564553d4F91Eb5A'
}


## Indexer/Metadata

Indexer created and deployed at -> https://celo-indexer.namespace.ninja

## Webapp

Webapp created 60-70% and deployed at -> https://webapp-738104270314.europe-west1.run.app/
