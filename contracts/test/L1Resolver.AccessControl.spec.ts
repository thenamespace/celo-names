import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L1Resolver$Type } from '../artifacts/contracts/L1Resolver.sol/L1Resolver';
import { keccak256, toHex } from 'viem';

describe('L1Resolver - Access Control', () => {
  const deployL1ResolverFixture = async () => {
    const [owner, user01, user02, user03] = await viem.getWalletClients();

    // Initial signers
    const initialSigners = [user01.account.address, user02.account.address];
    
    // Initial gateway URLs
    const initialGatewayUrls = [
      'https://gateway1.example.com',
      'https://gateway2.example.com'
    ];
    
    // Root name
    const rootName = 'celo.eth';
    
    // Name wrapper address (using zero address for testing)
    const nameWrapper = '0x0000000000000000000000000000000000000000';

    const l1Resolver: GetContractReturnType<L1Resolver$Type['abi']> =
      await viem.deployContract('L1Resolver', [
        initialSigners,
        initialGatewayUrls,
        rootName,
        nameWrapper,
      ]);

    const client = await viem.getPublicClient();

    return {
      l1Resolver,
      client,
      owner,
      user01,
      user02,
      user03,
      initialSigners,
      initialGatewayUrls,
      rootName,
      nameWrapper,
    };
  };

  describe('Owner Access Control - Signers', () => {
    it('Should allow only owner to set signers', async () => {
      const { l1Resolver, owner, user01, user02, user03 } = 
        await loadFixture(deployL1ResolverFixture);

      const newSigners = [user02.account.address, user03.account.address];

      // Owner should be able to set signers
      const tx = await l1Resolver.write.setSigners([newSigners], {
        account: owner.account,
      });

      const client = await viem.getPublicClient();
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      expect(receipt.status).to.equal('success');
    });

    it('Should reject non-owner attempts to set signers', async () => {
      const { l1Resolver, user01, user02, user03 } = 
        await loadFixture(deployL1ResolverFixture);

      const newSigners = [user02.account.address, user03.account.address];

      // Non-owner should not be able to set signers
      await expectContractCallToFail(
        () => l1Resolver.write.setSigners([newSigners], {
          account: user01.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should emit SignerChanged event when owner sets signers', async () => {
      const { l1Resolver, client, owner, user02, user03 } = 
        await loadFixture(deployL1ResolverFixture);

      const newSigners = [user02.account.address, user03.account.address];

      const tx = await l1Resolver.write.setSigners([newSigners], {
        account: owner.account,
      });

      const receipt = await client.getTransactionReceipt({ hash: tx });
      const eventSignature = keccak256(toHex('SignerChanged(address[])'));
      const eventLog = receipt.logs.find(
        (log) => log.topics[0] === eventSignature
      );
      
      expect(eventLog).to.not.be.undefined;
      expect(eventLog?.topics.length).to.be.greaterThan(0);
    });
  });

  describe('Owner Access Control - Gateway URLs', () => {
    it('Should allow only owner to set gateway URLs', async () => {
      const { l1Resolver, owner } = await loadFixture(deployL1ResolverFixture);

      const newGatewayUrls = [
        'https://newgateway1.example.com',
        'https://newgateway2.example.com',
        'https://newgateway3.example.com'
      ];

      // Owner should be able to set gateway URLs
      const tx = await l1Resolver.write.setOffchainGatewayUrls([newGatewayUrls], {
        account: owner.account,
      });

      const client = await viem.getPublicClient();
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      expect(receipt.status).to.equal('success');
    });

    it('Should reject non-owner attempts to set gateway URLs', async () => {
      const { l1Resolver, user01 } = await loadFixture(deployL1ResolverFixture);

      const newGatewayUrls = [
        'https://malicious.example.com'
      ];

      // Non-owner should not be able to set gateway URLs
      await expectContractCallToFail(
        () => l1Resolver.write.setOffchainGatewayUrls([newGatewayUrls], {
          account: user01.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });

    it('Should emit OffchainUrlsChanged event when owner sets gateway URLs', async () => {
      const { l1Resolver, client, owner } = await loadFixture(deployL1ResolverFixture);

      const newGatewayUrls = [
        'https://updated1.example.com',
        'https://updated2.example.com'
      ];

      const tx = await l1Resolver.write.setOffchainGatewayUrls([newGatewayUrls], {
        account: owner.account,
      });

      const receipt = await client.getTransactionReceipt({ hash: tx });
      const eventSignature = keccak256(toHex('OffchainUrlsChanged(string[])'));
      const eventLog = receipt.logs.find(
        (log) => log.topics[0] === eventSignature
      );
      
      expect(eventLog).to.not.be.undefined;
      expect(eventLog?.topics.length).to.be.greaterThan(0);
    });
  });

  describe('Multiple Operations', () => {
    it('Should allow owner to perform multiple administrative operations', async () => {
      const { l1Resolver, owner, user02, user03 } = 
        await loadFixture(deployL1ResolverFixture);

      const newSigners = [user02.account.address, user03.account.address];
      const newGatewayUrls = ['https://final.example.com'];

      // Owner should be able to set signers
      const tx1 = await l1Resolver.write.setSigners([newSigners], {
        account: owner.account,
      });

      // Owner should be able to set gateway URLs
      const tx2 = await l1Resolver.write.setOffchainGatewayUrls([newGatewayUrls], {
        account: owner.account,
      });

      const client = await viem.getPublicClient();
      const receipt1 = await client.waitForTransactionReceipt({ hash: tx1 });
      const receipt2 = await client.waitForTransactionReceipt({ hash: tx2 });

      expect(receipt1.status).to.equal('success');
      expect(receipt2.status).to.equal('success');
    });

    it('Should maintain access control after ownership transfer', async () => {
      const { l1Resolver, owner, user01, user02 } = 
        await loadFixture(deployL1ResolverFixture);

      // Transfer ownership
      await l1Resolver.write.transferOwnership([user01.account.address], {
        account: owner.account,
      });

      // New owner should be able to set signers
      const newSigners = [user02.account.address];
      const tx = await l1Resolver.write.setSigners([newSigners], {
        account: user01.account,
      });

      const client = await viem.getPublicClient();
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      expect(receipt.status).to.equal('success');

      // Old owner should not be able to set signers
      await expectContractCallToFail(
        () => l1Resolver.write.setSigners([newSigners], {
          account: owner.account,
        }),
        ERRORS.OWNER_ONLY
      );
    });
  });
});
