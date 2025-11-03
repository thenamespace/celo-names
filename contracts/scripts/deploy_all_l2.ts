import { Address, Hash, labelhash, namehash } from 'viem';
import {
  RegistrarConfig,
  RegistryConfig,
  SelfRegistrarConfig,
  StorageConfig,
} from './types';
import { viem } from 'hardhat';

// CELO Mainnet parameters

export const CONTRACT_OWNER: Address =
  '0x7a1439668d09735576817fed278d6e414dcf8c19';
export const CELO_TREASURY: Address =
  '0x7a1439668d09735576817fed278d6e414dcf8c19';
export const ENS_TREASURY: Address =
  '0xa0a834ade578f87ae0a34b51ffd0e1e2850a15aa';
export const USD_STABLE_ORACLE = '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e';
export const ENS_FEES_PERCENT = 10;
export const CENT_MULTIPLIER = 100n;
export const SELF_UNIVERSAL_VERIFIER =
  '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
export const SELF_SCOPE_SEED = 'celo-test-names';

// Self verified users can claim 3 names
// this should be 1 when we go with celo
export const SELF_MAX_CLAIM = 3n;

const BLACKLIST: Hash[] = [
  labelhash('offensive'),
  labelhash('badname'),
  labelhash('bad'),
  labelhash('damb'),
];

const WHITELIST: Address[] = [
  '0x035eBd096AFa6b98372494C7f08f3402324117D3',
  '0x1d84ad46f1ec91b4bb3208f645ad2fa7abec19f8',
  '0x7a1439668d09735576817fed278d6e414dcf8c19',
];
const USDC_TOKEN_ADDRESS = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
const USDT_TOKEN_ADDRESS = '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e';
const CUSD_TOKEN_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

const STABLECOINS: Address[] = [
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  CUSD_TOKEN_ADDRESS,
];

const registryConfig: RegistryConfig = {
  name: 'Celo ENS',
  symbol: 'ENS',
  ens_name: 'celoo.eth',
  ens_nodehash: namehash('celoo.eth'),
  metadata_uri: 'https://celo-metadata.namespace.ninja/metadata',
};

const storageConfig: StorageConfig = {
  blacklist: BLACKLIST,
  whitelist_enabled: true,
  whitelist: WHITELIST,
};

const registrarConfig: RegistrarConfig = {
  usdOracle: USD_STABLE_ORACLE,
  treasury: CELO_TREASURY,
  ensTreasury: ENS_TREASURY,
  ensTreasuryFee: 1000, // equals to 10% fee
  // Base price is 5 dolar
  base_price: 5n * 100n,
  // The testing pirces
  // 3 letter - 500$, 4 letter - 250$, 5 letter - 120$,
  // 7 letter -> 1$, 8 letter -> 0.1$, 9 letter -> 0.01$, 10 letter free
  label_lengths: [3n, 4n, 5n, 7n, 8n, 9n, 10n],
  label_prices: [
    500n * CENT_MULTIPLIER,
    250n * CENT_MULTIPLIER,
    120n * CENT_MULTIPLIER,
    1n * CENT_MULTIPLIER,
    10n,
    1n,
    0n,
  ],
  min_label_len: 3n,
  max_label_len: 64n,
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

  // Allow stablecoin payments
  const registrarContract = await viem.getContractAt(
    'L2Registrar',
    registrar as Address
  );
  const tx03 = await registrarContract.write.modifyApprovedTokens([
    STABLECOINS,
    true,
    false,
  ]);
  await pc.waitForTransactionReceipt({ hash: tx03 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
