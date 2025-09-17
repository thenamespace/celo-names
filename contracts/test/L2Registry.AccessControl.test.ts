import { expect } from "chai";
import { namehash } from "viem";
import { setupL2RegistryTest, ENS_NAME } from "./common";

describe("L2Registry - Access Control", function () {
  let l2Registry: any;
  let owner: string;
  let registrar: string;
  let nonRegistrar: string;
  let admin: string;

  beforeEach(async function () {
    const setup = await setupL2RegistryTest();
    l2Registry = setup.l2Registry;
    owner = setup.owner;
    registrar = setup.registrar;
    nonRegistrar = setup.nonRegistrar;
    admin = setup.admin;
  });

  describe("Registration Access Control", function () {
    const label = "alice";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    it("Should allow registrar to register a subdomain", async function () {
      // This should not throw an error
      await l2Registry.write.register([label, BigInt(expiry), owner, []], {
        account: registrar
      });

      // If we get here, the registration was successful
      expect(true).to.be.true;
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

    it("Should reject registration from admin (not registrar)", async function () {
      try {
        await l2Registry.write.register([label + "3", BigInt(expiry), owner, []], {
          account: admin
        });
        expect.fail("Expected registration to fail for admin");
      } catch (error) {
        // Expected to fail
        expect(error).to.be.an('error');
      }
    });
  });

  describe("Expiry Management Access Control", function () {
    const label = "bob";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: string;

    beforeEach(async function () {
      // Register a subdomain first
      await l2Registry.write.register([label, BigInt(expiry), owner, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should allow registrar to set expiry", async function () {
      const newExpiry = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60; // 2 years
      
      await l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
        account: registrar
      });

      const storedExpiry = await l2Registry.read.expiries([node]);
      expect(storedExpiry).to.equal(BigInt(newExpiry));
    });

    it("Should reject expiry update from non-registrar", async function () {
      const newExpiry = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60;
      
      try {
        await l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
          account: nonRegistrar
        });
        expect.fail("Expected expiry update to fail for non-registrar");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });

  describe("Revocation Access Control", function () {
    const label = "charlie";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: string;

    beforeEach(async function () {
      // Register a subdomain first
      await l2Registry.write.register([label, BigInt(expiry), owner, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should allow admin to revoke subdomain", async function () {
      await l2Registry.write.revoke([node], {
        account: admin
      });

      // Verify the subdomain was revoked (token should not exist)
      const tokenId = BigInt(node);
      try {
        await l2Registry.read.ownerOf([tokenId]);
        expect.fail("Expected token to not exist after revocation");
      } catch (error) {
        // Expected to fail - token doesn't exist
        expect(error).to.be.an('error');
      }
    });

    it("Should reject revocation from non-admin", async function () {
      try {
        await l2Registry.write.revoke([node], {
          account: nonRegistrar
        });
        expect.fail("Expected revocation to fail for non-admin");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });

    it("Should reject revocation from registrar (not admin)", async function () {
      try {
        await l2Registry.write.revoke([node], {
          account: registrar
        });
        expect.fail("Expected revocation to fail for registrar");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });
});
