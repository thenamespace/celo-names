import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { 
  PARENT_ENS, 
  PARENT_NODE, 
  TOKEN_NAME, 
  TOKEN_SYMBOL, 
  METADATA_URI,
  ETH_PRICE_DECIMALS_DOLLARS,
  LABEL_LEN_1_PRICE_DOLLARS,
  LABEL_LEN_2_PRICE_DOLLARS,
  LABEL_LEN_3_PRICE_DOLLARS,
  LABEL_LEN_4_PRICE_DOLLARS,
  BASE_PRICE_DOLLARS,
  DEFAULT_REGISTRAR_CONFIG
} from './vars';
import { dollarsToEth } from './utils';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registrar$Type } from '../artifacts/contracts/L2Registrar.sol/L2Registrar';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';


describe('L2Registrar - Pricing', () => {
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
    const mockOracle = await viem.deployContract('MockedUsdOracle', [
      ETH_PRICE_DECIMALS_DOLLARS,
    ]);

    // Deploy L2Registrar
    const registrar: GetContractReturnType<L2Registrar$Type['abi']> =
      await viem.deployContract('L2Registrar', [
        registry.address,
        mockOracle.address,
        treasury.account.address, // treasury
        DEFAULT_REGISTRAR_CONFIG
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
    const prices = [
      LABEL_LEN_1_PRICE_DOLLARS,
      LABEL_LEN_2_PRICE_DOLLARS,
      LABEL_LEN_3_PRICE_DOLLARS,
      LABEL_LEN_4_PRICE_DOLLARS,
    ]; // USD prices
    await registrar.write.setLabelPrices([lengths, prices], {
      account: owner.account,
    });

    await registrar.write.setBasePrice([BASE_PRICE_DOLLARS]);

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
      const price5Letters = await registrarContract.read.rentPrice([
        'hello',
        1n,
      ]);
      const price6Letters = await registrarContract.read.rentPrice([
        'worlds',
        1n,
      ]);

       // $5 * 1 year = $5 USD
       const expectedPrice = dollarsToEth(BASE_PRICE_DOLLARS, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price5Letters).to.equal(expectedPrice);
      expect(price6Letters).to.equal(expectedPrice);
    });

    it('Should calculate multi-year pricing correctly', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      // Test 5-letter label for 3 years
      const price3Years = await registrarContract.read.rentPrice(['hello', 3n]);

       // $5 * 3 years = $15 USD
       const expectedPrice = dollarsToEth(BASE_PRICE_DOLLARS * 3n, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price3Years).to.equal(expectedPrice);
    });
  });

  describe('Special Label Length Pricing', () => {
    it('Should return special price for 1-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['a', 1n]);

       // $1000 * 1 year = $1000 USD
       const expectedPrice = dollarsToEth(LABEL_LEN_1_PRICE_DOLLARS, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price).to.equal(expectedPrice);
    });

    it('Should return special price for 2-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['ab', 1n]);

       // $500 * 1 year = $500 USD
       const expectedPrice = dollarsToEth(LABEL_LEN_2_PRICE_DOLLARS, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price).to.equal(expectedPrice);
    });

    it('Should return special price for 3-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['abc', 1n]);

       // $250 * 1 year = $250 USD
       const expectedPrice = dollarsToEth(LABEL_LEN_3_PRICE_DOLLARS, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price).to.equal(expectedPrice);
    });

    it('Should return special price for 4-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['abcd', 1n]);

       // $50 * 1 year = $50 USD
       const expectedPrice = dollarsToEth(LABEL_LEN_4_PRICE_DOLLARS, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price).to.equal(expectedPrice);
    });
  });

  describe('Multi-Year Special Pricing', () => {
    it('Should calculate multi-year pricing for 1-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['a', 2n]);

       // $1000 * 2 years = $2000 USD
       const expectedPrice = dollarsToEth(LABEL_LEN_1_PRICE_DOLLARS * 2n, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price).to.equal(expectedPrice);
    });

    it('Should calculate multi-year pricing for 2-letter labels', async () => {
      const { registrarContract } = await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['ab', 3n]);

       // $500 * 3 years = $1500 USD
       const expectedPrice = dollarsToEth(LABEL_LEN_2_PRICE_DOLLARS * 3n, ETH_PRICE_DECIMALS_DOLLARS);

      expect(price).to.equal(expectedPrice);
    });
  });


  describe('Registration with Pricing', () => {
    it('Should register 1-letter label with correct payment', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['a', 1n]);

      await expect(
        registrarContract.write.register(
          ['a', 1n, user01.account.address, []],
          {
            account: user01.account,
            value: price,
          }
        )
      ).to.not.be.reverted;
    });

    it('Should register 4-letter label with correct payment', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['test', 1n]);

      await expect(
        registrarContract.write.register(
          ['test', 1n, user01.account.address, []],
          {
            account: user01.account,
            value: price,
          }
        )
      ).to.not.be.reverted;
    });


    it('Should register with excess payment and refund remainder', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployPricingFixture);

      const price = await registrarContract.read.rentPrice(['test', 1n]);
      const excessPayment = price + 1000000000000000n; // Add 0.001 ETH extra

      const client = await viem.getPublicClient();
      const initialBalance = await client.getBalance({
        address: user01.account.address,
      });

      await expect(
        registrarContract.write.register(
          ['test', 1n, user01.account.address, []],
          {
            account: user01.account,
            value: excessPayment,
          }
        )
      ).to.not.be.reverted;

      const finalBalance = await client.getBalance({
        address: user01.account.address,
      });

      // Should refund the excess payment
      const expectedFinalBalance = initialBalance - price;
      expect(finalBalance).to.be.closeTo(
        expectedFinalBalance,
        1000000000000000n
      ); // Allow for gas costs (0.001 ETH)
    });
  });
});
