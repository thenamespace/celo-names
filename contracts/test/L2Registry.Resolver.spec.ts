import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { viem } from 'hardhat';
import {
  PARENT_ENS,
  PARENT_NODE,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  RESOLVER_ABI,
} from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import { namehash, encodeFunctionData, Hash, zeroAddress } from 'viem';

const AVATAR = 'avatar';
const AVATAR_VALUE = 'https://euc.li.artii.eth';
const CONTENTHASH_VALUE =
  '0x0000000000000000000000000000000000000000000000000000000000001234';

describe('L2Registry - Resolver', () => {
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

  describe('Resolver Record Management', () => {
    it('Should allow owner to set address/text/contenthash records for owned name', async () => {
      const { registryContract, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'resolvertest';
      const fullname = `${label}.${PARENT_ENS}`;
      const node = namehash(fullname);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Register the name
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Set ETH address
      await registryContract.write.setAddr([node, user01.account.address], {
        account: user01.account,
      });

      // Set multi-coin address (BASE)
      await registryContract.write.setAddr(
        [node, BigInt(8453), user01.account.address], // BASE coin type
        { account: user01.account }
      );

      // Set text record
      await registryContract.write.setText([node, AVATAR, AVATAR_VALUE], {
        account: user01.account,
      });

      // Set content hash
      await registryContract.write.setContenthash([node, CONTENTHASH_VALUE], {
        account: user01.account,
      });

      // Verify all records are set correctly
      const ethAddress: string = await registryContract.read.addr([node]);
      expect(ethAddress.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      const baseAddress: string = await registryContract.read.addr([
        node,
        BigInt(8453),
      ]);
      expect(baseAddress.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      const avatarText = await registryContract.read.text([node, AVATAR]);
      expect(avatarText).to.equal(AVATAR_VALUE);

      const storedContentHash = await registryContract.read.contenthash([node]);
      expect(storedContentHash).to.equal(CONTENTHASH_VALUE);
    });

    it('Should prevent non-owner from setting records for names they dont own', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'unauthorized';
      const fullname = `${label}.${PARENT_ENS}`;
      const node = namehash(fullname);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Register the name under user01
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Try to set records as user02 (not the owner) - should fail
      await expectContractCallToFail(
        () =>
          registryContract.write.setAddr([node, user02.account.address], {
            account: user02.account,
          }),
        'Not authorized'
      );

      await expectContractCallToFail(
        () =>
          registryContract.write.setText(
            [node, AVATAR, AVATAR_VALUE],
            { account: user02.account }
          ),
        'Not authorized'
      );

      await expectContractCallToFail(
        () =>
          registryContract.write.setContenthash(
            [
              node,
              CONTENTHASH_VALUE,
            ],
            { account: user02.account }
          ),
        'Not authorized'
      );
    });

    it('Should allow setting multiple records in one transaction using multicall', async () => {
      const { registryContract, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'multicalltest';
      const fullname = `${label}.${PARENT_ENS}`;
      const node = namehash(fullname);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Register the name
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Prepare multiple resolver calls
      const multicallData: Hash[] = [];

      // Set ETH address
      multicallData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [node, user01.account.address],
        })
      );

      // Set BASE address
      multicallData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [node, BigInt(8453), user01.account.address],
        })
      );

      // Set text records
      multicallData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setText',
          args: [node, 'avatar', 'https://example.com/avatar.png'],
        })
      );

      multicallData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setText',
          args: [node, 'description', 'My awesome domain'],
        })
      );

      // Set content hash
      multicallData.push(
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setContenthash',
          args: [
            node,
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          ],
        })
      );

      // Execute multicall
      await registryContract.write.multicallWithNodeCheck(
        [node, multicallData],
        { account: user01.account }
      );

      // Verify all records are set correctly
      const ethAddress: string = await registryContract.read.addr([node]);
      expect(ethAddress.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      const baseAddress: string = await registryContract.read.addr([
        node,
        BigInt(8453),
      ]);
      expect(baseAddress.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );

      const avatarText = await registryContract.read.text([node, 'avatar']);
      expect(avatarText).to.equal('https://example.com/avatar.png');

      const descriptionText = await registryContract.read.text([
        node,
        'description',
      ]);
      expect(descriptionText).to.equal('My awesome domain');

      const contentHash = await registryContract.read.contenthash([node]);
      expect(contentHash).to.equal(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );
    });

    it('Should clear records when name expires and gets re-registered', async () => {
      const { registryContract, registrar, user01, user02 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'expiretest';
      const fullname = `${label}.${PARENT_ENS}`;
      const node = namehash(fullname);

      // Register with 1 year expiry
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const currentTime = await time.latest();
      const oneYearExpiry = BigInt(currentTime + oneYearInSeconds);

      await registryContract.write.register(
        [label, oneYearExpiry, user01.account.address, []],
        { account: registrar.account }
      );

      // Set various records
      await registryContract.write.setAddr([node, user01.account.address], {
        account: user01.account,
      });

      await registryContract.write.setText(
        [node, 'avatar', 'https://example.com/avatar.png'],
        { account: user01.account }
      );

      await registryContract.write.setContenthash(
        [
          node,
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        ],
        { account: user01.account }
      );

      // Verify records are set
      const initialEthAddress: string = await registryContract.read.addr([
        node,
      ]);
      const initialAvatar = await registryContract.read.text([node, 'avatar']);
      const initialContentHash = await registryContract.read.contenthash([
        node,
      ]);

      expect(initialEthAddress.toLowerCase()).to.equal(
        user01.account.address.toLowerCase()
      );
      expect(initialAvatar).to.equal('https://example.com/avatar.png');
      expect(initialContentHash).to.equal(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      );

      // Advance time by 2 years to expire the name
      await time.increase(2 * oneYearInSeconds);

      // Verify name is expired
      const expiredOwner = await registryContract.read.ownerOf([BigInt(node)]);
      expect(expiredOwner).to.equal(zeroAddress);

      // Re-register the same name with different owner
      const newTime = await time.latest();
      const newExpiry = BigInt(newTime + oneYearInSeconds);

      await registryContract.write.register(
        [label, newExpiry, user02.account.address, []],
        { account: registrar.account }
      );

      // Verify new ownership
      const newOwner = await registryContract.read.ownerOf([BigInt(node)]);
      expect(newOwner.toLowerCase()).to.equal(
        user02.account.address.toLowerCase()
      );

      // Verify all records are cleared after re-registration
      const clearedEthAddress = await registryContract.read.addr([node]);
      const clearedAvatar = await registryContract.read.text([node, 'avatar']);
      const clearedContentHash = await registryContract.read.contenthash([
        node,
      ]);

      expect(clearedEthAddress).to.equal(zeroAddress);
      expect(clearedAvatar).to.equal('');
      expect(clearedContentHash).to.equal('0x');

      // New owner can set their own records
      await registryContract.write.setAddr([node, user02.account.address], {
        account: user02.account,
      });

      await registryContract.write.setText(
        [node, 'avatar', 'https://newuser.com/avatar.png'],
        { account: user02.account }
      );

      // Verify new records are set
      const newEthAddress: string = await registryContract.read.addr([node]);
      const newAvatar = await registryContract.read.text([node, 'avatar']);

      expect(newEthAddress.toLowerCase()).to.equal(
        user02.account.address.toLowerCase()
      );
      expect(newAvatar).to.equal('https://newuser.com/avatar.png');
    });
  });
});
