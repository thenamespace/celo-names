import { viem } from 'hardhat';
import { Address, Hash, keccak256, namehash, toBytes } from 'viem';

interface RegistrarConfig {
  basePrice: bigint;
  labelLength: bigint[];
  labelPrices: bigint[];
  maxLabelLength: bigint;
  minLabelLength: bigint;
}

const REGISTRY_ADDRESS = '0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE';
// https://data.chain.link/feeds/celo/mainnet/celo-usd
const USD_STABLE_ORACLE = '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e';
const OWNER_ADDRESS = '0x7a1439668D09735576817fEd278d6E414dcf8C19';
const TREASURY_ADDRESS = '0x7a1439668D09735576817fEd278d6E414dcf8C19';

const BLACKLIST: Hash[] = ['badword', 'badword1', 'badword2'].map((i) =>
  keccak256(toBytes(i))
);

const USDC_TOKEN_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const USDT_TOKEN_ADDRESS = "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";
const SUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"
const SUPPORTED_STABLECOINS: Address[] = [
    USDC_TOKEN_ADDRESS,
    USDT_TOKEN_ADDRESS,
    SUSD_TOKEN_ADDRESS
]

const CONFIG: RegistrarConfig = {
  // base price 5$ or equivalent in USDC ERC20
  basePrice: 1n,
  // label prices 3letter -> 640$, 4letter ->320$, 5letter -> 120$, rest -> basePrice
  labelLength: [3n, 4n, 5n],
  labelPrices: [640n, 320n, 120n],
  // Only >= 3 charater and <= 64 character subs can be registered
  minLabelLength: 3n,
  maxLabelLength: 64n,
};

async function main() {
  const treasury = OWNER_ADDRESS;
  const owner = TREASURY_ADDRESS;

  console.log('Deploying L2Registrar');
  const deployerContract = await viem.deployContract('L2RegistrarDeployer', [
    REGISTRY_ADDRESS,
    USD_STABLE_ORACLE,
    treasury,
    owner,
    CONFIG,
    BLACKLIST,
    SUPPORTED_STABLECOINS
  ]);

  const registrar = await deployerContract.read.registrar();

  console.log(`Registrar deployed at: ${registrar}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
