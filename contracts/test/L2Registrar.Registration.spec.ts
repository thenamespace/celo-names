import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { viem } from 'hardhat';
import { namehash, keccak256, encodePacked, toBytes } from 'viem';
import {
  PARENT_ENS,
  PARENT_NODE,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  METADATA_URI,
  ETH_PRICE_DECIMALS_DOLLARS,
  BASE_PRICE_DOLLARS,
  CENTS_MULTIPLIER,
  YEAR_IN_SECONDS,
  DEFAULT_REGISTRAR_CONFIG,
} from './vars';
import { dollarsToEth } from './utils';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registrar$Type } from '../artifacts/contracts/L2Registrar.sol/L2Registrar';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';

describe('L2Registrar - Registration', () => {
  const deployRegistrationFixture = async () => {
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

    // Set base price to $5 (500 cents)
    await registrar.write.setBasePrice([BASE_PRICE_DOLLARS * CENTS_MULTIPLIER], {
      account: owner.account,
    });

    return {
      registrarContract: registrar,
      registryContract: registry,
      mockOracle,
      owner,
      user01,
      user02,
      treasury,
      storage
    };
  };

  describe('Basic Registration Tests', () => {
    it('Should register a 5-letter name with 2-year expiry and verify all properties', async () => {
      const { registrarContract, registryContract, user01, treasury } =
        await loadFixture(deployRegistrationFixture);

      const label = 'hello';
      const durationInYears = 2n;
      const owner = user01.account.address;

      // Calculate expected price: $5 * 2 years = $10 USD
      const expectedPrice = dollarsToEth(
        BASE_PRICE_DOLLARS * durationInYears,
        ETH_PRICE_DECIMALS_DOLLARS
      );

      // Verify price calculation
      const actualPrice = await registrarContract.read.rentPrice([
        label,
        durationInYears,
      ]);
      expect(actualPrice).to.equal(expectedPrice);

      // Get client and initial state
      const client = await viem.getPublicClient();
      const initialBalance = await client.getBalance({
        address: user01.account.address,
      });
      const treasuryBalance = await client.getBalance({
        address: treasury.account.address,
      });

      // Register the name
      const tx = await registrarContract.write.register(
        [label, durationInYears, owner, []],
        {
          account: user01.account,
          value: actualPrice,
        }
      );

      // Get current block timestamp for accurate expiry calculation
      const currentBlock = await client.getBlock();
      const currentTime = currentBlock.timestamp;
      const expectedExpiry = currentTime + durationInYears * YEAR_IN_SECONDS; // 2 years in seconds

      // Verify NFT was created with proper owner
      const fullName = `${label}.${PARENT_ENS}`;
      const nodeHash = namehash(fullName);
      const nftOwner = await registryContract.read.ownerOf([BigInt(nodeHash)]);
      expect(nftOwner.toLowerCase()).to.equal(owner.toLowerCase());

      // Verify expiry is properly set (allow 100 second tolerance for block time)
      const actualExpiry = await registryContract.read.expiries([nodeHash]);
      expect(actualExpiry).to.be.closeTo(expectedExpiry, 100n);

      // Verify the NameRegistered event was emitted
      const receipt = await client.getTransactionReceipt({ hash: tx });
      const eventLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === registrarContract.address.toLowerCase()
      );
      expect(eventLog).to.not.be.undefined;

      // Get actual transaction cost
      const txDetails = await client.getTransaction({ hash: tx });
      const gasPrice = txDetails.gasPrice || txDetails.maxFeePerGas || 0n;
      const gasUsed = receipt.gasUsed;
      const actualGasCost = gasPrice * gasUsed;

      // Verify final balance (should be reduced by the exact price paid + gas cost)
      const finalBalance = await client.getBalance({
        address: user01.account.address,
      });

      const treasuryAfterBalance = await client.getBalance({
        address: treasury.account.address,
      });

      const expectedFinalBalance = initialBalance - actualPrice - actualGasCost;
      const expectedTreasuryBalance = treasuryBalance + actualPrice;
      
      expect(finalBalance).to.equal(expectedFinalBalance);
      expect(treasuryAfterBalance).to.equal(expectedTreasuryBalance);

    });
  });

  describe('Registration Validation Tests', () => {
    it('Should prevent registering the same name twice', async () => {
      const { registrarContract, user01, user02 } =
        await loadFixture(deployRegistrationFixture);

      const label = 'testname';
      const durationInYears = 1n;
      const price = await registrarContract.read.rentPrice([label, durationInYears]);

      // First registration should succeed
      await expect(
        registrarContract.write.register(
          [label, durationInYears, user01.account.address, []],
          {
            account: user01.account,
            value: price,
          }
        )
      ).to.not.be.reverted;

      // Second registration with same name should fail
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [label, durationInYears, user02.account.address, []],
            {
              account: user02.account,
              value: price,
            }
          ),
        ERRORS.SUBDOMAIN_ALREADY_TAKEN
      );
    });

    it('Should enforce minimum and maximum label length limits', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployRegistrationFixture);

      const durationInYears = 1n;
      const basePrice = await registrarContract.read.rentPrice(['test', durationInYears]);

      // Test minimum label length (should be 1 by default)
      const minLengthLabel = 'a';
      const minPrice = await registrarContract.read.rentPrice([minLengthLabel, durationInYears]);
      
      await expect(
        registrarContract.write.register(
          [minLengthLabel, durationInYears, user01.account.address, []],
          {
            account: user01.account,
            value: minPrice,
          }
        )
      ).to.not.be.reverted;

      // Test maximum label length (should be 55 by default)
      const maxLengthLabel = 'a'.repeat(55);
      const maxPrice = await registrarContract.read.rentPrice([maxLengthLabel, durationInYears]);
      
      await expect(
        registrarContract.write.register(
          [maxLengthLabel, durationInYears, user01.account.address, []],
          {
            account: user01.account,
            value: maxPrice,
          }
        )
      ).to.not.be.reverted;

      // Test label too short (empty string should fail)
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            ['', durationInYears, user01.account.address, []],
            {
              account: user01.account,
              value: basePrice,
            }
          ),
        ERRORS.INVALID_LABEL_LENGTH
      );

      // Test label too long (56 characters should fail)
      const tooLongLabel = 'a'.repeat(56);
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [tooLongLabel, durationInYears, user01.account.address, []],
            {
              account: user01.account,
              value: basePrice,
            }
          ),
        ERRORS.INVALID_LABEL_LENGTH
      );
    });

    it('Should enforce minimum and maximum year duration limits', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployRegistrationFixture);

      const label = 'testname';
      const basePrice = await registrarContract.read.rentPrice([label, 1n]);

      // Test minimum duration (1 year should work)
      const minDuration = 1n;
      const minPrice = await registrarContract.read.rentPrice([label, minDuration]);
      
      await expect(
        registrarContract.write.register(
          [label, minDuration, user01.account.address, []],
          {
            account: user01.account,
            value: minPrice,
          }
        )
      ).to.not.be.reverted;

      // Test maximum duration (10000 years should work)
      const maxDuration = 10000n;
      const maxPrice = await registrarContract.read.rentPrice([`${label}2`, maxDuration]);
      
      await expect(
        registrarContract.write.register(
          [`${label}2`, maxDuration, user01.account.address, []],
          {
            account: user01.account,
            value: maxPrice,
          }
        )
      ).to.not.be.reverted;

      // Test duration too short (0 years should fail)
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [`${label}3`, 0n, user01.account.address, []],
            {
              account: user01.account,
              value: basePrice,
            }
          ),
        ERRORS.INVALID_DURATION
      );

      // Test duration too long (10001 years should fail)
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [`${label}4`, 10001n, user01.account.address, []],
            {
              account: user01.account,
              value: basePrice,
            }
          ),
        ERRORS.INVALID_DURATION
      );
    });

    it('Should prevent registration with insufficient funds', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployRegistrationFixture);

      const label = 'testname';
      const durationInYears = 1n;
      const requiredPrice = await registrarContract.read.rentPrice([label, durationInYears]);

      // Test with insufficient funds (half the required amount)
      const insufficientAmount = requiredPrice / 2n;

      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [label, durationInYears, user01.account.address, []],
            {
              account: user01.account,
              value: insufficientAmount,
            }
          ),
       ERRORS.INSUFFICIENT_FUNDS
      );

      // Test with zero funds
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [`${label}2`, durationInYears, user01.account.address, []],
            {
              account: user01.account,
              value: 0n,
            }
          ),
        ERRORS.INSUFFICIENT_FUNDS
      );

      // Test with exact required amount (should succeed)
      await expect(
        registrarContract.write.register(
          [`${label}3`, durationInYears, user01.account.address, []],
          {
            account: user01.account,
            value: requiredPrice,
          }
        )
      ).to.not.be.reverted;
    });

    it('Should prevent registration of blacklisted names', async () => {
      const { registrarContract, user01, owner, storage } =
        await loadFixture(deployRegistrationFixture);

      const blacklistedLabel = 'admin';
      const durationInYears = 1n;
      const price = await registrarContract.read.rentPrice([blacklistedLabel, durationInYears]);

      // Calculate label hash for blacklisting
      const labelHash = keccak256(toBytes(blacklistedLabel));

      // Set the label as blacklisted
      await storage.write.setBlacklist([[labelHash], true, false], {
        account: owner.account,
      });

      // Attempt to register the blacklisted name should fail
      await expectContractCallToFail(
        async () =>
          await registrarContract.write.register(
            [blacklistedLabel, durationInYears, user01.account.address, []],
            {
              account: user01.account,
              value: price,
            }
          ),
        ERRORS.BLACKLISTED_NAME
      );

      // Verify that a non-blacklisted name can still be registered
      const normalLabel = 'testname';
      const normalPrice = await registrarContract.read.rentPrice([normalLabel, durationInYears]);
      
      await expect(
        registrarContract.write.register(
          [normalLabel, durationInYears, user01.account.address, []],
          {
            account: user01.account,
            value: normalPrice,
          }
        )
      ).to.not.be.reverted;
    });
  });
});
