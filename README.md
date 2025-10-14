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

L1Resolver -> Deployed at https://etherscan.io/address/0xC6FC912C5DACb6BF0a24Bad113493c900fEA254a#code and verified

L2 Contracts -> Initial version of contracts support register/renew using CELO token (USD values)

L2RegistrarV1 -> Deployed and Verified at https://celoscan.io/address/0x650b162Ef4812097E2005845A7baAE9DeeB22723
L2RegistrarV2 (Stablecoin payments) -> [0x43D76cb9be60f677e58e15F71Dd760Aaa0a2fae0](https://celoscan.io/address/0x43D76cb9be60f677e58e15F71Dd760Aaa0a2fae0)

L2Registry/Resolver -> Deployed and Verified at https://celoscan.io/address/0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE

SelfRegistrar -> 2 contracts responsible for minting names for veirifed users:
1. L2SelfRegistrar -> https://celoscan.io/address/0x7Ea39a854098308b0E732222AA221cEFF4a726E6#code
2. SelfStorage -> Stores verification data -> https://celoscan.io/address/0x6342ee37B4CfBAF0F2dCd4692FFD6Eb1053A0F06#code


## Indexer/Metadata

Indexer created and deployed at -> https://celo-indexer.namespace.ninja

## Webapp

Webapp created 60-70% and deployed at -> https://webapp-738104270314.europe-west1.run.app/
