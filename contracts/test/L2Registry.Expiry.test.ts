import { expect } from "chai";
import { namehash } from "viem";
import { setupRegistrarL2RegistryTest, ENS_NAME } from "./common";

describe("L2Registry - Expiry Management", function () {
  let l2Registry: any;
  let owner: string;
  let registrar: string;

  beforeEach(async function () {
    const setup = await setupRegistrarL2RegistryTest();
    l2Registry = setup.l2Registry;
    owner = setup.owner;
    registrar = setup.registrar;
  });

  describe("Expiry Validation", function () {
    const label = "alice";
    let node: string;

    beforeEach(async function () {
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should reject registration with past expiry", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      try {
        await l2Registry.write.register([label, BigInt(pastExpiry), owner, []], {
          account: registrar
        });
        expect.fail("Expected registration to fail with past expiry");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });

    it("Should accept registration with future expiry", async function () {
      const futureExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
      
      await l2Registry.write.register([label, BigInt(futureExpiry), owner, []], {
        account: registrar
      });

      const storedExpiry = await l2Registry.read.expiries([node]);
      expect(storedExpiry).to.equal(BigInt(futureExpiry));
    });

    it("Should reject expiry update with past time", async function () {
      // First register with valid expiry
      const validExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      await l2Registry.write.register([label, BigInt(validExpiry), owner, []], {
        account: registrar
      });

      // Try to update with past expiry
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      
      try {
        await l2Registry.write.setExpiry([node, BigInt(pastExpiry)], {
          account: registrar
        });
        expect.fail("Expected expiry update to fail with past time");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });

  describe("Expiry Updates", function () {
    const label = "bob";
    const initialExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    let node: string;

    beforeEach(async function () {
      // Register a subdomain first
      await l2Registry.write.register([label, BigInt(initialExpiry), owner, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should allow extending expiry", async function () {
      const newExpiry = initialExpiry + 365 * 24 * 60 * 60; // Add another year
      
      await l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
        account: registrar
      });

      const storedExpiry = await l2Registry.read.expiries([node]);
      expect(storedExpiry).to.equal(BigInt(newExpiry));
    });

    it("Should allow shortening expiry (but still in future)", async function () {
      const newExpiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
      
      await l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
        account: registrar
      });

      const storedExpiry = await l2Registry.read.expiries([node]);
      expect(storedExpiry).to.equal(BigInt(newExpiry));
    });

    it("Should reject expiry update for expired subdomain", async function () {
      // First expire the subdomain
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      await l2Registry.write.setExpiry([node, BigInt(pastExpiry)], {
        account: registrar
      });

      // Try to update expiry
      const newExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      
      try {
        await l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
          account: registrar
        });
        expect.fail("Expected expiry update to fail for expired subdomain");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });

  describe("Expired Token Behavior", function () {
    const label = "charlie";
    const expiry = Math.floor(Date.now() / 1000) + 1; // Expires in 1 second
    let node: string;
    let tokenId: bigint;

    beforeEach(async function () {
      // Register a subdomain that will expire soon
      await l2Registry.write.register([label, BigInt(expiry), owner, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
      tokenId = BigInt(node);
    });

    it("Should return zero address for expired token", async function () {
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const nftOwner = await l2Registry.read.ownerOf([tokenId]);
      expect(nftOwner).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("Should allow re-registration of expired subdomain", async function () {
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Re-register the same label
      const newExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      await l2Registry.write.register([label, BigInt(newExpiry), owner, []], {
        account: registrar
      });

      // Verify it was registered successfully
      const nftOwner = await l2Registry.read.ownerOf([tokenId]);
      expect(nftOwner).to.equal(owner);
    });
  });
});
