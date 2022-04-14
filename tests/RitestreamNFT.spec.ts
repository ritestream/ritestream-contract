import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";

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

  it("Should return sale active status", async () => {
    await token.toggleSaleStatus();
    expect(token.isSaleActive === true);
  });

  it("Should return the next blue token ID", async () => {
    const nextBlueTokenId = token.nextBlueTokenId();
    expect(nextBlueTokenId === 1);
  });

  it("Should return the next red token ID", async () => {
    const nextRedTokenId = token.nextRedTokenId();
    expect(nextRedTokenId === 4001);
  });

  it("Should return the next green token ID", async () => {
    const nextGreenTokenId = token.nextGreenTokenId();
    expect(nextGreenTokenId === 7001);
  });

  it("Should mint blue tokens", async () => {
    await token.mintBlueTokens(userAddress);
    const balance = await token.balanceOf(userAddress);
    expect(balance).to.equal(1);
  });

  it("Should mint red tokens", async () => {
    await token.mintRedTokens(userAddress);
    const balance = await token.balanceOf(userAddress);
    expect(balance).to.equal(2);
  });

  it("Should mint green tokens", async () => {
    await token.mintGreenTokens(userAddress);
    const balance = await token.balanceOf(userAddress);
    expect(balance).to.equal(3);
  });

  it("Should increase the blue token ID", async () => {
    const updatedBlueTokenId = token.nextBlueTokenId();
    expect(updatedBlueTokenId === 2);
  });

  it("Should increase the red token ID", async () => {
    const updatedRedTokenId = token.nextRedTokenId();
    expect(updatedRedTokenId === 4002);
  });

  it("Should increase the green token ID", async () => {
    const updatedGreenTokenId = token.nextGreenTokenId();
    expect(updatedGreenTokenId === 7002);
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

  it("Should only allow owner to toggle if sale is active", async () => {
    try {
      await token.toggleSaleStatus();
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("Should not mint if sale is not active", async () => {
    await token.toggleSaleStatus();
    try {
      await token.mintBlueTokens(userAddress);
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Sale is not active");
    }
  });
});
