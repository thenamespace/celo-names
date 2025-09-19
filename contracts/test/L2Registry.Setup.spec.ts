import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import { PARENT_ENS, PARENT_NODE, TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI } from './vars';
import { expect } from 'chai';
import { namehash } from 'viem';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';

describe('L2Registry - Setup', () => {
  const deployRegistryFixture = async () => {
    const [owner, registrar, admin, user01, user02] =
      await viem.getWalletClients();

    const registry: GetContractReturnType<L2Registry$Type['abi']> =
      await viem.deployContract('L2Registry', [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        PARENT_ENS,
        PARENT_NODE,
        METADATA_URI,
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
    const metadataUri: string = await registryContract.read.metadataUri();

    // You can now use these with proper type checking
    expect(contractOwner.toLowerCase()).to.equal(
      owner.account.address.toLowerCase()
    );
    expect(tokenName).to.equal(TOKEN_NAME);
    expect(tokenSymbol).to.equal(TOKEN_SYMBOL);
    expect(metadataUri).to.equal(METADATA_URI);
  });

  it('Should mint a subname and return correct tokenURI', async () => {
    const { registryContract, registrar, user01 } = await loadFixture(
      deployRegistryFixture
    );

    const label = 'test';
    const fullName = `${label}.${PARENT_ENS}`;
    const node = namehash(fullName);
    const expectedTokenURI = `${METADATA_URI}/${fullName}`;

    // Register a subname
    const currentTime = await time.latest();
    const expiry = currentTime + 365 * 24 * 60 * 60; // 1 year from now
    await registryContract.write.createSubnode([
      label,
      BigInt(expiry),
      user01.account.address,
      [],
    ], {
      account: registrar.account,
    });

    // Verify the token was minted
    const owner = await registryContract.read.ownerOf([BigInt(node)]);
    expect(owner.toLowerCase()).to.equal(user01.account.address.toLowerCase());

    // Verify the tokenURI
    const tokenURI = await registryContract.read.tokenURI([BigInt(node)]);
    expect(tokenURI).to.equal(expectedTokenURI);
  });

  it('Should return correct tokenURI for different subnames', async () => {
    const { registryContract, registrar, user01, user02 } = await loadFixture(
      deployRegistryFixture
    );

    const label1 = 'alice';
    const label2 = 'bob';
    const fullName1 = `${label1}.${PARENT_ENS}`;
    const fullName2 = `${label2}.${PARENT_ENS}`;
    const node1 = namehash(fullName1);
    const node2 = namehash(fullName2);

    const currentTime = await time.latest();
    const expiry = currentTime + 365 * 24 * 60 * 60; // 1 year from now

    // Register first subname
    await registryContract.write.createSubnode([
      label1,
      BigInt(expiry),
      user01.account.address,
      [],
    ], {
      account: registrar.account,
    });

    // Register second subname
    await registryContract.write.createSubnode([
      label2,
      BigInt(expiry),
      user02.account.address,
      [],
    ], {
      account: registrar.account,
    });

    // Verify tokenURIs
    const tokenURI1 = await registryContract.read.tokenURI([BigInt(node1)]);
    const tokenURI2 = await registryContract.read.tokenURI([BigInt(node2)]);

    expect(tokenURI1).to.equal(`${METADATA_URI}/${fullName1}`);
    expect(tokenURI2).to.equal(`${METADATA_URI}/${fullName2}`);
  });

  it('Should revert when calling tokenURI for non-existent token', async () => {
    const { registryContract } = await loadFixture(deployRegistryFixture);

    const fakeNode = namehash('nonexistent.celo.eth');

    await expectContractCallToFail(
      () => registryContract.read.tokenURI([BigInt(fakeNode)]),
      ERRORS.TOKEN_DOES_NOT_EXIST
    );
  });
});
