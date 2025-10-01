import { viem } from 'hardhat';
import { Hash, keccak256, namehash, toBytes } from 'viem';

interface RegistrarConfig {
  basePrice: bigint
  labelLength: bigint[]
  labelPrices: bigint[]
  maxLabelLength: bigint
  minLabelLength: bigint
}
const TOKEN_NAME = 'CELO ENS';
const TOKEN_SYMBOL = 'CENS';
const ROOT_ENS_NAME = 'celoo.eth';
const ROOT_ENS_NAMEHASH = namehash(ROOT_ENS_NAME);
const METADATA_URI = 'https://celo-metadata.namespace.ninja/metadata/';
// https://data.chain.link/feeds/celo/mainnet/celo-usd
const USD_STABLE_ORACLE = '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e';
const OWNER_ADDRESS = '0x7a1439668D09735576817fEd278d6E414dcf8C19';
const TREASURY_ADDRESS = '0x7a1439668D09735576817fEd278d6E414dcf8C19';

const BLACKLIST: Hash[] = [
  'ens',
  'celo',
  'vitalik',
].map(i => keccak256(toBytes(i)))

const CONFIG: RegistrarConfig = {
  // base price 5$ or equivalent in USDC ERC20
  basePrice: 1n,
   // label prices 3letter -> 640$, 4letter ->320$, 5letter -> 120$, rest -> basePrice 
  labelLength: [3n,4n,5n],
  labelPrices: [640n, 320n, 120n],
  // Only >= 3 charater and <= 64 character subs can be registered 
  minLabelLength: 3n,
  maxLabelLength: 64n
}


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
    owner,
    CONFIG,
    BLACKLIST
  ]);

  const registry = await deployerContract.read.registry();
  const registrar = await deployerContract.read.registrar();

  console.log(`Registrar deployed at: ${registrar}`);
  console.log(`Registry deployed at: ${registry}`)
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
