import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L1Resolver$Type } from '../artifacts/contracts/L1Resolver.sol/L1Resolver';
import { namehash, encodeFunctionData, decodeFunctionResult } from 'viem';
import { dnsEncode } from './utils';

describe('L1Resolver - Resolution', () => {
  const ROOT_NAME = 'celo.eth';


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
        ROOT_NAME,
        mockedNameWrapper.address,
        mockedEnsRegistry.address,
      ]);

    // Set up authorization in mocked ENS registry
    const rootNode = namehash(ROOT_NAME);
    await mockedEnsRegistry.write.setOwner([
      rootNode,
      owner.account.address
    ], {
      account: owner.account,
    });

    const client = await viem.getPublicClient();

    return {
      l1Resolver,
      mockedEnsRegistry,
      mockedNameWrapper,
      client,
      owner,
      user01,
      user02,
      initialSigners,
      initialGatewayUrls,
    };
  };

  describe('Root Name Resolution', () => {
    it('Should properly resolve root name', async () => {
      const { l1Resolver, owner } = await loadFixture(deployL1ResolverFixture);

      const rootNode = namehash(ROOT_NAME);

      // 1. Verify root_name owner can set text and address records
      
      // Set a text record for the root name
      await l1Resolver.write.setText([
        rootNode,
        'description',
        'Celo ENS Root Domain'
      ], {
        account: owner.account,
      });

      // Set an address record for the root name
      await l1Resolver.write.setAddr([
        rootNode,
        owner.account.address
      ], {
        account: owner.account,
      });

      // 2. Call resolve function and try to resolve text/address records using encodeFunctionData

      // DNS encode the root name using utility function
      const dnsEncoded = dnsEncode(ROOT_NAME);

      // Create resolve data for text record using encodeFunctionData
      const textData = encodeFunctionData({
        abi: l1Resolver.abi,
        functionName: 'text',
        args: [rootNode, 'description']
      });

      // Create resolve data for address record using encodeFunctionData
      const addrData = encodeFunctionData({
        abi: l1Resolver.abi,
        functionName: 'addr',
        args: [rootNode]
      });

      // 3. Verify the address/text record is returned properly

      // Test resolve function with text record
      const textResult = await l1Resolver.read.resolve([
        dnsEncoded,
        textData
      ]);

      // Test resolve function with address record
      const addrResult = await l1Resolver.read.resolve([
        dnsEncoded,
        addrData
      ]);

      // Verify text record is returned properly
      expect(textResult).to.not.be.empty;
      
      // Verify address record is returned properly
      expect(addrResult).to.not.be.empty;
      
      // Decode and verify the actual values match what we set
      const decodedText = decodeFunctionResult({
        abi: l1Resolver.abi,
        functionName: 'text',
        data: textResult
      });
      
      const decodedAddr: string = decodeFunctionResult({
        abi: l1Resolver.abi,
        functionName: 'addr',
        data: addrResult
      });

      // Verify the decoded values match what we originally set
      expect(decodedText).to.equal('Celo ENS Root Domain');
      expect(decodedAddr.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });

    it('Should properly revert with OffchainLookup error for non root names', async () => {
      const { l1Resolver, owner } = await loadFixture(deployL1ResolverFixture);

      // Test with a subdomain: "sub.celo.eth"
      const subdomain = 'sub.celo.eth';
      const subdomainNode = namehash(subdomain);

      // DNS encode the subdomain using utility function
      const dnsEncoded = dnsEncode(subdomain);

      // Create resolve data for text record
      const textData = encodeFunctionData({
        abi: l1Resolver.abi,
        functionName: 'text',
        args: [subdomainNode, 'description']
      });

      // Use direct contract call to catch the OffchainLookup error before viem processes it
      const client = await viem.getPublicClient({
        ccipRead: false
      });
      
      try {
        const callData = encodeFunctionData({
          abi: l1Resolver.abi,
          functionName: 'resolve',
          args: [dnsEncoded, textData]
        });
        
        await client.call({
          to: l1Resolver.address,
          data: callData
        });
        expect.fail('Expected resolve to revert with OffchainLookup');
      } catch (error: any) {
        expect(error.details).to.include('OffchainLookup');
      }
    });
  });

});
