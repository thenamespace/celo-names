import { expect } from "chai";
import { viem } from "hardhat";
import { parseEther, parseUnits } from "viem";
import { getContract, type Hash, type Address } from "viem";
import { L2Registry } from "../typechain-types";

describe("L2Registry", function () {
  let l2Registry: L2Registry;
  let owner: Address;
  let controller: Address;
  let admin: Address;
  let user1: Address;
  let user2: Address;
  let accounts: Address[];

  const ENS_NAME = "celo";
  const TOKEN_NAME = "Celo Names";
  const TOKEN_SYMBOL = "CNAME";

  beforeEach(async function () {
    const [ownerAccount, controllerAccount, adminAccount, user1Account, user2Account, ...otherAccounts] = await viem.getWalletClients();
    
    owner = ownerAccount.account.address;
    controller = controllerAccount.account.address;
    admin = adminAccount.account.address;
    user1 = user1Account.account.address;
    user2 = user2Account.account.address;
    accounts = otherAccounts.map(acc => acc.account.address);

    // Deploy L2Registry
    const l2RegistryContract = await viem.deployContract("L2Registry", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      ENS_NAME
    ]);

    l2Registry = getContract({
      address: l2RegistryContract.address,
      abi: l2RegistryContract.abi,
      client: ownerAccount,
    });

    // Set up roles
    await l2Registry.write.setController([controller, true]);
    await l2Registry.write.setAdmin([admin, true]);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await l2Registry.read.name()).to.equal(TOKEN_NAME);
      expect(await l2Registry.read.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the correct owner", async function () {
      expect(await l2Registry.read.owner()).to.equal(owner);
    });

    it("Should start with zero total supply", async function () {
      expect(await l2Registry.read.totalSupply()).to.equal(0n);
    });
  });

  describe("Role Management", function () {
    it("Should allow owner to set controller", async function () {
      const newController = accounts[0];
      
      await expect(l2Registry.write.setController([newController, true]))
        .to.emit(l2Registry, "ControllerChanged")
        .withArgs(newController, true);
      
      expect(await l2Registry.read.isController([newController])).to.be.true;
    });

    it("Should allow owner to set admin", async function () {
      const newAdmin = accounts[0];
      
      await expect(l2Registry.write.setAdmin([newAdmin, true]))
        .to.emit(l2Registry, "AdminChanged")
        .withArgs(newAdmin, true);
      
      expect(await l2Registry.read.isAdmin([newAdmin])).to.be.true;
    });

    it("Should not allow non-owner to set controller", async function () {
      const newController = accounts[0];
      
      await expect(
        l2Registry.write.setController([newController, true], {
          account: user1
        })
      ).to.be.revertedWithCustomError(l2Registry, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to set admin", async function () {
      const newAdmin = accounts[0];
      
      await expect(
        l2Registry.write.setAdmin([newAdmin, true], {
          account: user1
        })
      ).to.be.revertedWithCustomError(l2Registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Registration", function () {
    const label = "alice";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

    it("Should allow controller to register a subname", async function () {
      await expect(
        l2Registry.write.register([label, BigInt(expiry), user1, []], {
          account: controller
        })
      ).to.emit(l2Registry, "NewSubname")
        .withArgs(label, BigInt(expiry), user1, expect.any(BigInt));

      // Check token ownership
      const node = await l2Registry.read.namehash([ENS_NAME, label]);
      const tokenId = BigInt(node);
      expect(await l2Registry.read.ownerOf([tokenId])).to.equal(user1);
    });

    it("Should not allow non-controller to register", async function () {
      await expect(
        l2Registry.write.register([label, BigInt(expiry), user1, []], {
          account: user1
        })
      ).to.be.revertedWithCustomError(l2Registry, "NotController");
    });

    it("Should not allow registration with invalid expiry", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      await expect(
        l2Registry.write.register([label, BigInt(pastExpiry), user1, []], {
          account: controller
        })
      ).to.be.revertedWith("Invalid expiry");
    });

    it("Should not allow registration of taken subname", async function () {
      // First registration
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: controller
      });

      // Second registration should fail
      await expect(
        l2Registry.write.register([label, BigInt(expiry), user2, []], {
          account: controller
        })
      ).to.be.revertedWith("Subname taken");
    });

    it("Should allow re-registration of expired subname", async function () {
      // First registration
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: controller
      });

      // Set expiry to past
      const node = await l2Registry.read.namehash([ENS_NAME, label]);
      await l2Registry.write.setExpiry([node, BigInt(Math.floor(Date.now() / 1000) - 3600)], {
        account: controller
      });

      // Should allow re-registration
      await expect(
        l2Registry.write.register([label, BigInt(expiry), user2, []], {
          account: controller
        })
      ).to.emit(l2Registry, "NewSubname");
    });

    it("Should handle multicall data during registration", async function () {
      // Create multicall data for setting address
      const node = await l2Registry.read.namehash([ENS_NAME, label]);
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user1]);
      
      await expect(
        l2Registry.write.register([label, BigInt(expiry), user1, [setAddrData]], {
          account: controller
        })
      ).to.emit(l2Registry, "NewSubname");

      // Verify address was set
      expect(await l2Registry.read.addr([node])).to.equal(user1);
    });

    it("Should not allow direct access to multicallWithNodeCheck", async function () {
      // This should fail because multicallWithNodeCheck is now internal
      const node = await l2Registry.read.namehash([ENS_NAME, label]);
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user1]);
      
      await expect(
        l2Registry.write.multicallWithNodeCheck([node, [setAddrData]], {
          account: user1
        })
      ).to.be.reverted; // Should revert because function is internal
    });
  });

  describe("Expiry Management", function () {
    const label = "bob";
    const initialExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: Hash;

    beforeEach(async function () {
      await l2Registry.write.register([label, BigInt(initialExpiry), user1, []], {
        account: controller
      });
      node = await l2Registry.read.namehash([ENS_NAME, label]);
    });

    it("Should allow controller to set expiry", async function () {
      const newExpiry = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60; // 2 years
      
      await expect(
        l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
          account: controller
        })
      ).to.emit(l2Registry, "ExpirySet")
        .withArgs(node, BigInt(newExpiry));
    });

    it("Should not allow setting expiry for expired subname", async function () {
      // Set to expired
      await l2Registry.write.setExpiry([node, BigInt(Math.floor(Date.now() / 1000) - 3600)], {
        account: controller
      });

      const newExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      
      await expect(
        l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
          account: controller
        })
      ).to.be.revertedWith("Subname already expired");
    });

    it("Should not allow non-controller to set expiry", async function () {
      const newExpiry = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60;
      
      await expect(
        l2Registry.write.setExpiry([node, BigInt(newExpiry)], {
          account: user1
        })
      ).to.be.revertedWithCustomError(l2Registry, "NotController");
    });

    it("Should not allow setting invalid expiry", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      
      await expect(
        l2Registry.write.setExpiry([node, BigInt(pastExpiry)], {
          account: controller
        })
      ).to.be.revertedWith("Invalid expiry");
    });
  });

  describe("Revocation", function () {
    const label = "charlie";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: Hash;

    beforeEach(async function () {
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: controller
      });
      node = await l2Registry.read.namehash([ENS_NAME, label]);
    });

    it("Should allow admin to revoke subname", async function () {
      await expect(
        l2Registry.write.revoke([node], {
          account: admin
        })
      ).to.emit(l2Registry, "SubnameRevoked")
        .withArgs(node, admin);

      // Token should be burned
      const tokenId = BigInt(node);
      expect(await l2Registry.read.ownerOf([tokenId])).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("Should not allow non-admin to revoke", async function () {
      await expect(
        l2Registry.write.revoke([node], {
          account: user1
        })
      ).to.be.revertedWithCustomError(l2Registry, "NotAdmin");
    });

    it("Should clear records when revoking", async function () {
      // Set some records first
      await l2Registry.write.setAddr([node, user1], {
        account: user1
      });

      // Revoke
      await l2Registry.write.revoke([node], {
        account: admin
      });

      // Records should be cleared (version incremented)
      const version = await l2Registry.read.recordVersions([node]);
      expect(version).to.be.greaterThan(0n);
    });
  });

  describe("Token Ownership", function () {
    const label = "david";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: Hash;
    let tokenId: bigint;

    beforeEach(async function () {
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: controller
      });
      node = await l2Registry.read.namehash([ENS_NAME, label]);
      tokenId = BigInt(node);
    });

    it("Should return correct owner for valid token", async function () {
      expect(await l2Registry.read.ownerOf([tokenId])).to.equal(user1);
    });

    it("Should return zero address for expired token", async function () {
      // Set expiry to past
      await l2Registry.write.setExpiry([node, BigInt(Math.floor(Date.now() / 1000) - 3600)], {
        account: controller
      });

      expect(await l2Registry.read.ownerOf([tokenId])).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("Should allow token transfer", async function () {
      await l2Registry.write.transferFrom([user1, user2, tokenId], {
        account: user1
      });

      expect(await l2Registry.read.ownerOf([tokenId])).to.equal(user2);
    });

    it("Should not allow transfer of expired token", async function () {
      // Set expiry to past
      await l2Registry.write.setExpiry([node, BigInt(Math.floor(Date.now() / 1000) - 3600)], {
        account: controller
      });

      await expect(
        l2Registry.write.transferFrom([user1, user2, tokenId], {
          account: user1
        })
      ).to.be.revertedWithCustomError(l2Registry, "ERC721InvalidSender");
    });
  });

  describe("Resolver Functionality", function () {
    const label = "eve";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    let node: Hash;

    beforeEach(async function () {
      await l2Registry.write.register([label, BigInt(expiry), user1, []], {
        account: controller
      });
      node = await l2Registry.read.namehash([ENS_NAME, label]);
    });

    it("Should allow owner to set address", async function () {
      await l2Registry.write.setAddr([node, user2], {
        account: user1
      });

      expect(await l2Registry.read.addr([node])).to.equal(user2);
    });

    it("Should not allow non-owner to set address", async function () {
      await expect(
        l2Registry.write.setAddr([node, user2], {
          account: user2
        })
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow owner to set text records", async function () {
      const key = "description";
      const value = "Test description";

      await l2Registry.write.setText([node, key, value], {
        account: user1
      });

      expect(await l2Registry.read.text([node, key])).to.equal(value);
    });

    it("Should support multicall for authorized users", async function () {
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user2]);
      const setTextData = await l2Registry.read.setText.interface.encodeFunctionData("setText", [node, "url", "https://example.com"]);

      await l2Registry.write.multicall([setAddrData, setTextData], {
        account: user1
      });

      expect(await l2Registry.read.addr([node])).to.equal(user2);
      expect(await l2Registry.read.text([node, "url"])).to.equal("https://example.com");
    });

    it("Should not allow unauthorized multicall", async function () {
      const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [node, user2]);

      await expect(
        l2Registry.write.multicall([setAddrData], {
          account: user2 // user2 is not the owner of the node
        })
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      expect(await l2Registry.read.supportsInterface(["0x80ac58cd"])).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      expect(await l2Registry.read.supportsInterface(["0x5b5e139f"])).to.be.true;
    });

    it("Should support resolver interfaces", async function () {
      // AddrResolver interface
      expect(await l2Registry.read.supportsInterface(["0x3b3b57de"])).to.be.true;
      // TextResolver interface
      expect(await l2Registry.read.supportsInterface(["0x59d1d68c"])).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very long labels", async function () {
      const longLabel = "a".repeat(1000);
      const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(
        l2Registry.write.register([longLabel, BigInt(expiry), user1, []], {
          account: controller
        })
      ).to.emit(l2Registry, "NewSubname");
    });

    it("Should handle labels with special characters", async function () {
      const specialLabel = "test-name_123";
      const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(
        l2Registry.write.register([specialLabel, BigInt(expiry), user1, []], {
          account: controller
        })
      ).to.emit(l2Registry, "NewSubname");
    });

    it("Should handle case sensitivity", async function () {
      const label1 = "Alice";
      const label2 = "alice";
      const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      // Both should be allowed as different labels
      await l2Registry.write.register([label1, BigInt(expiry), user1, []], {
        account: controller
      });

      await l2Registry.write.register([label2, BigInt(expiry), user2, []], {
        account: controller
      });

      const node1 = await l2Registry.read.namehash([ENS_NAME, label1]);
      const node2 = await l2Registry.read.namehash([ENS_NAME, label2]);
      
      expect(node1).to.not.equal(node2);
    });
  });
});
