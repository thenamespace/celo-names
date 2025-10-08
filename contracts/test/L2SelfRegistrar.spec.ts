import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { namehash, zeroAddress } from 'viem';
import {
  PARENT_ENS,
  PARENT_NODE,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  METADATA_URI,
} from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import type { MockedSelfRegistrar$Type } from '../artifacts/contracts/test/MockedSelfRegistrar.sol/MockedSelfRegistrar';

describe('L2SelfRegistrar', () => {
  const deploySelfRegistrarFixture = async () => {
    const [owner, user01, user02] = await viem.getWalletClients();

    // Deploy L2Registry first
    const registry: GetContractReturnType<L2Registry$Type['abi']> =
      await viem.deployContract('L2Registry', [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        PARENT_ENS,
        PARENT_NODE,
        METADATA_URI,
      ]);

    // Deploy MockIdentityHub
    const mockHub = await viem.deployContract('MockIdentityHub', []);

    // Deploy MockedSelfRegistrar
    const selfRegistrar: GetContractReturnType<MockedSelfRegistrar$Type['abi']> =
      await viem.deployContract('MockedSelfRegistrar', [
        mockHub.address, // identityVerificationHubV2Address (mock)
        'test-scope', // scopeSeed
        registry.address, // registry address
      ]);

    // Set MockedSelfRegistrar as a registrar in the registry
    await registry.write.setRegistrar([selfRegistrar.address, true], {
      account: owner.account,
    });

    // Set max names to claim (e.g., 3 names per user)
    await selfRegistrar.write.setMaxNamesToClaim([3n], {
      account: owner.account,
    });

    return {
      selfRegistrar,
      registry,
      owner,
      user01,
      user02,
    };
  };

  describe('Verification and Claim Flow', () => {
    it('Should verify and then claim a name successfully', async () => {
      const { selfRegistrar, registry, user01 } = await loadFixture(
        deploySelfRegistrarFixture
      );

      const label = 'testuser';
      const ownerAddress = user01.account.address;

      // Create mock verification output
      const mockVerificationOutput = {
        attestationId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        userIdentifier: BigInt(ownerAddress),
        nullifier: 12345n,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as const,
        issuingState: 'US',
        name: ['John', 'Doe'] as const,
        idNumber: 'PASSPORT123456',
        dateOfBirth: '1990-01-01',
        sex: 'M',
        nationality: 'US',
        ofac: [false, false, false] as const,
        gender: 'M',
        expiryDate: '2030-01-01',
        olderThan: 18n,
      };

      // Convert label to bytes for userData
      const userData = Buffer.from(label, 'utf-8');
      const userDataHex = `0x${userData.toString('hex')}` as `0x${string}`;

      // Step 1: Verify by calling the mock verification hook
      await selfRegistrar.write.mockCustomVerificationHook(
        [mockVerificationOutput, userDataHex],
        {
          account: user01.account,
        }
      );

      // Step 2: Claim the verified name
      const tx = await selfRegistrar.write.claim([label, ownerAddress, []], {
        account: user01.account,
      });

      // Verify the name was registered in the registry
      const fullName = `${label}.${PARENT_ENS}`;
      const nodeHash = namehash(fullName);
      const nftOwner = await registry.read.ownerOf([BigInt(nodeHash)]);
      
      expect(nftOwner.toLowerCase()).to.equal(ownerAddress.toLowerCase());

      // Verify the NameClaimed event was emitted
      const client = await viem.getPublicClient();
      const receipt = await client.getTransactionReceipt({ hash: tx });
      const eventLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === selfRegistrar.address.toLowerCase()
      );
      expect(eventLog).to.not.be.undefined;

      // Verify expiry was set (should be ~1 year from now)
      const actualExpiry = await registry.read.expiries([nodeHash]);
      const currentBlock = await client.getBlock();
      const expectedExpiry = currentBlock.timestamp + 31536000n; // 1 year
      expect(actualExpiry).to.be.closeTo(expectedExpiry, 100n);
    });
  });
});

