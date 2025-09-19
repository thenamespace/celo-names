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
  YEAR_IN_SECONDS,
} from './vars';
import { dollarsToEth } from './utils';
import { expect } from 'chai';
import '@nomicfoundation/hardhat-chai-matchers';
import { ERRORS, expectContractCallToFail } from './errors';
import type { GetContractReturnType } from '@nomicfoundation/hardhat-viem/types';
import type { L2Registrar$Type } from '../artifacts/contracts/L2Registrar.sol/L2Registrar';
import type { L2Registry$Type } from '../artifacts/contracts/L2Registry.sol/L2Registry';

describe('L2Registrar - Renewal', () => {
  const deployRenewalFixture = async () => {
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
      ]);

    // Set L2Registrar as a registrar in the registry
    await registry.write.setRegistrar([registrar.address, true], {
      account: owner.account,
    });

    // Set base price to $5
    await registrar.write.setBasePrice([BASE_PRICE_DOLLARS], {
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
    };
  };

  describe('Successful Renewal Tests', () => {
    it('Should successfully renew a registered name and verify expiry and pricing', async () => {
      const { registrarContract, registryContract, user01, treasury } =
        await loadFixture(deployRenewalFixture);

      const label = 'renewtest';
      const initialDuration = 1n;
      const renewalDuration = 1n;
      const owner = user01.account.address;

      // Get prices using the rentPrice function
      const initialPrice = await registrarContract.read.rentPrice([
        label,
        initialDuration,
      ]);
      const renewalPrice = await registrarContract.read.rentPrice([
        label,
        renewalDuration,
      ]);

      // Get client and initial state
      const client = await viem.getPublicClient();
      const initialBalance = await client.getBalance({
        address: user01.account.address,
      });
      const treasuryBalance = await client.getBalance({
        address: treasury.account.address,
      });

      // Register the name for 1 year
      const registerTx = await registrarContract.write.register(
        [label, initialDuration, owner, []],
        {
          account: user01.account,
          value: initialPrice,
        }
      );

      // Verify the name was registered successfully
      const fullName = `${label}.${PARENT_ENS}`;
      const nodeHash = namehash(fullName);
      const nftOwner = await registryContract.read.ownerOf([BigInt(nodeHash)]);
      expect(nftOwner.toLowerCase()).to.equal(owner.toLowerCase());


      // Verify the name is not available (i.e., it exists and is not expired)
      // For renewal, we need the name to exist (ownerOf returns non-zero address)
      expect(nftOwner).to.not.equal('0x0000000000000000000000000000000000000000');
      
      // Get current block timestamp for expiry calculation
      const currentBlock = await client.getBlock();
      const currentTime = currentBlock.timestamp;
      const expectedInitialExpiry = currentTime + initialDuration * YEAR_IN_SECONDS;

      // Verify initial expiry
      const actualInitialExpiry = await registryContract.read.expiries([nodeHash]);
      expect(actualInitialExpiry).to.be.closeTo(expectedInitialExpiry, 100n);

      // Renew the name for additional 1 year
      const renewTx = await registrarContract.write.renew(
        [label, renewalDuration],
        {
          account: user01.account,
          value: renewalPrice,
        }
      );

      // Verify new expiry (should be initial expiry + renewal duration)
      const expectedNewExpiry = actualInitialExpiry + renewalDuration * YEAR_IN_SECONDS;
      const actualNewExpiry = await registryContract.read.expiries([nodeHash]);
      expect(actualNewExpiry).to.equal(expectedNewExpiry);

      // Verify the NameRenewed event was emitted
      const renewReceipt = await client.getTransactionReceipt({ hash: renewTx });
      const eventLog = renewReceipt.logs.find(
        (log) =>
          log.address.toLowerCase() === registrarContract.address.toLowerCase()
      );
      expect(eventLog).to.not.be.undefined;

      // Verify balances
      const finalBalance = await client.getBalance({
        address: user01.account.address,
      });
      const treasuryAfterBalance = await client.getBalance({
        address: treasury.account.address,
      });

      // Get actual transaction costs
      const registerReceipt = await client.getTransactionReceipt({ hash: registerTx });
      const renewReceipt2 = await client.getTransactionReceipt({ hash: renewTx });
      
      const registerTxDetails = await client.getTransaction({ hash: registerTx });
      const renewTxDetails = await client.getTransaction({ hash: renewTx });
      
      const registerGasPrice = registerTxDetails.gasPrice || registerTxDetails.maxFeePerGas || 0n;
      const renewGasPrice = renewTxDetails.gasPrice || renewTxDetails.maxFeePerGas || 0n;
      
      const registerGasCost = registerGasPrice * registerReceipt.gasUsed;
      const renewGasCost = renewGasPrice * renewReceipt2.gasUsed;
      const totalGasCost = registerGasCost + renewGasCost;

      const expectedFinalBalance = initialBalance - initialPrice - renewalPrice - totalGasCost;
      const expectedTreasuryBalance = treasuryBalance + initialPrice + renewalPrice;

      expect(finalBalance).to.equal(expectedFinalBalance);
      expect(treasuryAfterBalance).to.equal(expectedTreasuryBalance);
    });
  });

  describe('Renewal Failure Tests', () => {
    it('Should fail to renew non-registered name', async () => {
      const { registrarContract, user01 } =
        await loadFixture(deployRenewalFixture);

      const nonExistentLabel = 'nonexistent';
      const renewalDuration = 1n;

      // Try to renew non-registered name - should fail
      const nonExistentPrice = await registrarContract.read.rentPrice([
        nonExistentLabel,
        renewalDuration,
      ]);

      await expectContractCallToFail(
        async () =>
          await registrarContract.write.renew([nonExistentLabel, renewalDuration], {
            account: user01.account,
            value: nonExistentPrice,
          }),
        ERRORS.SUBNAME_DOES_NOT_EXIST
      );
    });

    it('Should fail to renew with insufficient funds', async () => {
      const { registrarContract, registryContract, user01 } =
        await loadFixture(deployRenewalFixture);

      const label = 'insufficienttest';
      const initialDuration = 1n;
      const renewalDuration = 1n;
      const owner = user01.account.address;

      // Get prices using the rentPrice function
      const initialPrice = await registrarContract.read.rentPrice([
        label,
        initialDuration,
      ]);
      const renewalPrice = await registrarContract.read.rentPrice([
        label,
        renewalDuration,
      ]);

      // Register the name first
      await registrarContract.write.register(
        [label, initialDuration, owner, []],
        {
          account: user01.account,
          value: initialPrice,
        }
      );

      // Try to renew with insufficient funds (less than required price)
      const insufficientAmount = renewalPrice - 1n; // Send 1 wei less than required

      await expectContractCallToFail(
        async () =>
          await registrarContract.write.renew([label, renewalDuration], {
            account: user01.account,
            value: insufficientAmount,
          }),
        ERRORS.INSUFFICIENT_FUNDS
      );
    });
  });
});
