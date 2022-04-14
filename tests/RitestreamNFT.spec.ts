import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { isAddress } from "ethers/lib/utils";

let token: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Wallet;

describe("Ritestream NFT", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    token = await (
      await ethers.getContractFactory("RitestreamNFT")
    ).deploy("Ritestream NFT", "RIT");
    user = new ethers.Wallet(
      "0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef",
      deployer.provider
    );
  });

  //Blue Token Tests
  it("Should ");
  it("Should mint tokens", async () => {
    await token.mint(user.address, "https://www.token-uri.com/nft");

    //Sale must be active

    //Check tokenId

    //Only Owner can mint

    //Transfers to user

    //Increases token count
  });
});
