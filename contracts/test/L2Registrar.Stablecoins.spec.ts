import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { namehash } from 'viem';
import {
  PARENT_ENS,
  PARENT_NODE,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  METADATA_URI,
  ETH_PRICE_DECIMALS_DOLLARS,
  BASE_PRICE_DOLLARS,
  DEFAULT_REGISTRAR_CONFIG,
} from './vars';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import { generatePermitSignature } from './utils';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registrar$Type } from '../artifacts/contracts/L2Registrar.sol/L2Registrar';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';
import type { MockedStableCoin$Type } from '../artifacts/contracts/test/MockedStableCoin.sol/MockedStableCoin';

describe('L2Registrar - Stablecoins', () => {
  const deployStablecoinFixture = async () => {
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

    const storage = await viem.deployContract("RegistrarStorage", []);

    // Deploy L2Registrar
    const registrar: GetContractReturnType<L2Registrar$Type['abi']> =
      await viem.deployContract('L2Registrar', [
        registry.address,
        mockOracle.address,
        treasury.account.address, // treasury
        storage.address,
        DEFAULT_REGISTRAR_CONFIG
      ]);

    // Set L2Registrar as a registrar in the registry
    await registry.write.setRegistrar([registrar.address, true], {
      account: owner.account,
    });

    // Deploy MockedStableCoin (USDC-like with 6 decimals)
    //@ts-ignore
    const stablecoin: GetContractReturnType<MockedStableCoin$Type['abi']> =
      await viem.deployContract('MockedStableCoin', [
        'USD Coin',
        'USDC',
        6, // 6 decimals like USDC
        1000000 // 1M initial supply
      ]);

    // Set stablecoin as allowed token
    await registrar.write.modifyApprovedTokens([
      [stablecoin.address],
      true, // enabled
      false // don't clear previous entries
    ], {
      account: owner.account,
    });

    // Mint stablecoins to user01 for testing
    await stablecoin.write.mint([
      user01.account.address,
      1000000n * (10n ** 6n) // 1M USDC
    ], {
      account: owner.account,
    });

    return {
      registrar,
      registry,
      stablecoin,
      mockOracle,
      owner,
      user01,
      user02,
      treasury,
    };
  };

  describe('Stablecoin Registration with Permit', () => {
    it('Should register a name using stablecoin with permit', async () => {
      const { registrar, registry, stablecoin, user01, treasury } = await loadFixture(deployStablecoinFixture);

      const label = 'testname';
      const durationInYears = 1n;
      const node = namehash(`${label}.${PARENT_ENS}`);

      // Calculate expected price (base price * duration * token decimals)
      const expectedPrice = BASE_PRICE_DOLLARS * durationInYears * (10n ** 6n); // 6 decimals for USDC

      // Check initial balances
      const initialUserBalance = await stablecoin.read.balanceOf([user01.account.address]);
      const initialTreasuryBalance = await stablecoin.read.balanceOf([treasury.account.address]);

      // Create permit signature
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
      const permit = await generatePermitSignature(
        user01,
        stablecoin,
        registrar.address,
        expectedPrice,
        deadline
      );

      // Register using stablecoin with permit
      await registrar.write.registerERC20([
        label,
        durationInYears,
        user01.account.address,
        [], // no resolver data
        stablecoin.address,
        permit
      ], {
        account: user01.account,
      });

      // Check that name is registered
      const owner = await registry.read.ownerOf([BigInt(node)]);
      expect(owner.toLowerCase()).to.equal(user01.account.address.toLowerCase());

      // Check balances after registration
      const finalUserBalance = await stablecoin.read.balanceOf([user01.account.address]);
      const finalTreasuryBalance = await stablecoin.read.balanceOf([treasury.account.address]);

      expect(finalUserBalance).to.equal(initialUserBalance - expectedPrice);
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + expectedPrice);
    });

    it('Should fail registration with insufficient permit amount', async () => {
      const { registrar, stablecoin, user01 } = await loadFixture(deployStablecoinFixture);

      const label = 'testname';
      const durationInYears = 1n;
      const expectedPrice = BASE_PRICE_DOLLARS * durationInYears * (10n ** 6n);
      const insufficientAmount = expectedPrice / 2n; // Half the required amount

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const permit = await generatePermitSignature(
        user01,
        stablecoin,
        registrar.address,
        insufficientAmount,
        deadline
      );

      // Should fail with insufficient permit amount
      await expectContractCallToFail(
        async () => {
          await registrar.write.registerERC20([
            label,
            durationInYears,
            user01.account.address,
            [],
            stablecoin.address,
            permit
          ], {
            account: user01.account,
          });
        },
        'InsufficientPermitAmount'
      );
    });

    it('Should fail registration with non-allowed token', async () => {
      const { registrar, user01 } = await loadFixture(deployStablecoinFixture);

      // Deploy another stablecoin that's not in the allowed list
      const unauthorizedStablecoin = await viem.deployContract('MockedStableCoin', [
        'Unauthorized Token',
        'UNAUTH',
        18,
        1000000
      ]);

      const label = 'testname';
      const durationInYears = 1n;
      const expectedPrice = BASE_PRICE_DOLLARS * durationInYears * (10n ** 18n);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const permit = await generatePermitSignature(
        user01,
        unauthorizedStablecoin,
        registrar.address,
        expectedPrice,
        deadline
      );

      // Should fail with token not allowed
      await expectContractCallToFail(
        async () => {
          await registrar.write.registerERC20([
            label,
            durationInYears,
            user01.account.address,
            [],
            unauthorizedStablecoin.address,
            permit
          ], {
            account: user01.account,
          });
        },
        'TokenNotAllowed'
      );
    });

    it('Should calculate correct price for different token decimals', async () => {
      const { registrar, stablecoin } = await loadFixture(deployStablecoinFixture);

      const label = 'testname';
      const durationInYears = 1n;

      // Test price calculation
      const price = await registrar.read.rentPrice([
        label,
        durationInYears,
        stablecoin.address
      ]);

      // Expected: BASE_PRICE_DOLLARS * durationInYears * (10 ** 6) for USDC
      const expectedPrice = BASE_PRICE_DOLLARS * durationInYears * (10n ** 6n);
      expect(price).to.equal(expectedPrice);
    });

    it('Should split fees correctly between treasury and ENS treasury during registration/renewal', async () => {
      const { registrar, registry, stablecoin, user01, user02, treasury, owner } = await loadFixture(deployStablecoinFixture);

      // Use user02 as ENS treasury
      const ensTreasuryAddress = user02.account.address;

      // Set ENS treasury fee to 10% (1000 basis points)
      const ensTreasuryFeePercent = 1000n; // 10%

      // Set ENS treasury address and fee percentage
      await registrar.write.setEnsTreasury([ensTreasuryAddress], {
        account: owner.account,
      });

      await registrar.write.setEnsTreasuryFeePercent([Number(ensTreasuryFeePercent)], {
        account: owner.account,
      });

      const label = 'ensfeetest';
      const durationInYears = 1n;
      const node = namehash(`${label}.${PARENT_ENS}`);
      const expectedPrice = BASE_PRICE_DOLLARS * durationInYears * (10n ** 6n);

      // Calculate expected splits (10% to ENS treasury, 90% to regular treasury)
      const expectedEnsTreasuryAmount = (expectedPrice * ensTreasuryFeePercent) / 10000n;
      const expectedTreasuryAmount = expectedPrice - expectedEnsTreasuryAmount;

      // Check initial balances
      const initialUserBalance = await stablecoin.read.balanceOf([user01.account.address]);
      const initialTreasuryBalance = await stablecoin.read.balanceOf([treasury.account.address]);
      const initialEnsTreasuryBalance = await stablecoin.read.balanceOf([ensTreasuryAddress]);

      // Create permit signature for registration
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const permit = await generatePermitSignature(
        user01,
        stablecoin,
        registrar.address,
        expectedPrice,
        deadline
      );

      // Register using stablecoin with permit
      await registrar.write.registerERC20([
        label,
        durationInYears,
        user01.account.address,
        [],
        stablecoin.address,
        permit
      ], {
        account: user01.account,
      });

      // Check balances after registration
      const finalUserBalance = await stablecoin.read.balanceOf([user01.account.address]);
      const finalTreasuryBalance = await stablecoin.read.balanceOf([treasury.account.address]);
      const finalEnsTreasuryBalance = await stablecoin.read.balanceOf([ensTreasuryAddress]);

      // Verify user paid full amount
      expect(finalUserBalance).to.equal(initialUserBalance - expectedPrice);

      // Verify treasury received correct amount (90%)
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + expectedTreasuryAmount);

      // Verify ENS treasury received correct amount (10%)
      expect(finalEnsTreasuryBalance).to.equal(initialEnsTreasuryBalance + expectedEnsTreasuryAmount);

      // Verify total received equals amount paid
      const totalReceived = (finalTreasuryBalance - initialTreasuryBalance) + (finalEnsTreasuryBalance - initialEnsTreasuryBalance);
      expect(totalReceived).to.equal(expectedPrice);

      // Test renewal with fee splitting
      const renewalDuration = 1n;
      const renewalPrice = BASE_PRICE_DOLLARS * renewalDuration * (10n ** 6n);
      const expectedRenewalEnsTreasuryAmount = (renewalPrice * ensTreasuryFeePercent) / 10000n;
      const expectedRenewalTreasuryAmount = renewalPrice - expectedRenewalEnsTreasuryAmount;

      const renewalInitialUserBalance = await stablecoin.read.balanceOf([user01.account.address]);
      const renewalInitialTreasuryBalance = await stablecoin.read.balanceOf([treasury.account.address]);
      const renewalInitialEnsTreasuryBalance = await stablecoin.read.balanceOf([ensTreasuryAddress]);

      // Create permit signature for renewal
      const renewalDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const renewalPermit = await generatePermitSignature(
        user01,
        stablecoin,
        registrar.address,
        renewalPrice,
        renewalDeadline
      );

      // Renew using stablecoin with permit
      await registrar.write.renewERC20([
        label,
        renewalDuration,
        stablecoin.address,
        renewalPermit
      ], {
        account: user01.account,
      });

      // Check balances after renewal
      const renewalFinalUserBalance = await stablecoin.read.balanceOf([user01.account.address]);
      const renewalFinalTreasuryBalance = await stablecoin.read.balanceOf([treasury.account.address]);
      const renewalFinalEnsTreasuryBalance = await stablecoin.read.balanceOf([ensTreasuryAddress]);

      // Verify user paid full renewal amount
      expect(renewalFinalUserBalance).to.equal(renewalInitialUserBalance - renewalPrice);

      // Verify treasury received correct renewal amount (90%)
      expect(renewalFinalTreasuryBalance).to.equal(renewalInitialTreasuryBalance + expectedRenewalTreasuryAmount);

      // Verify ENS treasury received correct renewal amount (10%)
      expect(renewalFinalEnsTreasuryBalance).to.equal(renewalInitialEnsTreasuryBalance + expectedRenewalEnsTreasuryAmount);

      // Verify total renewal received equals amount paid
      const totalRenewalReceived = (renewalFinalTreasuryBalance - renewalInitialTreasuryBalance) + (renewalFinalEnsTreasuryBalance - renewalInitialEnsTreasuryBalance);
      expect(totalRenewalReceived).to.equal(renewalPrice);
    });
  });
});
