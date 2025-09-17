import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { PARENT_NODE, TOKEN_NAME, TOKEN_SYMBOL } from './fixtures';
import { expect } from 'chai';
import { equalsIgnoreCase } from './utils';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/l2/L2Registry.sol/L2Registry';

describe('It should do basic test', () => {
  const deployRegistryFixture = async () => {
    const [owner, registrar, admin, user01, user02] =
      await viem.getWalletClients();

    const registry: GetContractReturnType<L2Registry$Type['abi']> =
      await viem.deployContract('L2Registry', [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        PARENT_NODE,
      ]);
    const client = await viem.getPublicClient();

    const tx01 = await registry.write.setRegistrar([
      registrar.account.address,
      true,
    ]);
    const tx02 = await registry.write.setAdmin([admin.account.address, true]);

    await client.waitForTransactionReceipt({ hash: tx01 });
    await client.waitForTransactionReceipt({ hash: tx02 });

    return {
      registryContract: registry,
      owner,
      registrar,
      user01,
      user02,
    };
  };

  it('Should properly setup L2Registry contract', async () => {
    const { owner, registryContract } = await loadFixture(
      deployRegistryFixture
    );

    // Now these will have proper TypeScript types!
    const contractOwner = await registryContract.read.owner();
    const tokenName: string = await registryContract.read.name();
    const tokenSymbol: string = await registryContract.read.symbol();

    // You can now use these with proper type checking
    expect(contractOwner.toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
    expect(tokenName).to.equal(TOKEN_NAME);
    expect(tokenSymbol).to.equal(TOKEN_SYMBOL);
  });
});
