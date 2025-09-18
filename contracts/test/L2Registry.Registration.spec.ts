import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import {
  PARENT_ENS,
  PARENT_NODE,
  RESOLVER_ABI,
  TOKEN_NAME,
  TOKEN_SYMBOL,
} from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import {
  encodeFunctionData,
  Hash,
  namehash,
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
        PARENT_ENS,
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

  describe('Multi-level Subdomain Registration', () => {
    it('Should register nested subdomains (test.test.celo.eth)', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Register first level: test.celo.eth
      const firstLevelLabel = 'test';
      const firstLevelName = `${firstLevelLabel}.${PARENT_ENS}`;
      const firstLevelNode = namehash(firstLevelName);
      
      await registryContract.write.register(
        [firstLevelLabel, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Register second level: test.test.celo.eth
      const secondLevelLabel = 'test';
      const secondLevelName = `${secondLevelLabel}.${firstLevelName}`;
      const secondLevelNode = namehash(secondLevelName);

      await registryContract.write.register(
        [secondLevelLabel, firstLevelNode, expiry, user02.account.address, []],
        { account: registrar.account }
      );

      // Verify both registrations
      const firstOwner = await registryContract.read.ownerOf([BigInt(firstLevelNode)]);
      const secondOwner = await registryContract.read.ownerOf([BigInt(secondLevelNode)]);
      
      expect(firstOwner.toLowerCase()).to.equal(user01.account.address.toLowerCase());
      expect(secondOwner.toLowerCase()).to.equal(user02.account.address.toLowerCase());
    });

    it('Should register three-level nested subdomains (test.test.test.celo.eth)', async () => {
      const { registryContract, registrar, user01, user02, admin } = await loadFixture(
        deployRegistryFixture
      );

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Level 1: test.celo.eth
      const level1Label = 'test';
      const level1Name = `${level1Label}.${PARENT_ENS}`;
      const level1Node = namehash(level1Name);
      
      await registryContract.write.register(
        [level1Label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Level 2: test.test.celo.eth
      const level2Label = 'test';
      const level2Name = `${level2Label}.${level1Name}`;
      const level2Node = namehash(level2Name);

      await registryContract.write.register(
        [level2Label, level1Node, expiry, user02.account.address, []],
        { account: registrar.account }
      );

      // Level 3: test.test.test.celo.eth
      const level3Label = 'test';
      const level3Name = `${level3Label}.${level2Name}`;
      const level3Node = namehash(level3Name);

      await registryContract.write.register(
        [level3Label, level2Node, expiry, admin.account.address, []],
        { account: registrar.account }
      );

      // Verify all three levels
      const level1Owner = await registryContract.read.ownerOf([BigInt(level1Node)]);
      const level2Owner = await registryContract.read.ownerOf([BigInt(level2Node)]);
      const level3Owner = await registryContract.read.ownerOf([BigInt(level3Node)]);
      
      expect(level1Owner.toLowerCase()).to.equal(user01.account.address.toLowerCase());
      expect(level2Owner.toLowerCase()).to.equal(user02.account.address.toLowerCase());
      expect(level3Owner.toLowerCase()).to.equal(admin.account.address.toLowerCase());
    });

    it('Should fail to register under non-existent parent', async () => {
      const { registryContract, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);
      
      // Try to register under non-existent parent node
      const fakeParentNode = namehash("vitalik.eth");
      
      await expectContractCallToFail(
        () =>
          registryContract.write.register(
            ['subdomain', fakeParentNode, expiry, user01.account.address, []],
            { account: registrar.account }
          ),
        ERRORS.PARENT_NODE_NOT_VALID
      );
    });

    it('Should fail to register under expired parent', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const currentTime = await time.latest();
      const oneYearExpiry = BigInt(currentTime + oneYearInSeconds);

      // Register parent with 1 year expiry
      const parentLabel = 'parent';
      const parentName = `${parentLabel}.${PARENT_ENS}`;
      const parentNode = namehash(parentName);
      
      await registryContract.write.register(
        [parentLabel, oneYearExpiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Advance time by 2 years to expire parent
      await time.increase(2 * oneYearInSeconds);

      // Try to register under expired parent - should fail
      const newTime = await time.latest();
      const futureExpiry = BigInt(newTime + 86400); // 24 hours from new time
      
      await expectContractCallToFail(
        () =>
          registryContract.write.register(
            ['child', parentNode, futureExpiry, user02.account.address, []],
            { account: registrar.account }
          ),
        ERRORS.PARENT_NODE_NOT_VALID
      );
    });

    it('Should register nested subdomain with resolver data', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);
      const resolverData: Hash[] = [];

      // Register parent
      const parentLabel = 'parent';
      const parentName = `${parentLabel}.${PARENT_ENS}`;
      const parentNode = namehash(parentName);
      
      await registryContract.write.register(
        [parentLabel, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Register child with resolver data
      const childLabel = 'child';
      const childName = `${childLabel}.${parentName}`;
      const childNode = namehash(childName);

      // Set resolver data for child
      resolverData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [childNode, user02.account.address],
        })
      );

      resolverData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setText',
          args: [childNode, 'description', 'nested subdomain'],
        })
      );

      await registryContract.write.register(
        [childLabel, parentNode, expiry, user02.account.address, resolverData],
        { account: registrar.account }
      );

      // Verify child registration and resolver data
      const childOwner = await registryContract.read.ownerOf([BigInt(childNode)]);
      expect(childOwner.toLowerCase()).to.equal(user02.account.address.toLowerCase());

      const ethAddress: string = await registryContract.read.addr([childNode]);
      expect(ethAddress.toLowerCase()).to.equal(user02.account.address.toLowerCase());

      const description = await registryContract.read.text([childNode, 'description']);
      expect(description).to.equal('nested subdomain');
    });

    it('Should return string representation of a name using node', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Register first level: test.celo.eth
      const firstLevelLabel = 'test';
      const firstLevelName = `${firstLevelLabel}.${PARENT_ENS}`;
      const firstLevelNode = namehash(firstLevelName);
      
      await registryContract.write.register(
        [firstLevelLabel, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Register second level: nested.test.celo.eth
      const secondLevelLabel = 'nested';
      const secondLevelName = `${secondLevelLabel}.${firstLevelName}`;
      const secondLevelNode = namehash(secondLevelName);

      await registryContract.write.register(
        [secondLevelLabel, firstLevelNode, expiry, user02.account.address, []],
        { account: registrar.account }
      );

      // Verify names mapping resolves correctly
      const firstLevelResolvedName = await registryContract.read.names([firstLevelNode]);
      const secondLevelResolvedName = await registryContract.read.names([secondLevelNode]);
      
      expect(firstLevelResolvedName).to.equal('test.celo.eth');
      expect(secondLevelResolvedName).to.equal('nested.test.celo.eth');

      // Verify root name is stored correctly
      const rootName = await registryContract.read.names([PARENT_NODE]);
      expect(rootName).to.equal('celo.eth');
    });
  });
});
