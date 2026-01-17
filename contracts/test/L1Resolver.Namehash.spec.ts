import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L1Resolver$Type } from '../artifacts/contracts/L1Resolver.sol/L1Resolver';
import { namehash } from 'viem';

describe('L1Resolver - Namehash', () => {
  const deployL1ResolverFixture = async () => {
    const [owner, user01, user02] = await viem.getWalletClients();

    // Deploy mocked contracts first
    const mockedEnsRegistry =
      await viem.deployContract('MockedEnsRegistry');

    const mockedNameWrapper =
      await viem.deployContract('MockedNameWrapper');

    // Initial signers
    const initialSigners = [user01.account.address, user02.account.address];
    
    // Initial gateway URLs
    const initialGatewayUrls = [
      'https://gateway1.example.com',
      'https://gateway2.example.com'
    ];

    // Deploy actual L1Resolver with mocked ENS registry
    const l1Resolver: GetContractReturnType<L1Resolver$Type['abi']> =
      await viem.deployContract('L1Resolver', [
        initialSigners,
        initialGatewayUrls,
        mockedNameWrapper.address,
        mockedEnsRegistry.address,
      ]);

    return {
      l1Resolver,
    };
  };

  describe('ENSNamehash Library', () => {
    const deployLibraryTestFixture = async () => {
      const namehashTest = await viem.deployContract('ENSNamehashTest', []);

      return {
        namehashTest,
      };
    };

    it('Should compute namehash correctly for simple names', async () => {
      const { namehashTest } = await loadFixture(deployLibraryTestFixture);

      const testCases = [
        'eth',
        'celo.eth',
        'test.eth',
        'sub.test.eth',
      ];

      for (const name of testCases) {
        const libraryNamehash = await namehashTest.read.namehash([name]) as `0x${string}`;
        const viemNamehash = namehash(name);
        
        expect(libraryNamehash.toLowerCase()).to.equal(
          viemNamehash.toLowerCase()
        );
      }
    });

    it('Should compute namehash correctly for multi-level names', async () => {
      const { namehashTest } = await loadFixture(deployLibraryTestFixture);

      const testCases = [
        'a.b.c.eth',
        'test.alice.celo.eth',
        'sub.sub.sub.test.eth',
      ];

      for (const name of testCases) {
        const libraryNamehash = await namehashTest.read.namehash([name]) as `0x${string}`;
        const viemNamehash = namehash(name);
        
        expect(libraryNamehash.toLowerCase()).to.equal(
          viemNamehash.toLowerCase()
        );
      }
    });

    it('Should return zero hash for empty string', async () => {
      const { namehashTest } = await loadFixture(deployLibraryTestFixture);

      const libraryNamehash = await namehashTest.read.namehash(['']) as `0x${string}`;
      const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      expect(libraryNamehash.toLowerCase()).to.equal(zeroHash);
    });
  });

  describe('L1Resolver Namehash Function (via Library)', () => {
    it('Should compute namehash correctly for simple names', async () => {
      const { l1Resolver } = await loadFixture(deployL1ResolverFixture);

      const testCases = [
        'eth',
        'celo.eth',
        'test.eth',
        'sub.test.eth',
      ];

      for (const name of testCases) {
        const contractNamehash = await l1Resolver.read.namehash([name]);
        const viemNamehash = namehash(name);
        
        expect(contractNamehash.toLowerCase()).to.equal(
          viemNamehash.toLowerCase()
        );
      }
    });

    it('Should compute namehash correctly for multi-level names', async () => {
      const { l1Resolver } = await loadFixture(deployL1ResolverFixture);

      const testCases = [
        'a.b.c.eth',
        'test.alice.celo.eth',
        'sub.sub.sub.test.eth',
      ];

      for (const name of testCases) {
        const contractNamehash = await l1Resolver.read.namehash([name]);
        const viemNamehash = namehash(name);
        
        expect(contractNamehash.toLowerCase()).to.equal(
          viemNamehash.toLowerCase()
        );
      }
    });

    it('Should return zero hash for empty string', async () => {
      const { l1Resolver } = await loadFixture(deployL1ResolverFixture);

      const contractNamehash = await l1Resolver.read.namehash(['']);
      const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      expect(contractNamehash.toLowerCase()).to.equal(zeroHash);
    });

    it('Should compute namehash correctly for single label names', async () => {
      const { l1Resolver } = await loadFixture(deployL1ResolverFixture);

      const testCases = [
        'eth',
        'test',
        'example',
      ];

      for (const name of testCases) {
        const contractNamehash = await l1Resolver.read.namehash([name]);
        const viemNamehash = namehash(name);
        
        expect(contractNamehash.toLowerCase()).to.equal(
          viemNamehash.toLowerCase()
        );
      }
    });

    it('Should compute namehash correctly for names with multiple subdomains', async () => {
      const { l1Resolver } = await loadFixture(deployL1ResolverFixture);

      const testCases = [
        'www.example.eth',
        'api.v1.example.eth',
        'test.alice.bob.celo.eth',
      ];

      for (const name of testCases) {
        const contractNamehash = await l1Resolver.read.namehash([name]);
        const viemNamehash = namehash(name);
        
        expect(contractNamehash.toLowerCase()).to.equal(
          viemNamehash.toLowerCase()
        );
      }
    });
  });
});
