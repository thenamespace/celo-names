import { viem } from 'hardhat';

const SELF_UNIVERSAL_VERIFIER = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
const SELF_SCOPE_SEED = 'celo-test-names';
const L2_REGISTRY_ADDRESS = "0x968A5c0f00F5D6CE6B29Ee9fD8e4Ea5e748a03BE"

async function main() {
  const selfVerifier = await viem.deployContract('L2SelfRegistrar', [
    SELF_UNIVERSAL_VERIFIER,
    SELF_SCOPE_SEED,
    L2_REGISTRY_ADDRESS
  ]);
  console.log(`L2SelfRegistrar deployed on address: ${await selfVerifier.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
