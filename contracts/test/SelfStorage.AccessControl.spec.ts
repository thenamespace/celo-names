import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { SelfStorage$Type } from '../artifacts/contracts/SelfStorage.sol/SelfStorage';
import { keccak256, namehash, toBytes } from 'viem';

describe('SelfStorage - Access Control', () => {
  const deploySelfStorageFixture = async () => {
    const [owner, registrar, user01, user02] = await viem.getWalletClients();

    const selfStorage: GetContractReturnType<SelfStorage$Type['abi']> =
      await viem.deployContract('SelfStorage', []);

    // Set registrar
    await selfStorage.write.setRegistrar([registrar.account.address, true], {
      account: owner.account,
    });

    return {
      selfStorage,
      owner,
      registrar,
      user01,
      user02,
    };
  };

  describe('Owner Access Control', () => {
    it('Should allow only owner to set registrar', async () => {
      const { selfStorage, owner, user01, user02 } = await loadFixture(
        deploySelfStorageFixture
      );

      // Owner should be able to set registrar
      await expect(
        selfStorage.write.setRegistrar([user01.account.address, true], {
          account: owner.account,
        })
      ).to.not.be.reverted;

      // Verify registrar was set
      const isRegistrar = await selfStorage.read.isAuthorizedRegistrar([
        user01.account.address,
      ]);
      expect(isRegistrar).to.be.true;

      // Non-owner should not be able to set registrar
      await expectContractCallToFail(
        () =>
          selfStorage.write.setRegistrar([user02.account.address, true], {
            account: user01.account,
          }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should allow only owner to delete verification', async () => {
      const { selfStorage, owner, registrar, user01, user02 } =
        await loadFixture(deploySelfStorageFixture);

      const verificationId = 123456n;

      // Set verification first
      await selfStorage.write.setVerificationId(
        [user01.account.address, verificationId],
        { account: registrar.account }
      );

      // Owner should be able to delete verification
      await expect(
        selfStorage.write.deleteVerification(
          [user01.account.address, verificationId],
          { account: owner.account }
        )
      ).to.not.be.reverted;

      // Verify verification was deleted
      const storedId = await selfStorage.read.verificationIds([
        user01.account.address,
      ]);
      expect(storedId).to.equal(0n);

      // Non-owner should not be able to delete verification
      await expectContractCallToFail(
        () =>
          selfStorage.write.deleteVerification(
            [user01.account.address, verificationId],
            { account: user02.account }
          ),
        ERRORS.OWNER_ONLY
      );
    });
  });

  describe('Registrar Access Control', () => {
    it('Should allow only registrar to set verification ID', async () => {
      const { selfStorage, registrar, user01, user02 } = await loadFixture(
        deploySelfStorageFixture
      );

      const verificationId = 123456n;

      // Registrar should be able to set verification ID
      await expect(
        selfStorage.write.setVerificationId(
          [user01.account.address, verificationId],
          { account: registrar.account }
        )
      ).to.not.be.reverted;

      // Verify the ID was set
      const storedId = await selfStorage.read.verificationIds([
        user01.account.address,
      ]);
      expect(storedId).to.equal(verificationId);

      // Non-registrar should not be able to set verification ID
      await expectContractCallToFail(
        () =>
          selfStorage.write.setVerificationId(
            [user02.account.address, 789012n],
            { account: user01.account }
          ),
        'NotRegistrar'
      );
    });

    it('Should allow only registrar to claim names', async () => {
      const { selfStorage, registrar, user01, user02 } = await loadFixture(
        deploySelfStorageFixture
      );

      const namehash = keccak256(toBytes('test.eth'));

      // Registrar should be able to claim
      await expect(
        selfStorage.write.claim([user01.account.address, namehash], {
          account: registrar.account,
        })
      ).to.not.be.reverted;

      // Verify claim count was incremented
      const claimCount = await selfStorage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(1n);

      // Verify name was marked as claimed
      const isNameClaimed = await selfStorage.read.names([namehash]);
      expect(isNameClaimed).to.be.true;

      // Non-registrar should not be able to claim
      await expectContractCallToFail(
        () =>
          selfStorage.write.claim([user02.account.address, namehash], {
            account: user01.account,
          }),
        'NotRegistrar'
      );
    });
  });

  describe('Verification ID Functionality', () => {
    it('Should prevent claiming the same verification ID twice', async () => {
      const { selfStorage, registrar, user01, user02 } = await loadFixture(
        deploySelfStorageFixture
      );

      const verificationId = 999888n;

      // First claim should succeed
      await expect(
        selfStorage.write.setVerificationId(
          [user01.account.address, verificationId],
          { account: registrar.account }
        )
      ).to.not.be.reverted;

      // Second claim with same verification ID should fail
      await expectContractCallToFail(
        () =>
          selfStorage.write.setVerificationId(
            [user02.account.address, verificationId],
            { account: registrar.account }
          ),
        'VerificationIdClaimed'
      );
    });

    it('Should correctly track verification status with isVerified', async () => {
      const { selfStorage, registrar, user01, user02 } = await loadFixture(
        deploySelfStorageFixture
      );

      // User01 should not be verified initially
      let isVerified = await selfStorage.read.isVerified([user01.account.address]);
      expect(isVerified).to.be.false;

      // Set verification ID
      const verificationId = 111222n;
      await selfStorage.write.setVerificationId(
        [user01.account.address, verificationId],
        { account: registrar.account }
      );

      // User01 should now be verified
      isVerified = await selfStorage.read.isVerified([user01.account.address]);
      expect(isVerified).to.be.true;

      // User02 should still not be verified
      isVerified = await selfStorage.read.isVerified([user02.account.address]);
      expect(isVerified).to.be.false;
    });

    it('Should correctly track claimed verification IDs', async () => {
      const { selfStorage, registrar, user01 } = await loadFixture(
        deploySelfStorageFixture
      );

      const verificationId = 333444n;

      // Verification ID should not be claimed initially
      let isClaimed = await selfStorage.read.claimedVerifications([verificationId]);
      expect(isClaimed).to.be.false;

      // Set verification ID
      await selfStorage.write.setVerificationId(
        [user01.account.address, verificationId],
        { account: registrar.account }
      );

      // Verification ID should now be claimed
      isClaimed = await selfStorage.read.claimedVerifications([verificationId]);
      expect(isClaimed).to.be.true;
    });
  });

  describe('Claim Functionality', () => {
    it('Should increment claim count for each claim', async () => {
      const { selfStorage, registrar, user01 } = await loadFixture(
        deploySelfStorageFixture
      );

      const namehash1 = namehash('name1.eth');
      const namehash2 = namehash('name2.eth');
      const namehash3 = namehash('name3.eth');

      // Initial count should be 0
      let claimCount = await selfStorage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(0n);

      // First claim
      await selfStorage.write.claim([user01.account.address, namehash1], {
        account: registrar.account,
      });
      claimCount = await selfStorage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(1n);

      // Second claim
      await selfStorage.write.claim([user01.account.address, namehash2], {
        account: registrar.account,
      });
      claimCount = await selfStorage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(2n);

      // Third claim
      await selfStorage.write.claim([user01.account.address, namehash3], {
        account: registrar.account,
      });
      claimCount = await selfStorage.read.claimed([user01.account.address]);
      expect(claimCount).to.equal(3n);
    });

    it('Should track claimed names correctly', async () => {
      const { selfStorage, registrar, user01 } = await loadFixture(
        deploySelfStorageFixture
      );

      const namehash1 = keccak256(toBytes('claimed.eth'));
      const namehash2 = keccak256(toBytes('notclaimed.eth'));

      // Names should not be claimed initially
      let isClaimed1 = await selfStorage.read.names([namehash1]);
      let isClaimed2 = await selfStorage.read.names([namehash2]);
      expect(isClaimed1).to.be.false;
      expect(isClaimed2).to.be.false;

      // Claim first name
      await selfStorage.write.claim([user01.account.address, namehash1], {
        account: registrar.account,
      });

      // First name should be claimed, second should not
      isClaimed1 = await selfStorage.read.names([namehash1]);
      isClaimed2 = await selfStorage.read.names([namehash2]);
      expect(isClaimed1).to.be.true;
      expect(isClaimed2).to.be.false;
    });

    it('Should track claims for different users independently', async () => {
      const { selfStorage, registrar, user01, user02 } = await loadFixture(
        deploySelfStorageFixture
      );

      const namehash1 = keccak256(toBytes('user1name.eth'));
      const namehash2 = keccak256(toBytes('user2name.eth'));

      // Claim for user01
      await selfStorage.write.claim([user01.account.address, namehash1], {
        account: registrar.account,
      });

      // Claim for user02
      await selfStorage.write.claim([user02.account.address, namehash2], {
        account: registrar.account,
      });

      // Each user should have 1 claim
      const user01Claims = await selfStorage.read.claimed([user01.account.address]);
      const user02Claims = await selfStorage.read.claimed([user02.account.address]);
      expect(user01Claims).to.equal(1n);
      expect(user02Claims).to.equal(1n);
    });
  });
});

