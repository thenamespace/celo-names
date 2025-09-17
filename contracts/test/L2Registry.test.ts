import { expect } from "chai";
import { viem } from "hardhat";
import { getContract, type Address, keccak256, toHex, namehash } from "viem";
import { equalsIgnoreCase } from "./utils";


describe("L2Registry", function () {
  let l2Registry: any;
  let owner: Address;
  let registrar: Address;
  let nonRegistrar: Address;

  const TOKEN_NAME = "Celo Names";
  const TOKEN_SYMBOL = "CNAME";
  const ENS_NAME = "celo.eth";
  const PARENT_NODE = namehash(ENS_NAME);

  beforeEach(async function () {
    const [ownerAccount, registrarAccount, nonRegistrarAccount] = await viem.getWalletClients();
    owner = ownerAccount.account.address;
    registrar = registrarAccount.account.address;
    nonRegistrar = nonRegistrarAccount.account.address;

    // Deploy L2Registry
    const l2RegistryContract = await viem.deployContract("L2Registry", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      PARENT_NODE
    ]);

    l2Registry = getContract({
      address: l2RegistryContract.address,
      abi: l2RegistryContract.abi,
      client: ownerAccount,
    });

    // Set up registrar role
    await l2Registry.write.setRegistrar([registrar, true]);
  });

  it("Should set the correct name and symbol", async function () {
    expect(await l2Registry.read.name()).to.equal(TOKEN_NAME);
    expect(await l2Registry.read.symbol()).to.equal(TOKEN_SYMBOL);
  });

  describe("Registration Access Control", function () {
    const label = "alice";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

    it("Should allow registrar to register a subdomain", async function () {
      // Register the subdomain - this should not throw an error
      await l2Registry.write.register([label, BigInt(expiry), owner, []], {
        account: registrar
      });

      const subnode = namehash(`${label}.${ENS_NAME}`);

      // Verify NFT ownership by checking ownerOf
      const tokenId = BigInt(subnode);
      const nftOwner = await l2Registry.read.ownerOf([tokenId])
      expect(equalsIgnoreCase(nftOwner, owner), `Expected NFT owner to be ${owner} but got ${nftOwner}`).to.be.true;

      // Verify the label was stored correctly (case-insensitive)
      const storedLabel = await l2Registry.read.labels([subnode]);
      expect(storedLabel.toLowerCase(), `Expected label to be "${label}" but got "${storedLabel}"`).to.equal(label);

      // Verify the expiry was set correctly
      const storedExpiry = await l2Registry.read.expiries([subnode]);
      expect(storedExpiry, `Expected expiry to be ${expiry} but got ${storedExpiry}`).to.equal(BigInt(expiry));
    });

    it("Should reject registration from non-registrar", async function () {
      // This should throw an error
      try {
        await l2Registry.write.register([label + "2", BigInt(expiry), owner, []], {
          account: nonRegistrar
        });
        expect.fail("Expected registration to fail for non-registrar");
      } catch (error) {
        // Expected to fail
        expect(error).to.be.an('error');
      }
    });
  });
});
