import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { namehash } from 'viem';
import {
  PARENT_ENS,
  PARENT_NODE,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  METADATA_URI,
} from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { expectContractCallToFail, ERRORS } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import type { MockedSelfRegistrar$Type } from '../artifacts/contracts/test/MockedSelfRegistrar.sol/MockedSelfRegistrar';
import type { RegistrarStorage$Type } from '../artifacts/contracts/RegistrarStorage.sol/RegistrarStorage';

describe('L2SelfRegistrar - Claims', () => {
  const MAX_CLAIMS_PER_USER = 3n;

  const deploySelfRegistrarFixture = async () => {
    const [owner, user01, user02, user03] = await viem.getWalletClients();

    // Deploy L2Registry
    const registry: GetContractReturnType<L2Registry$Type['abi']> =
      await viem.deployContract('L2Registry', [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        PARENT_ENS,
        PARENT_NODE,
        METADATA_URI,
      ]);

    // Deploy SelfStorage
    const storage: GetContractReturnType<RegistrarStorage$Type['abi']> =
      await viem.deployContract('RegistrarStorage', []);

    // Deploy MockIdentityHub
    const mockHub = await viem.deployContract('MockIdentityHub', []);

    // Deploy MockedSelfRegistrar
    const selfRegistrar: GetContractReturnType<MockedSelfRegistrar$Type['abi']> =
      await viem.deployContract('MockedSelfRegistrar', [
        mockHub.address,
        'test-scope',
        registry.address,
        storage.address,
      ]);

    // Set MockedSelfRegistrar as a registrar in the registry
    await registry.write.setRegistrar([selfRegistrar.address, true], {
      account: owner.account,
    });

    // Set MockedSelfRegistrar as a registrar in SelfStorage
    await storage.write.setRegistrar([selfRegistrar.address, true], {
      account: owner.account,
    });

    // Set max names to claim (default is 1)
    await selfRegistrar.write.setMaximumClaim([MAX_CLAIMS_PER_USER], {
      account: owner.account,
    });

    return {
      selfRegistrar,
      registry,
      storage,
      owner,
      user01,
      user02,
      user03,
    };
  };

  /**
   * Helper function to verify a user
   */
  const verifyUser = async (
    selfRegistrar: any,
    userAddress: string,
    nullifier: bigint
  ) => {
    const mockVerificationOutput = {
      attestationId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      userIdentifier: BigInt(userAddress),
      nullifier: nullifier,
      forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as const,
      issuingState: 'US',
      name: ['John', 'Doe'] as const,
      idNumber: `PASSPORT${nullifier}`,
      dateOfBirth: '1990-01-01',
      sex: 'M',
      nationality: 'US',
      ofac: [false, false, false] as const,
      gender: 'M',
      expiryDate: '2030-01-01',
      olderThan: 18n,
    };

    const userData = Buffer.from('', 'utf-8');
    const userDataHex = `0x${userData.toString('hex')}` as `0x${string}`;

    await selfRegistrar.write.mockCustomVerificationHook([
      mockVerificationOutput,
      userDataHex,
    ]);
  };

  describe('Verification Required', () => {
    it('Should allow claiming a name after verification', async () => {
      const { selfRegistrar, registry, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const label = 'testuser';
      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 12345n);

      // Claim should succeed
      await expect(
        selfRegistrar.write.claim([label, ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;

      // Verify the name was registered
      const fullName = `${label}.${PARENT_ENS}`;
      const nodeHash = namehash(fullName);
      const nftOwner = await registry.read.ownerOf([BigInt(nodeHash)]);

      expect(nftOwner.toLowerCase()).to.equal(ownerAddress.toLowerCase());
    });

    it('Should prevent claiming a name without verification', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const label = 'unverified';
      const ownerAddress = user01.account.address;

      // Attempt to claim without verification should fail
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim([label, ownerAddress, []], {
            account: user01.account,
          }),
        ERRORS.NOT_SELF_VERIFIED
      );
    });
  });

  describe('Maximum Claims Limit', () => {
    it('Should allow claiming up to maximum claims limit', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 22222n);

      // Claim first name (should succeed)
      await expect(
        selfRegistrar.write.claim(['name1', ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;

      // Claim second name (should succeed)
      await expect(
        selfRegistrar.write.claim(['name2', ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;

      // Claim third name (should succeed - this is the max)
      await expect(
        selfRegistrar.write.claim(['name3', ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;
    });

    it('Should prevent claiming more than maximum claims limit', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 33333n);

      // Claim three names successfully
      await selfRegistrar.write.claim(['claim1', ownerAddress, []], {
        account: user01.account,
      });
      await selfRegistrar.write.claim(['claim2', ownerAddress, []], {
        account: user01.account,
      });
      await selfRegistrar.write.claim(['claim3', ownerAddress, []], {
        account: user01.account,
      });

      // Fourth claim should fail
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim(['claim4', ownerAddress, []], {
            account: user01.account,
          }),
        ERRORS.MAXIMUM_NAMES_CLAIMED
      );
    });

    it('Should track claims independently for different users', async () => {
      const { selfRegistrar, user01, user02 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const user01Address = user01.account.address;
      const user02Address = user02.account.address;

      // Verify both users
      await verifyUser(selfRegistrar, user01Address, 44444n);
      await verifyUser(selfRegistrar, user02Address, 55555n);

      // User01 claims 3 names
      await selfRegistrar.write.claim(['user1name1', user01Address, []], {
        account: user01.account,
      });
      await selfRegistrar.write.claim(['user1name2', user01Address, []], {
        account: user01.account,
      });
      await selfRegistrar.write.claim(['user1name3', user01Address, []], {
        account: user01.account,
      });

      // User01 should not be able to claim more
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim(['user1name4', user01Address, []], {
            account: user01.account,
          }),
        ERRORS.MAXIMUM_NAMES_CLAIMED
      );

      // User02 should still be able to claim (independent limit)
      await expect(
        selfRegistrar.write.claim(['user2name1', user02Address, []], {
          account: user02.account,
        })
      ).to.not.be.reverted;
    });
  });

  describe('Label Validation', () => {
    it('Should reject labels that are too short', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 66666n);

      // 2 characters - should fail (minimum is 3)
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim(['ab', ownerAddress, []], {
            account: user01.account,
          }),
        ERRORS.INVALID_LABEL
      );

      // 1 character - should fail
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim(['a', ownerAddress, []], {
            account: user01.account,
          }),
        ERRORS.INVALID_LABEL
      );
    });

    it('Should reject labels that are too long', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 77777n);

      // 65 characters - should fail (maximum is 64)
      const tooLongLabel = 'a'.repeat(65);
      await expectContractCallToFail(
        () =>
          selfRegistrar.write.claim([tooLongLabel, ownerAddress, []], {
            account: user01.account,
          }),
        ERRORS.INVALID_LABEL
      );
    });

    it('Should accept labels with valid length', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 88888n);

      // 3 characters - minimum valid length
      await expect(
        selfRegistrar.write.claim(['abc', ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;
    });

    it('Should accept labels at maximum valid length', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 99999n);

      // 64 characters - maximum valid length
      const maxLengthLabel = 'a'.repeat(64);
      await expect(
        selfRegistrar.write.claim([maxLengthLabel, ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;
    });
  });

  describe('Name Expiry', () => {
    it('Should set name expiry to approximately 1 year from claim time', async () => {
      const { selfRegistrar, registry, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const label = 'expirytest';
      const ownerAddress = user01.account.address;

      // Verify the user
      await verifyUser(selfRegistrar, ownerAddress, 111000n);

      const client = await viem.getPublicClient();

      // Get timestamp before claim
      const blockBefore = await client.getBlock();
      const timeBefore = blockBefore.timestamp;

      // Claim the name
      await selfRegistrar.write.claim([label, ownerAddress, []], {
        account: user01.account,
      });

      // Check expiry
      const fullName = `${label}.${PARENT_ENS}`;
      const nodeHash = namehash(fullName);
      const actualExpiry = await registry.read.expiries([nodeHash]);

      // Expiry should be approximately 1 year (31536000 seconds) from now
      const expectedExpiry = timeBefore + 31536000n;
      
      // Allow 100 second tolerance for block time
      expect(actualExpiry).to.be.closeTo(expectedExpiry, 100n);
    });
  });

  describe('Owner Parameter', () => {
    it('Should allow claiming name to a different address than caller', async () => {
      const { selfRegistrar, registry, user01, user02 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const label = 'giftname';
      const callerAddress = user01.account.address;
      const ownerAddress = user02.account.address;

      // Verify user01 (the caller)
      await verifyUser(selfRegistrar, callerAddress, 222000n);

      // User01 claims a name for user02
      await expect(
        selfRegistrar.write.claim([label, ownerAddress, []], {
          account: user01.account,
        })
      ).to.not.be.reverted;

      // Verify user02 owns the NFT (not user01)
      const fullName = `${label}.${PARENT_ENS}`;
      const nodeHash = namehash(fullName);
      const nftOwner = await registry.read.ownerOf([BigInt(nodeHash)]);

      expect(nftOwner.toLowerCase()).to.equal(ownerAddress.toLowerCase());
      expect(nftOwner.toLowerCase()).to.not.equal(callerAddress.toLowerCase());
    });
  });

  describe('Double Verification Prevention', () => {
    it('Should prevent same user from verifying twice', async () => {
      const { selfRegistrar, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const ownerAddress = user01.account.address;

      // First verification should succeed
      await verifyUser(selfRegistrar, ownerAddress, 444000n);

      // Second verification with different nullifier should fail (user already verified)
      const mockVerificationOutput = {
        attestationId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        userIdentifier: BigInt(ownerAddress),
        nullifier: 555000n,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as const,
        issuingState: 'US',
        name: ['Jane', 'Smith'] as const,
        idNumber: 'PASSPORT555000',
        dateOfBirth: '1992-01-01',
        sex: 'F',
        nationality: 'US',
        ofac: [false, false, false] as const,
        gender: 'F',
        expiryDate: '2030-01-01',
        olderThan: 18n,
      };

      const userData = Buffer.from('', 'utf-8');
      const userDataHex = `0x${userData.toString('hex')}` as `0x${string}`;

      await expectContractCallToFail(
        () =>
          selfRegistrar.write.mockCustomVerificationHook([
            mockVerificationOutput,
            userDataHex,
          ]),
        ERRORS.VERIFICATION_CLAIMED
      );
    });

    it('Should prevent reusing the same nullifier', async () => {
      const { selfRegistrar, user01, user02 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const user01Address = user01.account.address;
      const user02Address = user02.account.address;

      // First user verifies with nullifier
      await verifyUser(selfRegistrar, user01Address, 666000n);

      // Second user tries to verify with same nullifier - should fail
      const mockVerificationOutput = {
        attestationId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        userIdentifier: BigInt(user02Address),
        nullifier: 666000n, // Same nullifier
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as const,
        issuingState: 'US',
        name: ['Bob', 'Jones'] as const,
        idNumber: 'PASSPORT666000',
        dateOfBirth: '1993-01-01',
        sex: 'M',
        nationality: 'US',
        ofac: [false, false, false] as const,
        gender: 'M',
        expiryDate: '2030-01-01',
        olderThan: 18n,
      };

      const userData = Buffer.from('', 'utf-8');
      const userDataHex = `0x${userData.toString('hex')}` as `0x${string}`;

      await expectContractCallToFail(
        () =>
          selfRegistrar.write.mockCustomVerificationHook([
            mockVerificationOutput,
            userDataHex,
          ]),
        ERRORS.VERIFICATION_CLAIMED
      );
    });
  });
});

