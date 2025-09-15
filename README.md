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