import { expect } from "chai";
import { ethers } from "hardhat";
import { Names } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Names", function () {
  let names: Names;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addrs: HardhatEthersSigner[];

  const baseURI = "https://api.example.com/metadata/";

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const NamesFactory = await ethers.getContractFactory("Names");
    names = await NamesFactory.deploy(
      "Celo Names",
      "CNAME",
      baseURI
    );
    await names.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await names.name()).to.equal("Celo Names");
      expect(await names.symbol()).to.equal("CNAME");
    });

    it("Should set the correct owner", async function () {
      expect(await names.owner()).to.equal(owner.address);
    });

    it("Should set the correct base URI", async function () {
      // Test by checking tokenURI for token 0 (which doesn't exist yet, but baseURI should be set)
      // We'll mint a token first to test the base URI
      await names.mint(addr1.address, "test");
      const tokenURI = await names.tokenURI(0);
      expect(tokenURI).to.equal(baseURI + "0");
    });

    it("Should start with zero total supply", async function () {
      expect(await names.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint a new name", async function () {
      const name = "alice";
      
      await expect(names.mint(addr1.address, name))
        .to.emit(names, "NameMinted")
        .withArgs(addr1.address, 0, name);

      expect(await names.ownerOf(0)).to.equal(addr1.address);
      expect(await names.getName(0)).to.equal(name);
      expect(await names.totalSupply()).to.equal(1);
    });

    it("Should not allow non-owner to mint", async function () {
      const name = "bob";
      
      await expect(
        names.connect(addr1).mint(addr1.address, name)
      ).to.be.revertedWithCustomError(names, "OwnableUnauthorizedAccount");
    });

    it("Should not allow minting with empty name", async function () {
      await expect(
        names.mint(addr1.address, "")
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should not allow minting duplicate names", async function () {
      const name = "charlie";
      
      await names.mint(addr1.address, name);
      
      await expect(
        names.mint(addr2.address, name)
      ).to.be.revertedWith("Name already exists");
    });

    it("Should not allow minting to zero address", async function () {
      const name = "david";
      
      await expect(
        names.mint(ethers.ZeroAddress, name)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should increment token ID for each mint", async function () {
      await names.mint(addr1.address, "alice");
      await names.mint(addr2.address, "bob");
      
      expect(await names.ownerOf(0)).to.equal(addr1.address);
      expect(await names.ownerOf(1)).to.equal(addr2.address);
      expect(await names.totalSupply()).to.equal(2);
    });
  });

  describe("Name Management", function () {
    beforeEach(async function () {
      await names.mint(addr1.address, "alice");
      await names.mint(addr2.address, "bob");
    });

    it("Should return correct name for token ID", async function () {
      expect(await names.getName(0)).to.equal("alice");
      expect(await names.getName(1)).to.equal("bob");
    });

    it("Should revert when getting name for non-existent token", async function () {
      await expect(names.getName(2)).to.be.revertedWith("Token does not exist");
    });

    it("Should correctly check name availability", async function () {
      expect(await names.isNameAvailable("alice")).to.be.false;
      expect(await names.isNameAvailable("bob")).to.be.false;
      expect(await names.isNameAvailable("charlie")).to.be.true;
      expect(await names.isNameAvailable("")).to.be.true;
    });
  });

  describe("Base URI Management", function () {
    beforeEach(async function () {
      await names.mint(addr1.address, "test");
    });

    it("Should allow owner to update base URI", async function () {
      const newBaseURI = "https://newapi.example.com/metadata/";
      
      await names.setBaseURI(newBaseURI);
      
      // Test by checking tokenURI for an existing token
      const tokenURI = await names.tokenURI(0);
      expect(tokenURI).to.equal(newBaseURI + "0");
    });

    it("Should not allow non-owner to update base URI", async function () {
      const newBaseURI = "https://newapi.example.com/metadata/";
      
      await expect(
        names.connect(addr1).setBaseURI(newBaseURI)
      ).to.be.revertedWithCustomError(names, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC721 Compliance", function () {
    beforeEach(async function () {
      await names.mint(addr1.address, "alice");
    });

    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID
      const interfaceId = "0x80ac58cd";
      expect(await names.supportsInterface(interfaceId)).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      // ERC721Metadata interface ID
      const interfaceId = "0x5b5e139f";
      expect(await names.supportsInterface(interfaceId)).to.be.true;
    });

    it("Should return correct token URI", async function () {
      const tokenURI = await names.tokenURI(0);
      expect(tokenURI).to.equal(baseURI + "0");
    });

    it("Should allow token transfer", async function () {
      await names.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await names.ownerOf(0)).to.equal(addr2.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very long names", async function () {
      const longName = "a".repeat(1000);
      
      await expect(names.mint(addr1.address, longName))
        .to.emit(names, "NameMinted")
        .withArgs(addr1.address, 0, longName);
      
      expect(await names.getName(0)).to.equal(longName);
    });

    it("Should handle names with special characters", async function () {
      const specialName = "test-name_123!@#";
      
      await expect(names.mint(addr1.address, specialName))
        .to.emit(names, "NameMinted")
        .withArgs(addr1.address, 0, specialName);
      
      expect(await names.getName(0)).to.equal(specialName);
    });

    it("Should handle case sensitivity", async function () {
      await names.mint(addr1.address, "Alice");
      
      // Different case should be allowed
      expect(await names.isNameAvailable("alice")).to.be.true;
      expect(await names.isNameAvailable("ALICE")).to.be.true;
    });
  });
});
