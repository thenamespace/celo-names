import { viem } from 'hardhat';

const SELF_UNIVERSAL_VERIFIER = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
const SELF_SCOPE_SEED = 'celo-test-names';
const L2_REGISTRY_ADDRESS = "0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE"
const OWNER_ADDRESS = '0x7a1439668D09735576817fEd278d6E414dcf8C19';
const MAX_CLAIMS_PER_USER = 10n;

async function main() {

  const selfRegistrarDeployer = await viem.deployContract('L2SelfRegistrarDeployer_V1', [
    SELF_UNIVERSAL_VERIFIER,
    SELF_SCOPE_SEED,
    L2_REGISTRY_ADDRESS,
    OWNER_ADDRESS,
    MAX_CLAIMS_PER_USER
  ]);

  const registar = await selfRegistrarDeployer.read.registrar();
  console.log(`Registrar deployed on address: ${registar}`);
  const storage = await selfRegistrarDeployer.read.selfStorage();
  console.log(`Storage deployed on address: ${storage}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
