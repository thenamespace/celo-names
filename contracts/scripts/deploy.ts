import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Names contract...");

  const Names = await ethers.getContractFactory("Names");
  const names = await Names.deploy(
    "Celo Names",
    "CNAME",
    "https://api.example.com/metadata/"
  );

  await names.waitForDeployment();

  const address = await names.getAddress();
  console.log("Names contract deployed to:", address);
  console.log("Contract name:", await names.name());
  console.log("Contract symbol:", await names.symbol());
  console.log("Base URI:", await names._baseURI());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
