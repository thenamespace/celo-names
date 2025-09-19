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


// We assume 5000$ ETH Price
const ETH_PRICE_DOLLARS = 5000;
const ETH_PRICE_DECIMALS_DOLLARS = 5000_00000000n

describe("L2Registrar - Pricing", () => {
  const deployPricingFixture = async () => {
    const [owner, user01, user02, treasury] = await viem.getWalletClients();

    // Deploy L2Registry first
    const registry: GetContractReturnType<L2Registry$Type['abi']> = 
      await viem.deployContract('L2Registry', [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        PARENT_ENS,
        PARENT_NODE,
        METADATA_URI,
      ]);

    // Deploy mock USD oracle with $5000 ETH price
    const mockOracle = await viem.deployContract('MockedUsdOracle', [ETH_PRICE_DECIMALS_DOLLARS]);

    // Deploy L2Registrar
    const registrar: GetContractReturnType<L2Registrar$Type['abi']> = 
      await viem.deployContract('L2Registrar', [
        registry.address,
        mockOracle.address,
        treasury.account.address, // treasury
      ]);

    // Set L2Registrar as a registrar in the registry
    await registry.write.setRegistrar([registrar.address, true], {
      account: owner.account,
    });

    // Set base price to $5
    await registrar.write.setBasePrice([5n], {
      account: owner.account,
    });

    // Set special prices for different label lengths
    const lengths = [1n, 2n, 3n, 4n];
    const prices = [1000n, 500n, 250n, 50n]; // USD prices
    await registrar.write.setLabelPrices([lengths, prices], {
      account: owner.account,
    });

    return {
      registrarContract: registrar,
      registryContract: registry,
      mockOracle,
      owner,
      user01,
      user02,
    };
  };

  describe('Base Price Tests', () => {
    it('Should return base price for labels without special pricing', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      // Test 5+ letter labels (should use base price of $5)
      const price5Letters = await registrarContract.read.rentPrice(['hello', 1n]);
      const price6Letters = await registrarContract.read.rentPrice(['worlds', 1n]);
      
      // $5 * 1 year = $5 USD
      // Convert to ETH: ($5 * 1e8 * 1e18) / $5000 = 1000000000000000 wei = 0.001 ETH
      const expectedPrice = 1000000000000000n; // 0.001 ETH
      
      expect(price5Letters).to.equal(expectedPrice);
      expect(price6Letters).to.equal(expectedPrice);
    });

    it('Should calculate multi-year pricing correctly', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      // Test 5-letter label for 3 years
      const price3Years = await registrarContract.read.rentPrice(['hello', 3n]);
      
      // $5 * 3 years = $15 USD
      // Convert to ETH: ($15 * 1e8 * 1e18) / $5000 = 3000000000000000 wei = 0.003 ETH
      const expectedPrice = 3000000000000000n; // 0.003 ETH
      
      expect(price3Years).to.equal(expectedPrice);
    });
  });

  describe('Special Label Length Pricing', () => {
    it('Should return special price for 1-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['a', 1n]);
      
      // $1000 * 1 year = $1000 USD
      // Convert to ETH: ($1000 * 1e8 * 1e18) / $5000 = 200000000000000000 wei = 0.2 ETH
      const expectedPrice = 200000000000000000n; // 0.2 ETH
      
      expect(price).to.equal(expectedPrice);
    });

    it('Should return special price for 2-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['ab', 1n]);
      
      // $500 * 1 year = $500 USD
      // Convert to ETH: ($500 * 1e8 * 1e18) / $5000 = 100000000000000000 wei = 0.1 ETH
      const expectedPrice = 100000000000000000n; // 0.1 ETH
      
      expect(price).to.equal(expectedPrice);
    });

    it('Should return special price for 3-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['abc', 1n]);
      
      // $250 * 1 year = $250 USD
      // Convert to ETH: ($250 * 1e8 * 1e18) / $5000 = 50000000000000000 wei = 0.05 ETH
      const expectedPrice = 50000000000000000n; // 0.05 ETH
      
      expect(price).to.equal(expectedPrice);
    });

    it('Should return special price for 4-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['abcd', 1n]);
      
      // $50 * 1 year = $50 USD
      // Convert to ETH: ($50 * 1e8 * 1e18) / $5000 = 10000000000000000 wei = 0.01 ETH
      const expectedPrice = 10000000000000000n; // 0.01 ETH
      
      expect(price).to.equal(expectedPrice);
    });
  });

  describe('Multi-Year Special Pricing', () => {
    it('Should calculate multi-year pricing for 1-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['a', 2n]);
      
      // $1000 * 2 years = $2000 USD
      // Convert to ETH: ($2000 * 1e8 * 1e18) / $5000 = 400000000000000000 wei = 0.4 ETH
      const expectedPrice = 400000000000000000n; // 0.4 ETH
      
      expect(price).to.equal(expectedPrice);
    });

    it('Should calculate multi-year pricing for 2-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['ab', 3n]);
      
      // $500 * 3 years = $1500 USD
      // Convert to ETH: ($1500 * 1e8 * 1e18) / $5000 = 300000000000000000 wei = 0.3 ETH
      const expectedPrice = 300000000000000000n; // 0.3 ETH
      
      expect(price).to.equal(expectedPrice);
    });
  });

  describe('Price Validation', () => {
    it('Should revert registration for invalid label length (too short)', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      await expectContractCallToFail(
        async () => await registrarContract.write.register(['', 1n, user01.account.address, []], {
          account: user01.account,
          value: 1000000000000000n,
        }),
        'InvalidLabelLength'
      );
    });

    it('Should revert registration for invalid label length (too long)', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      // Create a very long label (56+ characters)
      const longLabel = 'a'.repeat(56);
      
      await expectContractCallToFail(
        async () => await registrarContract.write.register([longLabel, 1n, user01.account.address, []], {
          account: user01.account,
          value: 1000000000000000n,
        }),
        'InvalidLabelLength'
      );
    });

    it('Should revert registration for invalid duration', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      await expectContractCallToFail(
        async () => await registrarContract.write.register(['test', 0n, user01.account.address, []], {
          account: user01.account,
          value: 1000000000000000n,
        }),
        'InvalidDuration'
      );
    });
  });

  describe('Registration with Pricing', () => {
    it('Should register 1-letter label with correct payment', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['a', 1n]);
      
      await expect(
        registrarContract.write.register(['a', 1n, user01.account.address, []], {
          account: user01.account,
          value: price,
        })
      ).to.not.be.reverted;
    });

    it('Should register 4-letter label with correct payment', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['test', 1n]);
      
      await expect(
        registrarContract.write.register(['test', 1n, user01.account.address, []], {
          account: user01.account,
          value: price,
        })
      ).to.not.be.reverted;
    });

    it('Should fail registration with insufficient payment', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['a', 1n]);
      const insufficientPayment = price - 1n;
      
      await expectContractCallToFail(
        async () => await registrarContract.write.register(['a', 1n, user01.account.address, []], {
          account: user01.account,
          value: insufficientPayment,
        }),
        'InsufficientFunds'
      );
    });

    it('Should register with excess payment and refund remainder', async () => {
      const { registrarContract, user01 } = await loadFixture(deployPricingFixture);
      
      const price = await registrarContract.read.rentPrice(['test', 1n]);
      const excessPayment = price + 1000000000000000n; // Add 0.001 ETH extra
      
      const client = await viem.getPublicClient();
      const initialBalance = await client.getBalance({
        address: user01.account.address,
      });
      
      await expect(
        registrarContract.write.register(['test', 1n, user01.account.address, []], {
          account: user01.account,
          value: excessPayment,
        })
      ).to.not.be.reverted;
      
      const finalBalance = await client.getBalance({
        address: user01.account.address,
      });
      
      // Should refund the excess payment
      const expectedFinalBalance = initialBalance - price;
      expect(finalBalance).to.be.closeTo(expectedFinalBalance, 1000000000000000n); // Allow for gas costs (0.001 ETH)
    });
  });
});
