import { viem } from 'hardhat';

const CELO_SEPOLIA_IDENTITY_VERIFICATION_HUB_ADDRESS = '0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74';
const SELF_SCOPE = "celo-test-names";

async function main() {  
  const proofOfHuman = await viem.deployContract('ProofOfHuman', [
      CELO_SEPOLIA_IDENTITY_VERIFICATION_HUB_ADDRESS,
      SELF_SCOPE
  ]);

  console.log(`POH ADDRESS: ${await proofOfHuman.address}`)
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
