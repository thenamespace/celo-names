import { viem } from 'hardhat';
import { namehash } from 'viem';

const TOKEN_NAME = "Celo ENS";
const TOKEN_SYMBOL = "CENS";
const ROOT_ENS_NAME = "celo.eth";
const ROOT_ENS_NAMEHASH = namehash(ROOT_ENS_NAME);
const METADATA_URI = "https://placeholder...";
// https://data.chain.link/feeds/celo/mainnet/celo-usd
const USD_STABLE_ORACLE = "0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e"
const OWNER_ADDRESS = "0x1D84ad46F1ec91b4Bb3208F645aD2fA7aBEc19f8";
const TREASURY_ADDRESS = "0x1D84ad46F1ec91b4Bb3208F645aD2fA7aBEc19f8";

  // constructor(
  //   string memory _root_ens_name,
  //   bytes32 _root_ens_namehash,
  //   string memory token_name,
  //   string memory token_symbol,
  //   string memory metadata_uri,
  //   address usd_stable_oracle,
  //   address treasury,
  //   address owner
  //.  RegistryConfig config
  // ) 

async function main() {
  const treasury = OWNER_ADDRESS;
  const owner = TREASURY_ADDRESS;

  console.log('Deploying L2Deployer_V1...');
  const deployerContract = await viem.deployContract('L2Deployer_V1', [
    ROOT_ENS_NAME,
    ROOT_ENS_NAMEHASH,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    METADATA_URI,
    USD_STABLE_ORACLE,
    treasury,
    owner
  ]);

  console.log(deployerContract.address, "ADDRESS!")
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});