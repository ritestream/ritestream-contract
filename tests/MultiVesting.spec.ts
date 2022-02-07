import { ethers, network } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { createTestUser } from "./utils";

let token: tsEthers.Contract;
let vesting: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let user1: tsEthers.Wallet;

describe("Vault Contract", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];
    user1 = await createTestUser(deployer);

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
      100000000000,
      token.address,
      [user1.address],
      [ethers.BigNumber.from("100")],
      [true]
    );

    await token.mint(vesting.address, "1000000000000000000000000");
  });

  it("Should vest nothing at the start", async () => {
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal("0");
  });

  it("Should vest nothing after 1 hour", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal("0");
  });

  it("Should vest nothing after 23 hours 59 minutes", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24 - 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal("0");
  });

  it("Should vest 10% after 1 day", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
  });

  it("Should vest 30% after 3 days", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*3 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("30"));
  });

  it("Should allow 30% claim after 3 days", async () => {
    const userVesting = await vesting.connect(user1) 
    await userVesting.release();
    const balance = await token.balanceOf(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("30"));
  });

  it("Should reset available vesting if released", async () => {
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("0"));
  });

  it("Should allow more claiming after 1 day has passed", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*4 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
  });

  it("Should allow claiming existing claimable after revoke", async () => {
    await vesting.connect(deployer).revokeVestor(user1.address);
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
  });

  it("Shouldn't vest anymore after being revoked", async () => {
    await network.provider.send("evm_mine", [Date.now() + (1000*60*60*24*5 + 1000)])
    const balance = await vesting.releasableAmount(user1.address);
    expect(balance).to.equal(ethers.BigNumber.from("10"));
  });
});
