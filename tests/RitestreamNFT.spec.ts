import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { isAddress } from "ethers/lib/utils";

let nftPass: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let userAddress: string;

const Colors = {
  Blue: 0,
  Red: 1,
  Green: 2
};

describe("Ritestream NFT", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];

    nftPass = await (
      await ethers.getContractFactory("RitestreamNFT")
    ).deploy("Ritestream NFT", "RIT");

    await nftPass.deployed();

    userAddress = await user.getAddress();
  });

  it("Should have sale not active when contract is deployed", async () => {
    //Check contract has deployed
    const address = nftPass.address;
    const verifyAddress = isAddress(address);
    expect(verifyAddress === true);

    //Check sale active status
    expect(nftPass.isSaleActive === false);
  });

  it("Should return sale active status", async () => {
    await nftPass.toggleSaleStatus();
    expect(nftPass.isSaleActive === true);
  });

  it("Should only allow owner to toggle if sale is active", async () => {
    await expect(nftPass.connect(user).toggleSaleStatus()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should only mint NFTs if the sale is active", async () => {
    await nftPass.toggleSaleStatus();
    await expect(nftPass.mintPass(userAddress, Colors.Blue)).to.be.revertedWith(
      "Sale is not active"
    );
  });

  it("Should only allow owner to mint a pass", async () => {
    await nftPass.toggleSaleStatus();
    await expect(
      nftPass.connect(user).mintPass(userAddress, Colors.Blue)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should mint blue passes", async () => {
    nftPass.connect(deployer);
    await nftPass.mintPass(userAddress, Colors.Blue);
    const balance = await nftPass.balanceOf(userAddress);
    expect(balance).to.equal(1);

    //Check pass ID
    const currentPassId = await nftPass.passes(Colors.Blue);
    expect(currentPassId === 1);
  });

  it("Should mint red passes", async () => {
    await nftPass.mintPass(userAddress, Colors.Red);
    const balance = await nftPass.balanceOf(userAddress);
    expect(balance).to.equal(2);

    //Check pass ID
    const currentPassId = await nftPass.passes(Colors.Red);
    expect(currentPassId === 4001);
  });

  it("Should mint green passes", async () => {
    await nftPass.mintPass(userAddress, Colors.Green);
    const balance = await nftPass.balanceOf(userAddress);
    expect(balance).to.equal(3);

    //Check pass ID
    const currentPassId = await nftPass.passes(Colors.Green);
    expect(currentPassId === 7001);
  });

  //Time out in for loop if trying to test other colors, but logic is same
  it("Should not mint more than 1000 green passes", async () => {
    for (let i = 0; i < 999; i++) {
      await nftPass.mintPass(userAddress, Colors.Green);
    }
    await expect(
      nftPass.mintPass(userAddress, Colors.Green)
    ).to.be.revertedWith("Not enough passes remaining to mint");
  });

  it("Should only allow owner to call renounceOwnership and new owner always be the fixed address ", async () => {
    await expect(nftPass.connect(user).renounceOwnership()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await nftPass.renounceOwnership();
    const newOwner = await nftPass.owner();
    expect(newOwner).to.equal("0x1156B992b1117a1824272e31797A2b88f8a7c729"); //this the fixed new owner address

    await expect(nftPass.renounceOwnership()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });
});
