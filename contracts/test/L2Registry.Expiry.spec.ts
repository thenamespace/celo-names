import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import { PARENT_ENS, PARENT_NODE, TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI } from './vars';
import { expect } from 'chai';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import { namehash, zeroAddress } from 'viem';

describe('L2Registry - Expiry', () => {
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
      admin,
      user01,
      user02,
    };
  };

  describe('Name Expiry Functionality', () => {
    it('Should allow re-registration of the same name after expiry', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'expiredname';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);

      // Register with 1 year expiry
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const currentTime = await time.latest();
      const oneYearExpiry = BigInt(currentTime + oneYearInSeconds);

      // First registration
      await registryContract.write.createSubnode(
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

      // Re-register the same name with different owner
      const newTime = await time.latest();
      const newExpiry = BigInt(newTime + oneYearInSeconds);
      
      await registryContract.write.createSubnode(
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

    it('Should return zeroAddress for ownerOf when name expires', async () => {
      const { registryContract, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'expiringname';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);

      // Register with short expiry (1 day)
      const oneDayInSeconds = 24 * 60 * 60;
      const currentTime = await time.latest();
      const shortExpiry = BigInt(currentTime + oneDayInSeconds);

      await registryContract.write.createSubnode(
        [label, shortExpiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify initial ownership
      const initialOwner = await registryContract.read.ownerOf([tokenId]);
      expect(initialOwner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Advance time by 2 days to make the token expired
      await time.increase(2 * oneDayInSeconds);

      // Verify ownerOf returns zero address after expiry
      const expiredOwner = await registryContract.read.ownerOf([tokenId]);
      expect(expiredOwner).to.equal(zeroAddress);

      // Verify the expiry timestamp is still stored
      const storedExpiry = await registryContract.read.expiries([subnode]);
      expect(storedExpiry).to.equal(shortExpiry);
    });

    it('Should prevent transfer of expired names', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'transfername';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);

      // Register with short expiry (1 day)
      const oneDayInSeconds = 24 * 60 * 60;
      const currentTime = await time.latest();
      const shortExpiry = BigInt(currentTime + oneDayInSeconds);

      await registryContract.write.createSubnode(
        [label, shortExpiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify initial ownership
      const initialOwner = await registryContract.read.ownerOf([tokenId]);
      expect(initialOwner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Advance time by 2 days to make the token expired
      await time.increase(2 * oneDayInSeconds);

      // Verify token is expired
      const expiredOwner = await registryContract.read.ownerOf([tokenId]);
      expect(expiredOwner).to.equal(zeroAddress);

      // Try to transfer expired token - should fail
      await expectContractCallToFail(
        () =>
          registryContract.write.transferFrom(
            [user01.account.address, user02.account.address, tokenId],
            { account: user01.account }
          ),
          ERRORS.SUBDOMAIN_EXPIRED
      );

      // Verify ownership hasn't changed
      const stillExpiredOwner = await registryContract.read.ownerOf([tokenId]);
      expect(stillExpiredOwner).to.equal(zeroAddress);
    });

    it('Should prevent transfer of names that expire during the transaction', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'abouttoexpire';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);

      // Register with expiry very close to current time (2 seconds)
      const currentTime = await time.latest();
      const almostExpired = BigInt(currentTime + 2);

      await registryContract.write.createSubnode(
        [label, almostExpired, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify initial ownership
      const initialOwner = await registryContract.read.ownerOf([tokenId]);
      expect(initialOwner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Advance time by 2 seconds to make the token expired
      await time.increase(2);

      // Try to transfer - should fail because token is now expired
      await expectContractCallToFail(
        () =>
          registryContract.write.transferFrom(
            [user01.account.address, user02.account.address, tokenId],
            { account: user01.account }
          ),
          ERRORS.SUBDOMAIN_EXPIRED
      );
    });

    it('Should allow transfer before expiry', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'transferrable';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);
      const tokenId = BigInt(subnode);

      // Register with long expiry (1 year)
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const currentTime = await time.latest();
      const longExpiry = BigInt(currentTime + oneYearInSeconds);

      await registryContract.write.createSubnode(
        [label, longExpiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Verify initial ownership
      const initialOwner = await registryContract.read.ownerOf([tokenId]);
      expect(initialOwner.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      // Transfer should succeed before expiry
      await registryContract.write.transferFrom(
        [user01.account.address, user02.account.address, tokenId],
        { account: user01.account }
      );

      // Verify ownership changed
      const newOwner = await registryContract.read.ownerOf([tokenId]);
      expect(newOwner.toLowerCase()).to.equal(
        user02.account.address.toLowerCase()
      );
    });
  });
});
