import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getEventData, getRevertMessage } from "./utils";
import { deployProxy, deployContract } from "../scripts/deploy/utils";

let token: tsEthers.Contract;
let vault: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;

describe("Vault Contract", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];
    token = await deployProxy(
      "TokenUpgradeable",
      ["Ritestream Token", "RITE", 18],
      deployer,
      1
    );

    vault = await (
      await ethers.getContractFactory("Vault")
    ).deploy(token.address);

    //Mint token to vault contract
    await token.mint(vault.address, "1000000000000000000000000");
    //Mint token to user wallet so that user can deposit tokens to vault
    await token.mint(await user.getAddress(), "1000000000000000000000000");
  });

  it("Should get token balance of vault contract", async () => {
    const balance = await token.balanceOf(vault.address);
    expect(balance).to.equal("1000000000000000000000000");
  });

  it("Should not allow user to deposit", async () => {
    const userAddress = await user.getAddress();
    try {
      await vault
        .connect(user)
        .userDeposit(userAddress, "1000000000000000000000000");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("Should allow owner to deposit and get deposited event", async () => {
    const userAddress = await user.getAddress();

    await token
      .connect(user)
      .approve(vault.address, "1000000000000000000000000");
    const tx = await (
      await vault.userDeposit(userAddress, "1000000000000000000000000")
    ).wait(1);
    const event = getEventData("Deposited", vault, tx);
    expect(event.from).to.equal(userAddress);
    expect(event.amount).to.equal("1000000000000000000000000");

    const newContractBalance = await token.balanceOf(vault.address);
    expect(newContractBalance).to.equal("2000000000000000000000000");
  });

  it("Should not allow user to withdraw", async () => {
    const userAddress = await user.getAddress();
    try {
      await vault
        .connect(user)
        .userWithdraw(userAddress, "1000000000000000000000000");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("Should allow owner to withdraw token to user address", async () => {
    const userAddress = await user.getAddress();
    const tx = await (
      await vault.userWithdraw(userAddress, "1000000000000000000000000")
    ).wait(1);
    const event = getEventData("Withdrawn", vault, tx);
    expect(event.to).to.equal(userAddress);
    expect(event.amount).to.equal("1000000000000000000000000");

    const userBalanceAfter = await token.balanceOf(userAddress);
    expect(userBalanceAfter).to.equal("1000000000000000000000000");
  });
});
