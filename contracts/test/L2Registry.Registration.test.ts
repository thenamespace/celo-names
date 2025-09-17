import { expect } from "chai";
import { namehash } from "viem";
import { equalsIgnoreCase } from "./utils";
import { setupRegistrarL2RegistryTest, TOKEN_NAME, TOKEN_SYMBOL, ENS_NAME } from "./common";

describe("L2Registry - Registration", function () {
  let l2Registry: any;
  let owner: string;
  let registrar: string;

  beforeEach(async function () {
    const setup = await setupRegistrarL2RegistryTest();
    l2Registry = setup.l2Registry;
    owner = setup.owner;
    registrar = setup.registrar;
  });

  it("Should set the correct name and symbol", async function () {
    expect(await l2Registry.read.name()).to.equal(TOKEN_NAME);
    expect(await l2Registry.read.symbol()).to.equal(TOKEN_SYMBOL);
  });

  it("Should allow registrar to register a subdomain", async function () {
    const label = "alice";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

    // Register the subdomain
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

  it("Should handle registration with resolver data", async function () {
    const label = "bob";
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    
    // Create resolver data for setting address
    const subnode = namehash(`${label}.${ENS_NAME}`);
    const setAddrData = await l2Registry.read.setAddr.interface.encodeFunctionData("setAddr", [subnode, owner]);

    // Register with resolver data
    await l2Registry.write.register([label, BigInt(expiry), owner, [setAddrData]], {
      account: registrar
    });

    // Verify the address was set via resolver
    const resolvedAddr = await l2Registry.read.addr([subnode]);
    expect(resolvedAddr).to.equal(owner);
  });

  it("Should handle multiple registrations", async function () {
    const labels = ["charlie", "david", "eve"];
    const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const subnode = namehash(`${label}.${ENS_NAME}`);
      
      await l2Registry.write.register([label, BigInt(expiry), owner, []], {
        account: registrar
      });

      // Verify each registration
      const tokenId = BigInt(subnode);
      const nftOwner = await l2Registry.read.ownerOf([tokenId]);
      expect(nftOwner).to.equal(owner);
    }
  });
});
