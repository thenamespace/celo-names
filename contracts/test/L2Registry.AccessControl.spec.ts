import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { PARENT_ENS, PARENT_NODE, TOKEN_NAME, TOKEN_SYMBOL } from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import { namehash } from 'viem';

describe('L2Registry - Access Control', () => {
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

  describe('Owner Access Control', () => {
    it('Should allow only owner to modify admins', async () => {
      const { registryContract, owner, admin, user01 } = await loadFixture(
        deployRegistryFixture
      );

      // Owner should be able to set admin
      await expect(
        registryContract.write.setAdmin([user01.account.address, true], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Non-owner should not be able to set admin
      await expectContractCallToFail(
        () =>
          registryContract.write.setAdmin([user01.account.address, true], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should allow only owner to modify registrars', async () => {
      const { registryContract, owner, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );

      // Owner should be able to set registrar
      await expect(
        registryContract.write.setRegistrar([user01.account.address, true], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Non-owner should not be able to set registrar
      await expectContractCallToFail(
        () =>
          registryContract.write.setRegistrar([user01.account.address, true], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Registrar Access Control', () => {
    it('Should allow only registrar to register subnames', async () => {
      const { registryContract, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );
      const label = 'test';
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

      // Registrar should be able to register
      await expect(
        registryContract.write.register(
          [label, expiry, user01.account.address, []],
          { account: registrar.account }
        )
      ).to.be.not.reverted;

      // Non-registrar should not be able to register
      await expectContractCallToFail(
        () =>
          registryContract.write.register(
            [label + '2', expiry, user01.account.address, []],
            { account: user01.account }
          ),
        ERRORS.REGISTRAR_ONLY
      );
    });

    it('Should allow only registrar to set expiry', async () => {
      const { registryContract, registrar, user01 } = await loadFixture(
        deployRegistryFixture
      );

      const label = 'test';
      const fullname = `${label}.${PARENT_ENS}`;
      const subnode = namehash(fullname);

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 84000);

      // First register a subname
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );

       const newExpiry = BigInt(Math.floor(Date.now() / 1000) + 172800);
      // Registrar should be able to set expiry
      await expect(
        registryContract.write.setExpiry([subnode, newExpiry], {
          account: registrar.account,
        })
      ).to.not.be.reverted;

      // Non-registrar should not be able to set expiry;
      await expectContractCallToFail(
        () =>
          registryContract.write.setExpiry([subnode, newExpiry], {
            account: user01.account,
          }),
        ERRORS.REGISTRAR_ONLY
      );
    });
  });

  describe('Admin Access Control', () => {
    it('Should allow only admin to revoke subnames', async () => {
      const { registryContract, registrar, admin, user01 } = await loadFixture(
        deployRegistryFixture
      );
      const label = 'test';
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400);
      // First register a subname
      await registryContract.write.register(
        [label, expiry, user01.account.address, []],
        { account: registrar.account }
      );
      // Calculate node hash
      const node = namehash(`${label}.${PARENT_ENS}`)

      // Admin should be able to revoke
      await expect(
        registryContract.write.revoke([node], { account: admin.account })
      ).to.not.be.reverted;

        // Non-admin should not be able to revoke
      expectContractCallToFail(async() => {
        registryContract.write.revoke([node], { account: user01.account })
      }, ERRORS.ADMIN_ONLY)
    });
  });
});
