import { expect } from "chai";
import { setupBasicL2RegistryTest, TOKEN_NAME, TOKEN_SYMBOL, PARENT_NODE } from "./common";

describe("L2Registry - Basic Setup", function () {
  let l2Registry: any;
  let owner: string;

  beforeEach(async function () {
    const setup = await setupBasicL2RegistryTest();
    l2Registry = setup.l2Registry;
    owner = setup.owner;
  });

  it("Should set the correct name and symbol", async function () {
    expect(await l2Registry.read.name()).to.equal(TOKEN_NAME);
    expect(await l2Registry.read.symbol()).to.equal(TOKEN_SYMBOL);
  });

  it("Should set the correct owner", async function () {
    expect(await l2Registry.read.owner()).to.equal(owner);
  });

  it("Should set the correct parent node", async function () {
    const storedParentNode = await l2Registry.read.parentNode();
    expect(storedParentNode).to.equal(PARENT_NODE);
  });

  it("Should support ERC721 interface", async function () {
    const erc721InterfaceId = "0x80ac58cd";
    expect(await l2Registry.read.supportsInterface([erc721InterfaceId])).to.be.true;
  });

  it("Should support ERC721Metadata interface", async function () {
    const erc721MetadataInterfaceId = "0x5b5e139f";
    expect(await l2Registry.read.supportsInterface([erc721MetadataInterfaceId])).to.be.true;
  });
});