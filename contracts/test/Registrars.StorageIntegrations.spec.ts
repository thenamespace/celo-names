import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';

import { 
  TOKEN_NAME, 
  TOKEN_SYMBOL, 
  PARENT_ENS, 
  PARENT_NODE, 
  METADATA_URI,
  DEFAULT_REGISTRAR_CONFIG,
  ETH_PRICE_DECIMALS_DOLLARS,
  createMockVerificationOutput
} from './vars';
import { labelhash } from 'viem';

describe('Registrars - Storage Integrations', () => {
  const deployIntegrationFixture = async () => {
    const [owner, user01, user02, user03, treasury] = await viem.getWalletClients();

    // Deploy RegistrarStorage
    const storage = await viem.deployContract('RegistrarStorage', []);

    // Deploy L2Registry
    const registry = await viem.deployContract('L2Registry', [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      PARENT_ENS,
      PARENT_NODE,
      METADATA_URI
    ]);

    // Deploy mock USD oracle
    const mockOracle = await viem.deployContract('MockedUsdOracle', [
      ETH_PRICE_DECIMALS_DOLLARS,
    ]);

    // Deploy L2Registrar
    const registrar = await viem.deployContract('L2Registrar', [
      registry.address,
      mockOracle.address, // Mock oracle
      treasury.account.address,
      storage.address, // RegistrarStorage address
      DEFAULT_REGISTRAR_CONFIG
    ]);

    // Deploy MockIdentityHub
    const mockHub = await viem.deployContract('MockIdentityHub', []);

    // Deploy MockedSelfRegistrar
    const selfRegistrar = await viem.deployContract('MockedSelfRegistrar', [
      mockHub.address, // Mock Self hub
      'test-scope',
      registry.address,
      storage.address
    ]);

    // Set up permissions
    await registry.write.setRegistrar([registrar.address, true], {
      account: owner.account,
    });

    await registry.write.setRegistrar([selfRegistrar.address, true], {
      account: owner.account,
    });

    await storage.write.setRegistrar([registrar.address, true], {
      account: owner.account,
    });

    await storage.write.setRegistrar([selfRegistrar.address, true], {
      account: owner.account,
    });

    return {
      storage,
      registry,
      registrar,
      selfRegistrar,
      owner,
      user01,
      user02,
      user03,
      treasury,
    };
  };

  describe('Blacklist Integration', () => {
    it('Should prevent registration of blacklisted names via L2Registrar', async () => {
      const { storage, registrar, user01, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Blacklist some names
      const blacklistedLabels = [labelhash('admin'), labelhash('test')];
      await storage.write.setBlacklist([
        blacklistedLabels,
        true,
        false
      ], {
        account: owner.account,
      });

      // Try to register blacklisted name - should fail
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'admin',
            1n, // 1 year
            user01.account.address,
            []
          ], {
            account: user01.account,
            value: 1000000000000000000n, // 1 ETH
          }),
        ERRORS.BLACKLISTED_NAME
      );

      // Try to register another blacklisted name - should fail
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'test',
            1n,
            user01.account.address,
            []
          ], {
            account: user01.account,
            value: 1000000000000000000n,
          }),
        ERRORS.BLACKLISTED_NAME
      );

      // Try to register non-blacklisted name - should succeed
      await expect(
        registrar.write.register([
          'validname',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;
    });

    it('Should prevent claiming of blacklisted names via L2SelfRegistrar', async () => {
      const { storage, selfRegistrar, user01, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Mock verification for user01
      const mockOutput = createMockVerificationOutput(
        user01.account.address,
        123456n
      );
      await selfRegistrar.write.mockCustomVerificationHook([
        mockOutput,
        '0x' // Empty userData
      ], {
        account: user01.account,
      });

      // Blacklist some names
      const blacklistedLabels = [labelhash('admin'), labelhash('test')];
      await storage.write.setBlacklist([
        blacklistedLabels,
        true,
        false
      ], {
        account: owner.account,
      });

      // Try to claim blacklisted name - should fail
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim([
            'admin',
            user01.account.address,
            []
          ], {
            account: user01.account,
          }),
        ERRORS.BLACKLISTED_NAME
      );

      // Try to claim another blacklisted name - should fail
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim([
            'test',
            user01.account.address,
            []
          ], {
            account: user01.account,
          }),
        ERRORS.BLACKLISTED_NAME
      );

      // Try to claim non-blacklisted name - should succeed
      await expect(
        selfRegistrar.write.claim([
          'validname',
          user01.account.address,
          []
        ], {
          account: user01.account,
        })
      ).to.not.be.reverted;
    });
  });

  describe('Whitelist Integration', () => {
    it('Should allow registration when whitelist is disabled', async () => {
      const { storage, registrar, user01, user02 } = await loadFixture(
        deployIntegrationFixture
      );

      // Ensure whitelist is disabled (default state)
      const isEnabled = await storage.read.whitelistEnabled();
      expect(isEnabled).to.be.false;

      // Both users should be able to register
      await expect(
        registrar.write.register([
          'user1name',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;

      await expect(
        registrar.write.register([
          'user2name',
          1n,
          user02.account.address,
          []
        ], {
          account: user02.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;
    });

    it('Should restrict registration when whitelist is enabled', async () => {
      const { storage, registrar, user01, user02, user03, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Enable whitelist
      await storage.write.setWhitelistEnabled([true], {
        account: owner.account,
      });

      // Add user01 and user02 to whitelist
      await storage.write.setWhitelist([
        [user01.account.address, user02.account.address],
        true,
        false
      ], {
        account: owner.account,
      });

      // user01 should be able to register (whitelisted)
      await expect(
        registrar.write.register([
          'user1name',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;

      // user02 should be able to register (whitelisted)
      await expect(
        registrar.write.register([
          'user2name',
          1n,
          user02.account.address,
          []
        ], {
          account: user02.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;

      // user03 should not be able to register (not whitelisted)
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'user3name',
            1n,
            user03.account.address,
            []
          ], {
            account: user03.account,
            value: 1000000000000000000n,
          }),
        ERRORS.NOT_WHITELISTED
      );
    });

    it('Should restrict claiming when whitelist is enabled', async () => {
      const { storage, selfRegistrar, user01, user02, user03, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Enable whitelist
      await storage.write.setWhitelistEnabled([true], {
        account: owner.account,
      });

      // Add user01 and user02 to whitelist
      await storage.write.setWhitelist([
        [user01.account.address, user02.account.address],
        true,
        false
      ], {
        account: owner.account,
      });

      // Mock verification for all users
      const mockOutput1 = createMockVerificationOutput(
        user01.account.address,
        111111n
      );
      await selfRegistrar.write.mockCustomVerificationHook([
        mockOutput1,
        '0x'
      ], {
        account: user01.account,
      });

      const mockOutput2 = createMockVerificationOutput(
        user02.account.address,
        222222n,
        ['Jane', 'Smith'] as const
      );
      await selfRegistrar.write.mockCustomVerificationHook([
        mockOutput2,
        '0x'
      ], {
        account: user02.account,
      });

      const mockOutput3 = createMockVerificationOutput(
        user03.account.address,
        333333n,
        ['Bob', 'Johnson'] as const
      );
      await selfRegistrar.write.mockCustomVerificationHook([
        mockOutput3,
        '0x'
      ], {
        account: user03.account,
      });

      // user01 should be able to claim (whitelisted)
      await expect(
        selfRegistrar.write.claim([
          'user1name',
          user01.account.address,
          []
        ], {
          account: user01.account,
        })
      ).to.not.be.reverted;

      // user02 should be able to claim (whitelisted)
      await expect(
        selfRegistrar.write.claim([
          'user2name',
          user02.account.address,
          []
        ], {
          account: user02.account,
        })
      ).to.not.be.reverted;

      // user03 should not be able to claim (not whitelisted)
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim([
            'user3name',
            user03.account.address,
            []
          ], {
            account: user03.account,
          }),
        ERRORS.NOT_WHITELISTED
      );
    });
  });

  describe('Combined Blacklist and Whitelist Integration', () => {
    it('Should enforce both blacklist and whitelist restrictions', async () => {
      const { storage, registrar, user01, user02, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Enable whitelist and add user01
      await storage.write.setWhitelistEnabled([true], {
        account: owner.account,
      });
      await storage.write.setWhitelist([
        [user01.account.address],
        true,
        false
      ], {
        account: owner.account,
      });

      // Blacklist some names
      const blacklistedLabels = [labelhash('admin'), labelhash('test')];
      await storage.write.setBlacklist([
        blacklistedLabels,
        true,
        false
      ], {
        account: owner.account,
      });

      // user01 should not be able to register blacklisted name (even though whitelisted)
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'admin',
            1n,
            user01.account.address,
            []
          ], {
            account: user01.account,
            value: 1000000000000000000n,
          }),
        ERRORS.BLACKLISTED_NAME
      );

      // user01 should be able to register non-blacklisted name (whitelisted)
      await expect(
        registrar.write.register([
          'validname',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;

      // user02 should not be able to register any name (not whitelisted)
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'validname2',
            1n,
            user02.account.address,
            []
          ], {
            account: user02.account,
            value: 1000000000000000000n,
          }),
        ERRORS.NOT_WHITELISTED
      );
    });
  });

  describe('Storage State Persistence', () => {
    it('Should maintain blacklist state across registrar calls', async () => {
      const { storage, registrar, user01, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Blacklist a name
      const blacklistedLabels = [labelhash('persistent')];
      await storage.write.setBlacklist([
        blacklistedLabels,
        true,
        false
      ], {
        account: owner.account,
      });

      // Verify blacklist is active
      const isBlacklisted = await storage.read.isBlacklisted(['persistent']);
      expect(isBlacklisted).to.be.true;

      // Try to register - should fail
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'persistent',
            1n,
            user01.account.address,
            []
          ], {
            account: user01.account,
            value: 1000000000000000000n,
          }),
        ERRORS.BLACKLISTED_NAME
      );

      // Remove from blacklist
      await storage.write.setBlacklist([
        blacklistedLabels,
        false,
        false
      ], {
        account: owner.account,
      });

      // Verify blacklist is removed
      const isBlacklistedAfter = await storage.read.isBlacklisted(['persistent']);
      expect(isBlacklistedAfter).to.be.false;

      // Now should be able to register
      await expect(
        registrar.write.register([
          'persistent',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;
    });

    it('Should maintain whitelist state across registrar calls', async () => {
      const { storage, registrar, user01, user02, owner } = await loadFixture(
        deployIntegrationFixture
      );

      // Enable whitelist and add user01
      await storage.write.setWhitelistEnabled([true], {
        account: owner.account,
      });
      await storage.write.setWhitelist([
        [user01.account.address],
        true,
        false
      ], {
        account: owner.account,
      });

      // user01 should be able to register
      await expect(
        registrar.write.register([
          'user1name',
          1n,
          user01.account.address,
          []
        ], {
          account: user01.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;

      // user02 should not be able to register
      await expectContractCallToFail(
        () =>
          registrar.write.register([
            'user2name',
            1n,
            user02.account.address,
            []
          ], {
            account: user02.account,
            value: 1000000000000000000n,
          }),
        ERRORS.NOT_WHITELISTED
      );

      // Add user02 to whitelist
      await storage.write.setWhitelist([
        [user02.account.address],
        true,
        false
      ], {
        account: owner.account,
      });

      // Now user02 should be able to register
      await expect(
        registrar.write.register([
          'user2name',
          1n,
          user02.account.address,
          []
        ], {
          account: user02.account,
          value: 1000000000000000000n,
        })
      ).to.not.be.reverted;
    });
  });
});
