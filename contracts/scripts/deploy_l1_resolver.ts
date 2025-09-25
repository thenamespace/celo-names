import { viem } from "hardhat";

const ROOT_NAME = "celoo.eth";
const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
const NAME_WRAPPER_ADDRESS = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401"
const CCIP_GATEWAY_URL = "https://celo-gateway.namespace.ninja/resolver/{sender}/{data}";
const GATEWAY_SIGNER_ADDRESS = "0x510aC6D3334C5a009B25ac4cc74f28d70715ea01";
const CONTRACT_OWNER = "0x7a1439668D09735576817fEd278d6E414dcf8C19";

//   constructor(
//     string memory root_ens_name,
//     string[] memory gateway_urls,
//     address[] memory signers,
//     address name_wrapper,
//     address owner
//   ) 

async function main() {
  const deployerContract = await viem.deployContract('L1Deployer_V1', [
    ROOT_NAME,
    [CCIP_GATEWAY_URL],
    [GATEWAY_SIGNER_ADDRESS],
    NAME_WRAPPER_ADDRESS,
    CONTRACT_OWNER
  ]);
  const resolverAddress = await deployerContract.read.resolver();
  console.log(`Resolver deployed on address: ${resolverAddress}`)
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});