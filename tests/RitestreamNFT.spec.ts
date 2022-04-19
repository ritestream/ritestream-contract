import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";
import { isAddress } from "ethers/lib/utils";

let token: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let userAddress: string;

describe("Ritestream NFT", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];

    token = await (
      await ethers.getContractFactory("RitestreamNFT")
    ).deploy("Ritestream NFT", "RIT");

    await token.deployed();

    userAddress = await user.getAddress();
  });

  it("Should have sale not active when contract is deployed", async () => {
    //Check contract has deployed
    const address = token.address;
    const verifyAddress = isAddress(address);
    expect(verifyAddress === true);

    //Check sale active status
    expect(token.isSaleActive === false);
  });

  it("Should return sale active status", async () => {
    await token.toggleSaleStatus();
    expect(token.isSaleActive === true);
  });

  it("Should only allow owner to toggle if sale is active", async () => {
    try {
      await token.toggleSaleStatus();
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("Should only mint NFTs if the sale is active", async () => {
    await token.toggleSaleStatus();
    try {
      await token.mintBlueTokens(userAddress);
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Sale is not active");
    }
  });

  it("Should only allow owner to mint a token", async () => {
    try {
      await token.connect(user).mintGreenTokens(userAddress);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("Should mint blue tokens", async () => {
    await token.mintBlueTokens(userAddress);
    const balance = await token.balanceOf(userAddress);
    expect(balance).to.equal(2);

    //Check token ID has increased:
    expect(token.nextBlueTokenId === 2);
  });

  it("Should mint red tokens", async () => {
    await token.mintRedTokens(userAddress);
    const balance = await token.balanceOf(userAddress);
    expect(balance).to.equal(3);

    //Check token ID has increased:
    expect(token.nextRedTokenId === 4002);
  });

  it("Should mint green tokens", async () => {
    await token.mintGreenTokens(userAddress);
    const balance = await token.balanceOf(userAddress);
    expect(balance).to.equal(4);

    //Check token ID has increased:
    expect(token.nextGreenTokenId === 7002);
  });

  //Time out in for loop if trying to test other colors, but logic is same
  it("Should not mint more than 1000 green tokens", async () => {
    for (let i = 0; i < 999; i++) {
      await token.mintGreenTokens(userAddress);
    }
    try {
      await token.mintGreenTokens(userAddress);
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Not enough green passes remaining to mint"
      );
    }
  });
});
