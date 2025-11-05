import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { RegistrarStorage$Type } from '../artifacts/contracts/RegistrarStorage.sol/RegistrarStorage';
import { keccak256, namehash, toBytes } from 'viem';

describe('RegistrarStorage - Access Control', () => {
  const deploystorageFixture = async () => {
    const [owner, registrar, user01, user02] = await viem.getWalletClients();

    const storage: GetContractReturnType<RegistrarStorage$Type['abi']> =
      await viem.deployContract('RegistrarStorage', []);

    // Set registrar
    await storage.write.setRegistrar([registrar.account.address, true], {
      account: owner.account,
    });

    return {
      storage,
      owner,
      registrar,
      user01,
      user02,
    };
  };

  describe('Owner Access Control', () => {
    it('Should allow only owner to set registrar', async () => {
      const { storage, owner, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      // Owner should be able to set registrar
      await expect(
        storage.write.setRegistrar([user01.account.address, true], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Verify registrar was set
      const isRegistrar = await storage.read.isRegistrar([
        user01.account.address,
      ]);
      expect(isRegistrar).to.be.true;

      // Non-owner should not be able to set registrar
      await expectContractCallToFail(
        () =>
          storage.write.setRegistrar([user02.account.address, true], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should allow only owner to set whitelist enabled', async () => {
      const { storage, owner, user01 } = await loadFixture(
        deploystorageFixture
      );

      // Owner should be able to enable whitelist
      await expect(
        storage.write.setWhitelistEnabled([true], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Verify whitelist is enabled
      const isEnabled = await storage.read.whitelistEnabled();
      expect(isEnabled).to.be.true;

      // Non-owner should not be able to enable whitelist
      await expectContractCallToFail(
        () =>
          storage.write.setWhitelistEnabled([false], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should allow only owner to set whitelist', async () => {
      const { storage, owner, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      // Owner should be able to set whitelist
      await expect(
        storage.write.setWhitelist([
          [user01.account.address, user02.account.address],
          true,
          false
        ], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Verify users are whitelisted
      const isWhitelisted1 = await storage.read.isWhitelisted([user01.account.address]);
      const isWhitelisted2 = await storage.read.isWhitelisted([user02.account.address]);
      expect(isWhitelisted1).to.be.true;
      expect(isWhitelisted2).to.be.true;

      // Non-owner should not be able to set whitelist
      await expectContractCallToFail(
        () =>
          storage.write.setWhitelist([
            [user01.account.address],
            false,
            false
          ], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should allow only owner to set blacklist', async () => {
      const { storage, owner, user01 } = await loadFixture(
        deploystorageFixture
      );

      const blacklistedLabels = [keccak256(toBytes('admin')), keccak256(toBytes('test'))];

      // Owner should be able to set blacklist
      await expect(
        storage.write.setBlacklist([
          blacklistedLabels,
          true,
          false
        ], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Verify labels are blacklisted
      const isBlacklisted1 = await storage.read.isBlacklisted(['admin']);
      const isBlacklisted2 = await storage.read.isBlacklisted(['test']);
      expect(isBlacklisted1).to.be.true;
      expect(isBlacklisted2).to.be.true;

      // Non-owner should not be able to set blacklist
      await expectContractCallToFail(
        () =>
          storage.write.setBlacklist([
            [keccak256(toBytes('forbidden'))],
            true,
            false
          ], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should allow only owner to delete verification', async () => {
      const { storage, owner, registrar, user01, user02 } =
        await loadFixture(deploystorageFixture);

      const verificationId = 123456n;

      // Set verification first
      await storage.write.setVerificationId(
        [user01.account.address, verificationId],
        { account: registrar.account }
      );

      // Owner should be able to delete verification
      await expect(
        storage.write.deleteVerification(
          [user01.account.address, verificationId],
          { account: owner.account }
        )
      ).to.not.be.reverted;

      // Verify verification was deleted
      const storedId = await storage.read.verificationIds([
        user01.account.address,
      ]);
      expect(storedId).to.equal(0n);

      // Non-owner should not be able to delete verification
      await expectContractCallToFail(
        () =>
          storage.write.deleteVerification(
            [user01.account.address, verificationId],
            { account: user02.account }
          ),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Registrar Access Control', () => {
    it('Should allow only registrar to set verification ID', async () => {
      const { storage, registrar, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      const verificationId = 123456n;

      // Registrar should be able to set verification ID
      await expect(
        storage.write.setVerificationId(
          [user01.account.address, verificationId],
          { account: registrar.account }
        )
      ).to.not.be.reverted;

      // Verify the ID was set
      const storedId = await storage.read.verificationIds([
        user01.account.address,
      ]);
      expect(storedId).to.equal(verificationId);

      // Non-registrar should not be able to set verification ID
      await expectContractCallToFail(
        () =>
          storage.write.setVerificationId(
            [user02.account.address, 789012n],
            { account: user01.account }
          ),
        ERRORS.REGISTRAR_ONLY
      );
    });

    it('Should allow only registrar to claim names', async () => {
      const { storage, registrar, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      const namehash = keccak256(toBytes('test.eth'));

      // Registrar should be able to claim
      await expect(
        storage.write.claim([user01.account.address, namehash], {
          account: registrar.account,
        })
      ).to.not.be.reverted;

      // Verify claim count was incremented
      const claimCount = await storage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(1n);

      // Verify name was marked as claimed
      const isNameClaimed = await storage.read.names([namehash]);
      expect(isNameClaimed).to.be.true;

      // Non-registrar should not be able to claim
      await expectContractCallToFail(
        () =>
          storage.write.claim([user02.account.address, namehash], {
            account: user01.account,
          }),
        ERRORS.REGISTRAR_ONLY
      );
    });
  });

  describe('Verification ID Functionality', () => {
    it('Should prevent claiming the same verification ID twice', async () => {
      const { storage, registrar, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      const verificationId = 999888n;

      // First claim should succeed
      await expect(
        storage.write.setVerificationId(
          [user01.account.address, verificationId],
          { account: registrar.account }
        )
      ).to.not.be.reverted;

      // Second claim with same verification ID should fail
      await expectContractCallToFail(
        () =>
          storage.write.setVerificationId(
            [user02.account.address, verificationId],
            { account: registrar.account }
          ),
        ERRORS.VERIFICATION_ID_CLAIMED
      );
    });

    it('Should correctly track verification status with isVerified', async () => {
      const { storage, registrar, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      // User01 should not be verified initially
      let isVerified = await storage.read.isVerified([user01.account.address]);
      expect(isVerified).to.be.false;

      // Set verification ID
      const verificationId = 111222n;
      await storage.write.setVerificationId(
        [user01.account.address, verificationId],
        { account: registrar.account }
      );

      // User01 should now be verified
      isVerified = await storage.read.isVerified([user01.account.address]);
      expect(isVerified).to.be.true;

      // User02 should still not be verified
      isVerified = await storage.read.isVerified([user02.account.address]);
      expect(isVerified).to.be.false;
    });

    it('Should correctly track claimed verification IDs', async () => {
      const { storage, registrar, user01 } = await loadFixture(
        deploystorageFixture
      );

      const verificationId = 333444n;

      // Verification ID should not be claimed initially
      let isClaimed = await storage.read.claimedVerifications([verificationId]);
      expect(isClaimed).to.be.false;

      // Set verification ID
      await storage.write.setVerificationId(
        [user01.account.address, verificationId],
        { account: registrar.account }
      );

      // Verification ID should now be claimed
      isClaimed = await storage.read.claimedVerifications([verificationId]);
      expect(isClaimed).to.be.true;
    });
  });

  describe('Claim Functionality', () => {
    it('Should increment claim count for each claim', async () => {
      const { storage, registrar, user01 } = await loadFixture(
        deploystorageFixture
      );

      const namehash1 = namehash('name1.eth');
      const namehash2 = namehash('name2.eth');
      const namehash3 = namehash('name3.eth');

      // Initial count should be 0
      let claimCount = await storage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(0n);

      // First claim
      await storage.write.claim([user01.account.address, namehash1], {
        account: registrar.account,
      });
      claimCount = await storage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(1n);

      // Second claim
      await storage.write.claim([user01.account.address, namehash2], {
        account: registrar.account,
      });
      claimCount = await storage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(2n);

      // Third claim
      await storage.write.claim([user01.account.address, namehash3], {
        account: registrar.account,
      });
      claimCount = await storage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(3n);
    });

    it('Should track claimed names correctly', async () => {
      const { storage, registrar, user01 } = await loadFixture(
        deploystorageFixture
      );

      const namehash1 = keccak256(toBytes('claimed.eth'));
      const namehash2 = keccak256(toBytes('notclaimed.eth'));

      // Names should not be claimed initially
      let isClaimed1 = await storage.read.names([namehash1]);
      let isClaimed2 = await storage.read.names([namehash2]);
      expect(isClaimed1).to.be.false;
      expect(isClaimed2).to.be.false;

      // Claim first name
      await storage.write.claim([user01.account.address, namehash1], {
        account: registrar.account,
      });

      // First name should be claimed, second should not
      isClaimed1 = await storage.read.names([namehash1]);
      isClaimed2 = await storage.read.names([namehash2]);
      expect(isClaimed1).to.be.true;
      expect(isClaimed2).to.be.false;
    });

    it('Should track claims for different users independently', async () => {
      const { storage, registrar, user01, user02 } = await loadFixture(
        deploystorageFixture
      );

      const namehash1 = keccak256(toBytes('user1name.eth'));
      const namehash2 = keccak256(toBytes('user2name.eth'));

      // Claim for user01
      await storage.write.claim([user01.account.address, namehash1], {
        account: registrar.account,
      });

      // Claim for user02
      await storage.write.claim([user02.account.address, namehash2], {
        account: registrar.account,
      });

      // Each user should have 1 claim
      const user01Claims = await storage.read.claimed([user01.account.address]);
      const user02Claims = await storage.read.claimed([user02.account.address]);
      expect(user01Claims).to.equal(1n);
      expect(user02Claims).to.equal(1n);
    });
  });
});

