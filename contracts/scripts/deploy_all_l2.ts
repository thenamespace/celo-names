import { Address, namehash } from 'viem';
import {
  RegistrarConfig,
  RegistryConfig,
  SelfRegistrarConfig,
  StorageConfig,
} from './types';
import { viem } from 'hardhat';
import { getBlackList } from './blacklist';

// CELO Mainnet parameters

export const CONTRACT_OWNER: Address =
  '0x7a1439668d09735576817fed278d6e414dcf8c19';

export const CONTRACT_OWNER_MULTISIG: Address = "0xd3268C4f8C2e44b02FE7E6A6a7Fb1902e51F4248"

// CELO Treasury wallet for receiving registration/renewal fees
export const CELO_OFFICIAL_TREASURY: Address =
  '0x7A1E98FC9a008107DbD1f430a05Ace8cf6f3FE19';

// ENS Treasury wallet on Celo for receiving fees
export const ENS_MULTISIG_TREASURY: Address =
  '0xcb2C613415e254477E39F1640eC6fC1414634F9E';

export const USD_STABLE_ORACLE = '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e';
export const ENS_FEES_PERCENT = 1000; // equivalent to 10%, we use 1-10000
export const CENT_MULTIPLIER = 100n;
export const SELF_UNIVERSAL_VERIFIER =
  '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
export const SELF_SCOPE_SEED = 'celo-names';

// Self verified users can claim 3 names
// this should be 1 when we go with celo
export const SELF_MAX_CLAIM = 1n;

// Stablecoin addresses on CELO
const USDC_TOKEN_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
const USDT_TOKEN_ADDRESS = '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e';
const CUSD_TOKEN_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

const STABLECOINS: Address[] = [
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  CUSD_TOKEN_ADDRESS,
];

const registryConfig: RegistryConfig = {
  name: 'Celonames',
  symbol: 'CENS',
  ens_name: 'celo.eth',
  ens_nodehash: namehash('celo.eth'),
  metadata_uri: 'https://celo-metadata.namespace.ninja/metadata',
};

const storageConfig: StorageConfig = {
  blacklist: getBlackList(),
  whitelist_enabled: false,
  whitelist: [],
};

const registrarConfig: RegistrarConfig = {
  usdOracle: USD_STABLE_ORACLE,
  treasury: CELO_OFFICIAL_TREASURY,
  ensTreasury: ENS_MULTISIG_TREASURY,
  ensTreasuryFee: ENS_FEES_PERCENT, // equals to 10% fee
  // Base price is 1 dollar
  base_price: 1n * CENT_MULTIPLIER,
  // The testing pirces
  // 3 letter - 500$, 4 letter - 250$, 5 letter - 120$,
  // 7 letter -> 1$, 8 letter -> 0.1$, 9 letter -> 0.01$, 10 letter free
  label_lengths: [3n, 4n, 5n, 6n, 7n, 8n, 9n],
  label_prices: [
    400n * CENT_MULTIPLIER,
    160n * CENT_MULTIPLIER,
    50n * CENT_MULTIPLIER,
    5n * CENT_MULTIPLIER,
    5n * CENT_MULTIPLIER,
    5n * CENT_MULTIPLIER,
    5n * CENT_MULTIPLIER,
  ],
  min_label_len: 3n,
  max_label_len: 128n,
  allowed_stablecoins: STABLECOINS,

  // Names claimed via self protocol have 1 cent renewal fee per year
  self_verified_fee: 1n // 1 cent renewal fee
};

const selfRegistrarCfg: SelfRegistrarConfig = {
  verification_hub: SELF_UNIVERSAL_VERIFIER,
  scope_seed: SELF_SCOPE_SEED,
  max_claims: SELF_MAX_CLAIM,
};

// 1. Flow, deploy registry contract with deployer address as owner
// 2. Deploy registrar contracts
// 3. Set registrar and selfRegistrar contracts as verified registrars for registry
// 4. Transfer ownership of registry to a proper ownership address

async function main() {
  const registryDeployer = await viem.deployContract('L2RegistryDeployer', [
    registryConfig,
    CONTRACT_OWNER,
  ]);

  const registryAddress = await registryDeployer.read.registry();

  console.log('Registry deployed at address', registryAddress);

  const pc = await viem.getPublicClient();
  const registrarsDeployer = await viem.deployContract('L2RegistrarDeployer', [
    storageConfig,
    registrarConfig,
    selfRegistrarCfg,
    CONTRACT_OWNER,
    registryAddress,
  ]);

  const registrar = await registrarsDeployer.read.registrar();
  const selfRegistrar = await registrarsDeployer.read.selfRegistrar();
  const storage = await registrarsDeployer.read.registrarStorage();

  console.log(`Registrar contracts deployed at:`, {
    registrar,
    selfRegistrar,
    storage,
  });

  const registry = await viem.getContractAt(
    'L2Registry',
    registryAddress as Address
  );

  // Should be called by contract owner
  const tx01 = await registry.write.setRegistrar([registrar as Address, true]);
  await pc.waitForTransactionReceipt({ hash: tx01 });
  const tx02 = await registry.write.setRegistrar([
    selfRegistrar as Address,
    true,
  ]);
  await pc.waitForTransactionReceipt({ hash: tx02 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

