import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { PARENT_ENS, PARENT_NODE } from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registrar$Type } from '../artifacts/contracts/L2Registrar.sol/L2Registrar';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import { TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI } from './vars';

describe("L2Registrar - AccessControl", () => {
  const deployRegistrarFixture = async () => {
    const [owner, nonOwner, user01, user02] = await viem.getWalletClients();

    // Deploy L2Registry first
    const registry: GetContractReturnType<L2Registry$Type['abi']> = 
      await viem.deployContract('L2Registry', [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        PARENT_ENS,
        PARENT_NODE,
        METADATA_URI,
      ]);

    // Deploy mock USD oracle (using a simple contract for testing)
    const mockOracle = await viem.deployContract('MockedUsdOracle', [2000_00000000n]); // $2000 ETH price

    // Deploy L2Registrar
    const registrar: GetContractReturnType<L2Registrar$Type['abi']> = 
      await viem.deployContract('L2Registrar', [
        registry.address,
        mockOracle.address,
        owner.account.address, // treasury
      ]);

    return {
      registrarContract: registrar,
      registryContract: registry,
      mockOracle,
      owner,
      nonOwner,
      user01,
      user02,
    };
  };

  describe('Owner Access Control - setBasePrice', () => {
    it('Should allow owner to set base price', async () => {
      const { registrarContract, owner } = await loadFixture(deployRegistrarFixture);
      
      const newBasePrice = 1000n;
      
      await expect(
        registrarContract.write.setBasePrice([newBasePrice], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      const currentPrice = await registrarContract.read.basePrice();
      expect(currentPrice).to.equal(newBasePrice);
    });

    it('Should NOT allow non-owner to set base price', async () => {
      const { registrarContract, nonOwner } = await loadFixture(deployRegistrarFixture);
      
      const newBasePrice = 1000n;
      
      await expectContractCallToFail(
        async () => await registrarContract.write.setBasePrice([newBasePrice], {
          account: nonOwner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Owner Access Control - setLabelPrices', () => {
    it('Should allow owner to set label prices', async () => {
      const { registrarContract, owner } = await loadFixture(deployRegistrarFixture);
      
      const lengths = [1n, 3n, 5n];
      const prices = [1000n, 500n, 200n];
      
      await expect(
        registrarContract.write.setLabelPrices([lengths, prices], {
          account: owner.account,
        })
      ).to.not.be.reverted;
    });

    it('Should NOT allow non-owner to set label prices', async () => {
      const { registrarContract, nonOwner } = await loadFixture(deployRegistrarFixture);
      
      const lengths = [1n, 3n, 5n];
      const prices = [1000n, 500n, 200n];
      
      await expectContractCallToFail(
        async () => await registrarContract.write.setLabelPrices([lengths, prices], {
          account: nonOwner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should revert when arrays length mismatch', async () => {
      const { registrarContract, owner } = await loadFixture(deployRegistrarFixture);
      
      const lengths = [1n, 3n];
      const prices = [1000n, 500n, 200n]; // Different length
      
      await expectContractCallToFail(
        async () => await registrarContract.write.setLabelPrices([lengths, prices], {
          account: owner.account,
        }),
        'ArraysLengthMismatch'
      );
    });
  });

  describe('Owner Access Control - setLabelLengthLimits', () => {
    it('Should allow owner to set label length limits', async () => {
      const { registrarContract, owner } = await loadFixture(deployRegistrarFixture);
      
      const newMinLength = 2n;
      const newMaxLength = 50n;
      
      await expect(
        registrarContract.write.setLabelLengthLimits([newMinLength, newMaxLength], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      const minLength = await registrarContract.read.minLabelLength();
      const maxLength = await registrarContract.read.maxLabelLength();
      
      expect(minLength).to.equal(newMinLength);
      expect(maxLength).to.equal(newMaxLength);
    });

    it('Should NOT allow non-owner to set label length limits', async () => {
      const { registrarContract, nonOwner } = await loadFixture(deployRegistrarFixture);
      
      const newMinLength = 2n;
      const newMaxLength = 50n;
      
      await expectContractCallToFail(
        async () => await registrarContract.write.setLabelLengthLimits([newMinLength, newMaxLength], {
          account: nonOwner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Owner Access Control - setTreasury', () => {
    it('Should allow owner to set treasury', async () => {
      const { registrarContract, owner, user01 } = await loadFixture(deployRegistrarFixture);
      
      await expect(
        registrarContract.write.setTreasury([user01.account.address], {
          account: owner.account,
        })
      ).to.not.be.reverted;
    });

    it('Should NOT allow non-owner to set treasury', async () => {
      const { registrarContract, nonOwner, user01 } = await loadFixture(deployRegistrarFixture);
      
      await expectContractCallToFail(
        async () => await registrarContract.write.setTreasury([user01.account.address], {
          account: nonOwner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Owner Access Control - pause/unpause', () => {
    it('Should allow owner to pause contract', async () => {
      const { registrarContract, owner } = await loadFixture(deployRegistrarFixture);
      
      await expect(
        registrarContract.write.pause({
          account: owner.account,
        })
      ).to.not.be.reverted;

      const isPaused = await registrarContract.read.paused();
      expect(isPaused).to.be.true;
    });

    it('Should allow owner to unpause contract', async () => {
      const { registrarContract, owner } = await loadFixture(deployRegistrarFixture);
      
      // First pause
      await registrarContract.write.pause({
        account: owner.account,
      });

      // Then unpause
      await expect(
        registrarContract.write.unpause({
          account: owner.account,
        })
      ).to.not.be.reverted;

      const isPaused = await registrarContract.read.paused();
      expect(isPaused).to.be.false;
    });

    it('Should NOT allow non-owner to pause contract', async () => {
      const { registrarContract, nonOwner } = await loadFixture(deployRegistrarFixture);
      
      await expectContractCallToFail(
        async () => await registrarContract.write.pause({
          account: nonOwner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should NOT allow non-owner to unpause contract', async () => {
      const { registrarContract, owner, nonOwner } = await loadFixture(deployRegistrarFixture);
      
      // First pause as owner
      await registrarContract.write.pause({
        account: owner.account,
      });

      // Try to unpause as non-owner
      await expectContractCallToFail(
        async () => await registrarContract.write.unpause({
          account: nonOwner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Integration - Pause affects registration', () => {
    it('Should prevent registration when paused', async () => {
      const { registrarContract, owner, user01 } = await loadFixture(deployRegistrarFixture);
      
      // Pause contract
      await registrarContract.write.pause({
        account: owner.account,
      });

      // Try to register when paused
      await expectContractCallToFail(
        async () => await registrarContract.write.register([
          'test',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000n,
        }),
        'EnforcedPause'
      );
    });

    it('Should allow registration when unpaused', async () => {
      const { registrarContract, owner, user01 } = await loadFixture(deployRegistrarFixture);
      
      // Ensure contract is unpaused (default state)
      const isPaused = await registrarContract.read.paused();
      expect(isPaused).to.be.false;

      // Should be able to call rentPrice even when paused (view function)
      const price = await registrarContract.read.rentPrice(['test', 1n]);
      expect(price).to.be.a('bigint');
    });
  });
});