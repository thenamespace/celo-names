import { viem } from 'hardhat';

const SELF_UNIVERSAL_VERIFIER = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';
const SELF_SCOPE = 'celo-test-names';

//   constructor(
//     string memory root_ens_name,
//     string[] memory gateway_urls,
//     address[] memory signers,
//     address name_wrapper,
//     address owner
//   )

async function main() {
  const selfVerifier = await viem.deployContract('SelfVerifier', [
    SELF_UNIVERSAL_VERIFIER,
    SELF_SCOPE,
  ]);
  console.log(`Resolver deployed on address: ${await selfVerifier.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
