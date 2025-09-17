import { expect } from "chai";
import { namehash } from "viem";
import { setupL2RegistryTest, ENS_NAME } from "./common";

describe("L2Registry - Resolver Integration", function () {
  let l2Registry: any;
  let owner: string;
  let registrar: string;
  let user1: string;
  let user2: string;

  beforeEach(async function () {
    const setup = await setupL2RegistryTest();
    l2Registry = setup.l2Registry;
    owner = setup.owner;
    registrar = setup.registrar;
    user1 = setup.user1;
    user2 = setup.user2;
  });

  describe("Address Resolution", function () {
    const label = "alice";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: string;

    beforeEach(async function () {
      // Register a subdomain
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should allow owner to set address", async function () {
      await l2Registry.write.setAddr([node, user2], {
        account: user1
      });

      const resolvedAddr = await l2Registry.read.addr([node]);
      expect(resolvedAddr).to.equal(user2);
    });

    it("Should not allow non-owner to set address", async function () {
      try {
        await l2Registry.write.setAddr([node, user2], {
          account: user2
        });
        expect.fail("Expected setAddr to fail for non-owner");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });

    it("Should return zero address when not set", async function () {
      const resolvedAddr = await l2Registry.read.addr([node]);
      expect(resolvedAddr).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("Text Records", function () {
    const label = "bob";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: string;

    beforeEach(async function () {
      // Register a subdomain
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should allow owner to set text records", async function () {
      const key = "description";
      const value = "Test description";

      await l2Registry.write.setText([node, key, value], {
        account: user1
      });

      const storedValue = await l2Registry.read.text([node, key]);
      expect(storedValue).to.equal(value);
    });

    it("Should not allow non-owner to set text records", async function () {
      const key = "description";
      const value = "Test description";

      try {
        await l2Registry.write.setText([node, key, value], {
          account: user2
        });
        expect.fail("Expected setText to fail for non-owner");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });

    it("Should return empty string when text not set", async function () {
      const key = "nonexistent";
      const storedValue = await l2Registry.read.text([node, key]);
      expect(storedValue).to.equal("");
    });
  });

  describe("Multicall Integration", function () {
    const label = "charlie";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: string;

    beforeEach(async function () {
      // Register a subdomain
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: registrar
      });
      node = namehash(`${label}.${ENS_NAME}`);
    });

    it("Should allow owner to use multicall", async function () {
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user2]);
      const setTextData = await l2Registry.read.setText.interface.encodeFunctionData("setText", [node, "url", "https://example.com"]);

      await l2Registry.write.multicall([setAddrData, setTextData], {
        account: user1
      });

      // Verify both records were set
      const resolvedAddr = await l2Registry.read.addr([node]);
      const resolvedText = await l2Registry.read.text([node, "url"]);
      
      expect(resolvedAddr).to.equal(user2);
      expect(resolvedText).to.equal("https://example.com");
    });

    it("Should not allow non-owner to use multicall", async function () {
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user2]);

      try {
        await l2Registry.write.multicall([setAddrData], {
          account: user2
        });
        expect.fail("Expected multicall to fail for non-owner");
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });

  describe("Registration with Resolver Data", function () {
    it("Should execute resolver data during registration", async function () {
      const label = "david";
      const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      const node = namehash(`${label}.${ENS_NAME}`);
      
      // Create resolver data
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user1]);
      const setTextData = await l2Registry.read.setText.interface.encodeFunctionData("setText", [node, "description", "Auto-set description"]);

      // Register with resolver data
      await l2Registry.write.register([label, BigInt(expiry), user1, [setAddrData, setTextData]], {
        account: registrar
      });

      // Verify resolver data was executed
      const resolvedAddr = await l2Registry.read.addr([node]);
      const resolvedText = await l2Registry.read.text([node, "description"]);
      
      expect(resolvedAddr).to.equal(user1);
      expect(resolvedText).to.equal("Auto-set description");
    });
  });
});
