import { viem } from "hardhat";
import { getContract, type Address, namehash } from "viem";

export interface TestSetup {
  l2Registry: any;
  owner: Address;
  registrar: Address;
  nonRegistrar: Address;
  admin: Address;
  user1: Address;
  user2: Address;
  tokenName: string;
  tokenSymbol: string;
  ensName: string;
  parentNode: string;
}

export const TOKEN_NAME = "Celo Names";
export const TOKEN_SYMBOL = "CNAME";
export const ENS_NAME = "celo.eth";
export const PARENT_NODE = namehash(ENS_NAME);

/**
 * Common test setup for L2Registry tests
 * Deploys contract and sets up basic roles
 */
export async function setupL2RegistryTest(): Promise<TestSetup> {
  const [ownerAccount, registrarAccount, nonRegistrarAccount, adminAccount, user1Account, user2Account] = await viem.getWalletClients();

  const owner = ownerAccount.account.address;
  const registrar = registrarAccount.account.address;
  const nonRegistrar = nonRegistrarAccount.account.address;
  const admin = adminAccount.account.address;
  const user1 = user1Account.account.address;
  const user2 = user2Account.account.address;

  // Deploy L2Registry
  const l2RegistryContract = await viem.deployContract("L2Registry", [
    TOKEN_NAME,
    TOKEN_SYMBOL,
    PARENT_NODE
  ]);

  const l2Registry = getContract({
    address: l2RegistryContract.address,
    abi: l2RegistryContract.abi,
    client: ownerAccount,
  });

  // Set up basic roles
  await l2Registry.write.setRegistrar([registrar, true]);
  await l2Registry.write.setAdmin([admin, true]);

  return {
    l2Registry,
    owner,
    registrar,
    nonRegistrar,
    admin,
    user1,
    user2,
    tokenName: TOKEN_NAME,
    tokenSymbol: TOKEN_SYMBOL,
    ensName: ENS_NAME,
    parentNode: PARENT_NODE
  };
}

/**
 * Common test setup for L2Registry tests with only basic accounts
 * Used for simple tests that don't need all roles
 */
export async function setupBasicL2RegistryTest(): Promise<Pick<TestSetup, 'l2Registry' | 'owner' | 'tokenName' | 'tokenSymbol' | 'ensName' | 'parentNode'>> {
  const [ownerAccount] = await viem.getWalletClients();

  const owner = ownerAccount.account.address;

  // Deploy L2Registry
  const l2RegistryContract = await viem.deployContract("L2Registry", [
    TOKEN_NAME,
    TOKEN_SYMBOL,
    PARENT_NODE
  ]);

  const l2Registry = getContract({
    address: l2RegistryContract.address,
    abi: l2RegistryContract.abi,
    client: ownerAccount,
  });

  return {
    l2Registry,
    owner,
    tokenName: TOKEN_NAME,
    tokenSymbol: TOKEN_SYMBOL,
    ensName: ENS_NAME,
    parentNode: PARENT_NODE
  };
}

/**
 * Common test setup for L2Registry tests with registrar role
 * Used for registration tests
 */
export async function setupRegistrarL2RegistryTest(): Promise<Pick<TestSetup, 'l2Registry' | 'owner' | 'registrar' | 'tokenName' | 'tokenSymbol' | 'ensName' | 'parentNode'>> {
  const [ownerAccount, registrarAccount] = await viem.getWalletClients();

  const owner = ownerAccount.account.address;
  const registrar = registrarAccount.account.address;

  // Deploy L2Registry
  const l2RegistryContract = await viem.deployContract("L2Registry", [
    TOKEN_NAME,
    TOKEN_SYMBOL,
    PARENT_NODE
  ]);

  const l2Registry = getContract({
    address: l2RegistryContract.address,
    abi: l2RegistryContract.abi,
    client: ownerAccount,
  });

  // Set up registrar role
  await l2Registry.write.setRegistrar([registrar, true]);

  return {
    l2Registry,
    owner,
    registrar,
    tokenName: TOKEN_NAME,
    tokenSymbol: TOKEN_SYMBOL,
    ensName: ENS_NAME,
    parentNode: PARENT_NODE
  };
}
