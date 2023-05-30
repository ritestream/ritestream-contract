import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getEventData, getRevertMessage } from "./utils";

let token: tsEthers.Contract;
let vault: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;

xdescribe("Vault Contract", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];
    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Ritestream Token", "RITE", 18);

    vault = await (
      await ethers.getContractFactory("Vault")
    ).deploy(token.address);

    //Mint token to vault contract
    await token.transfer(vault.address, "100000000000000000000000");
    //Mint token to user wallet so that user can deposit tokens to vault
    await token.transfer(await user.getAddress(), "1000000000000000000000");
  });

  it("Should get token balance of vault contract", async () => {
    const balance = await token.balanceOf(vault.address);
    expect(balance).to.equal("100000000000000000000000");
  });

  it("Should not allow user to deposit", async () => {
    const userAddress = await user.getAddress();
    try {
      await vault
        .connect(user)
        .userDeposit(userAddress, "1000000000000000000000");
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("User should sign approve message", async () => {
    const userAddress = await user.getAddress();
    const tx = await token
      .connect(user)
      .getMessageHash(userAddress, vault.address, "1000000000000000000000");
    const signature = await user.signMessage(tx);
    expect(tx).not.equal(undefined);
    expect(signature).not.equal(undefined);
  });

  it("Should allow owner to set users allowance with signature and deposit token then get deposit event", async () => {
    const userAddress = await user.getAddress();
    const messageHash = await token
      .connect(user)
      .getMessageHash(userAddress, vault.address, "1000000000000000000000");
    const signature = await user.signMessage(
      ethers.utils.arrayify(messageHash)
    );

    await token.setAllowanceWithSignature(
      userAddress,
      vault.address,
      "1000000000000000000000",
      ethers.utils.arrayify(signature)
    );

    const userAfterAllowance = await token
      .connect(user)
      .allowance(userAddress, vault.address);

    expect(userAfterAllowance).to.equal(
      ethers.BigNumber.from("1000000000000000000000")
    );

    const tx = await (
      await vault.userDeposit(userAddress, "1000000000000000000000")
    ).wait(1);

    const event = getEventData("Deposited", vault, tx);
    expect(event.from).to.equal(userAddress);
    expect(event.amount).to.equal("1000000000000000000000");

    const newContractBalance = await token.balanceOf(vault.address);
    expect(newContractBalance).to.equal("101000000000000000000000");
  });

  it("Should not allow user to withdraw", async () => {
    const userAddress = await user.getAddress();
    try {
      await vault
        .connect(user)
        .userWithdraw(userAddress, "1000000000000000000000");
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("Should allow owner to withdraw token address", async () => {
    const userAddress = await user.getAddress();
    const tx = await (
      await vault.userWithdraw(userAddress, ethers.BigNumber.from("1"))
    ).wait(1);
    const event = getEventData("Withdrawn", vault, tx);
    expect(event.to).to.equal(userAddress);
    expect(event.amount).to.equal(ethers.BigNumber.from("1"));

    const userBalanceAfter = await token.balanceOf(userAddress);
    expect(userBalanceAfter).to.equal(ethers.BigNumber.from("1"));
  });

  it("Should only allow owner to withdraw token from contract", async () => {
    try {
      await vault.connect(user).withdraw();
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }

    const deployerAddress = await deployer.getAddress();
    const balanceBefore = await token.balanceOf(deployerAddress);
    const balanceOfVaultBefore = await token.balanceOf(vault.address);

    await (await vault.withdraw()).wait(1);

    const balanceAfter = await token.balanceOf(deployerAddress);
    expect(balanceAfter).to.equal(balanceBefore.add(balanceOfVaultBefore));
  });

  it("Should not allow RITE address to be zero", async () => {
    const RITE = ethers.constants.AddressZero;
    try {
      await (await ethers.getContractFactory("Vault")).deploy(RITE);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Token address cannot be zero");
    }
  });

  it("Should not allow caller address to be zero", async () => {
    const fromAddress = ethers.constants.AddressZero;
    try {
      await vault.userDeposit(fromAddress, "1000000000000000000000");
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("From address cannot be zero");
    }
  });

  it("Should only allow owner to call renounceOwnership and new owner always be the fixed address ", async () => {
    await expect(token.connect(user).renounceOwnership()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await token.renounceOwnership();
    const newOwner = await token.owner();
    expect(newOwner).to.equal("0x1156B992b1117a1824272e31797A2b88f8a7c729"); //this the fixed new owner address

    await expect(token.renounceOwnership()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should not withdraw token more than you deposited", async () => {
    const userAddress = await user.getAddress();
    const balance = await vault.connect(user).getUserDepositBalance();

    await expect(
      vault.userWithdraw(userAddress, balance.add(1))
    ).to.be.revertedWith(
      "Amount must be greater than zero and must have enough tokens"
    );
  });
});
