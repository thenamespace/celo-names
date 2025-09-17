import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import {
  PARENT_ENS,
  PARENT_NODE,
  RESOLVER_ABI,
  TOKEN_NAME,
  TOKEN_SYMBOL,
} from './fixtures';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/l2/L2Registry.sol/L2Registry';
import {
  encodeFunctionData,
  Hash,
  namehash,
  parseAbi,
  zeroAddress,
} from 'viem';

describe('L2Registry - Registration', () => {
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
      admin,
      user01,
      user02,
    };
  };

  describe('Subdomain Registration', () => {
    it('Should register a proper subname and verify ownership, expiry, label, and transferability', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'testname';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

      // Register the subname
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify ownerOf returns the correct owner
      const owner = await registryContract.read.ownerOf([tokenId]);
      expect(owner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Verify expiry is set correctly
      const storedExpiry = await registryContract.read.expiries([subnode]);
      expect(storedExpiry).to.equal(expiry);

      // Verify label is stored correctly
      const storedLabel = await registryContract.read.labels([subnode]);
      expect(storedLabel).to.equal(label);

      // Verify transfer works
      await expect(
        registryContract.write.transferFrom(
          [user01.account.address, user02.account.address, tokenId],
          { account: user01.account }
        )
      ).to.not.be.reverted;

      // Verify ownership changed after transfer
      const newOwner = await registryContract.read.ownerOf([tokenId]);
      expect(newOwner.toLowerCase()).to.equal(
        user02.account.address.toLowerCase()
      );
    });

    it('Should allow re-registration after expiry', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'expiredname';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);

      // Register with 1 year expiry
      const oneYearInSeconds = 365 * 24 * 60 * 60; // 1 year
      const currentTime = await time.latest();
      const oneYearExpiry = BigInt(currentTime + oneYearInSeconds);

      await registryContract.write.register(
        [label, oneYearExpiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify initial registration
      const initialOwner = await registryContract.read.ownerOf([tokenId]);
      expect(initialOwner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Advance time by 2 years to make the token expired
      await time.increase(2 * oneYearInSeconds);

      // Verify token is now expired (ownerOf returns zero address)
      const expiredOwner = await registryContract.read.ownerOf([tokenId]);
      expect(expiredOwner).to.equal(zeroAddress);

      // Register the same name again with different owner
      const newTime = await time.latest();
      const newExpiry = BigInt(newTime + oneYearInSeconds);
      await registryContract.write.register(
        [label, newExpiry, user02.account.address, []],
        { account: registrar.account }
      );

      // Verify new registration works
      const newOwner = await registryContract.read.ownerOf([tokenId]);
      expect(newOwner.toLowerCase()).to.equal(
        user02.account.address.toLowerCase()
      );

      // Verify new expiry is set
      const newStoredExpiry = await registryContract.read.expiries([subnode]);
      expect(newStoredExpiry).to.equal(newExpiry);
    });

    it('Should fail to register an already taken non-expired name', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'takenname';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Register the subname
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify first registration succeeded
      const owner = await registryContract.read.ownerOf([BigInt(subnode)]);
      expect(owner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Try to register the same name again - should fail
      await expectContractCallToFail(
        () =>
          registryContract.write.register(
            [label, expiry, user02.account.address, []],
            { account: registrar.account }
          ),
        ERRORS.SUBDOMAIN_ALREADY_TAKEN
      );
    });

    it('Should register a subname and set resolver data', async () => {
      const { registrar, registryContract, user01 } = await loadFixture(
        deployRegistryFixture
      );
      const resolverData: Hash[] = [];

      const label = 'test';
      const subname = `${label}.${PARENT_ENS}`;
      const node = namehash(subname);

      const minterAddress = user01.account.address;
      // Set ETH Address
      resolverData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [node, minterAddress],
        })
      );

      // Set Base Address
      resolverData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [node, BigInt(1111), minterAddress],
        })
      );

      resolverData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setText',
          args: [node, 'avatar', 'test-avatar'],
        })
      );

      const futureExpiry = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now
      
      await registryContract.write.register([
        label,
        futureExpiry,
        minterAddress,
        resolverData
      ], { account: registrar.account });

      // Verify ETH address is set correctly
      const ethAddress: string = await registryContract.read.addr([node]);
      expect(ethAddress.toLowerCase()).to.equal(minterAddress.toLowerCase());

      // Verify multi-coin address is set correctly
      const multiCoinAddress: string = await registryContract.read.addr([node, BigInt(1111)]);
      expect(multiCoinAddress.toLowerCase()).to.equal(minterAddress.toLowerCase());

      // Verify text record is set correctly
      const avatarText = await registryContract.read.text([node, 'avatar']);
      expect(avatarText).to.equal('test-avatar');
    });
  });
});
