import { ethers, network } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { createTestUser, getRevertMessage } from "./utils";

let token: tsEthers.Contract;
let vesting: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let user1: tsEthers.Wallet;
let user2: tsEthers.Wallet;
let user3: tsEthers.Wallet;
let user4: tsEthers.Wallet;

describe("Vault Contract", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];
    user1 = await createTestUser(deployer);
    user2 = await createTestUser(deployer);
    user3 = await createTestUser(deployer);
    user4 = await createTestUser(deployer);

    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Ritestream Token", "RITE", 18);

    vesting = await (
      await ethers.getContractFactory("MultiVesting")
    ).deploy(
      Math.floor(Date.now()),
      Math.floor(Date.now() - 1000*60*60),
      1000*60*60*24*10,
      1000*60*60*24,
      1000,
      token.address,
      [user1.address, user2.address],
      [ethers.BigNumber.from("100"), ethers.BigNumber.from("200")],
      [true, false]
    );

    await token.mint(vesting.address, "1000");
  });

  it("Should allow adding new vestor to contract", async () => {
    await vesting.connect(deployer).addVestor(user3.address, ethers.BigNumber.from("700"), false);
    const balance = await vesting.getShare(user3.address);
    expect(balance).to.equal(ethers.BigNumber.from("700"));
  });

  it("Shouldn't allow adding new vestor to contract with share over available tokens", async () => {
    try {
      await vesting.connect(deployer).addVestor(user4.address, ethers.BigNumber.from("1"), false);
      throw new Error("Allowed adding vestor with share over limit");
    } catch (error) {
      const revertReason = getRevertMessage(error);
      expect(revertReason).to.equal(
        "The contract doesn't have enough tokens to add this vestor"
      );
    }
  });

  it("Should vest nothing at the start", async () => {
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal("0");
  });

  it("Should vest nothing after 1 hour", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal("0");
    const balance2 = await vesting.releasableAmount(user2.address);
    expect(balance2).to.equal("0");
  });

  it("Should vest nothing after 23 hours 59 minutes", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24 - 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal("0");
    const balance2 = await vesting.releasableAmount(user2.address);
    expect(balance2).to.equal("0");
  });

  it("Should vest 10% after 1 day", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
    const balance2 = await vesting.releasableAmount(user2.address);
    expect(balance2).to.equal(ethers.BigNumber.from("20"));
  });

  it("Should vest 30% after 3 days", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*3 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("30"));
    const balance2 = await vesting.releasableAmount(user2.address);
    expect(balance2).to.equal(ethers.BigNumber.from("60"));
  });

  it("Should allow 30% claim after 3 days", async () => {
    await vesting.connect(user1).release()
    await vesting.connect(user2).release()
    const balance = await token.balanceOf(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("30"));
    const balance2 = await token.balanceOf(user2.address);
    expect(balance2).to.equal(ethers.BigNumber.from("60"));
  });

  it("Should reset available vesting if released", async () => {
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("0"));
    const balance2 = await vesting.releasableAmount(user2.address);
    expect(balance2).to.equal(ethers.BigNumber.from("0"));
  });

  it("Should allow more claiming after 1 day has passed", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*4 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
    const balance2 = await vesting.releasableAmount(user2.address);
    expect(balance2).to.equal(ethers.BigNumber.from("20"));
  });

  it("Shouldn't allow revoking unrevokable vestors", async () => {
    try {
      await vesting.connect(deployer).revokeVestor(user2.address);
      throw new Error("Allowed revoking unrevokable vestor");
    } catch (error) {
      const revertReason = getRevertMessage(error);
      expect(revertReason).to.equal(
        "Vestor is not revocable"
      );
    }
  });

  it("Should return the unvested tokens from a vestor after revoke", async () => {
    const vestedTokens = await vesting.getTotalVestedTokens();
    await vesting.connect(deployer).revokeVestor(user1.address);
    const newVestedTokens = await vesting.getTotalVestedTokens();
    expect(newVestedTokens).to.equal(vestedTokens.sub(ethers.BigNumber.from("60")));
  });

  it("Should allow claiming existing claimable after revoke", async () => {
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
  });

  it("Shouldn't vest anymore after being revoked", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*5 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
  });

  it("Should release full amount after 10 days", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*10 + 1000)])
    await vesting.connect(user2).release()
    const balance = await token.balanceOf(user2.address);
    expect(balance).to.equal(ethers.BigNumber.from("200"));
    const releaseable = await vesting.releasableAmount(user2.address);
    expect(releaseable).to.equal(ethers.BigNumber.from("0"));
    const totalVested = await vesting.vestedAmount(user2.address);
    expect(totalVested).to.equal(ethers.BigNumber.from("200"));
  });
});
