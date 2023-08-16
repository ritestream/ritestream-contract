import hre, { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let token: tsEthers.Contract;
let stakingContract: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let user2: tsEthers.Signer;
let operator: SignerWithAddress;

describe("Staking", () => {
  beforeEach(async () => {
    [deployer, user, user2, operator] = await ethers.getSigners();

    token = await (
      await ethers.getContractFactory("Rite")
    ).deploy("Rite", "RITE", 18);

    stakingContract = await (
      await ethers.getContractFactory("Staking")
    ).deploy(token.address);

    await stakingContract.setOperator(operator.address);
    await token.transfer(
      stakingContract.address,
      ethers.utils.parseEther("1000")
    );
  });

  it("Should get token address and staking contract address", async () => {
    expect(await stakingContract.RITE()).to.equal(token.address);
    expect(await stakingContract.operator()).to.equal(operator.address);
  });

  it("Should not allow user to withdraw", async () => {
    const address = await user.getAddress();
    await expect(stakingContract.connect(user).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should allow owner to withdraw", async () => {
    const balance = await token.balanceOf(stakingContract.address);
    expect(balance).to.equal(ethers.utils.parseEther("1000"));
    await stakingContract.withdraw();
    const newBalance = await token.balanceOf(stakingContract.address);
    expect(newBalance).to.equal(0);
  });

  it("Should not allow user to stake", async () => {
    const address = await user.getAddress();
    await expect(
      stakingContract.connect(user).stake(100, address, "09/2023")
    ).to.be.revertedWith("Staking: caller is not the operator");
  });

  it("Should allow operator to stake", async () => {
    const address = await user.getAddress();

    await stakingContract
      .connect(operator)
      .stake(
        ethers.BigNumber.from("1000000000000000000000"),
        address,
        "08/2023"
      );

    await expect(
      stakingContract
        .connect(operator)
        .stake(
          ethers.BigNumber.from("2000000000000000000000"),
          address,
          "08/2023"
        )
    ).to.be.revertedWith("Staking: already staked for this month");

    await stakingContract
      .connect(operator)
      .stake(
        ethers.BigNumber.from("2000000000000000000000"),
        address,
        "09/2023"
      );

    const stakes = await stakingContract.getStakes(address);

    expect(stakes.length).to.equal(2);
  });

  it("Should not allow user to unstake if there is no user staking", async () => {
    await expect(stakingContract.connect(user2).unstake(2)).to.be.revertedWith(
      "Staking: no stake"
    );
  });

  it("Should not allow user to unstake if index is wrong ", async () => {
    const address = await user.getAddress();
    await stakingContract
      .connect(operator)
      .stake(
        ethers.BigNumber.from("1000000000000000000000"),
        address,
        "08/2023"
      );
    await expect(stakingContract.connect(user).unstake(2)).to.be.revertedWith(
      "Staking: invalid stake"
    );
  });

  it("Should allow user to unstake if end data not reached", async () => {
    const address = await user.getAddress();
    await stakingContract
      .connect(operator)
      .stake(
        ethers.BigNumber.from("1000000000000000000000"),
        address,
        "08/2023"
      );
    await expect(stakingContract.connect(user).unstake(0)).to.be.revertedWith(
      "Staking: staking is not ended yet"
    );
  });

  it("Should not allow user to unstake if not enough token balance", async () => {
    const address = await user.getAddress();
    await stakingContract
      .connect(operator)
      .stake(ethers.utils.parseEther("1000"), address, "08/2023");
    await stakingContract
      .connect(operator)
      .stake(ethers.utils.parseEther("2000"), address, "09/2023");
    const currentBlockNumber = await ethers.provider.getBlockNumber();

    // current block timestamp + 365 days
    const startTime = (await ethers.provider.getBlock(currentBlockNumber))
      .timestamp;
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 31536000]
    });

    await expect(stakingContract.connect(user).unstake(0)).to.be.revertedWith(
      "Staking: insufficient balance"
    );
  });

  it("Should allow user to unstake", async () => {
    await token.transfer(
      stakingContract.address,
      ethers.utils.parseEther("10000")
    );
    const address = await user.getAddress();
    await stakingContract
      .connect(operator)
      .stake(ethers.utils.parseEther("1000"), address, "08/2023");
    await stakingContract
      .connect(operator)
      .stake(ethers.utils.parseEther("2000"), address, "09/2023");
    const currentBlockNumber = await ethers.provider.getBlockNumber();

    // current block timestamp + 365 days
    const startTime = (await ethers.provider.getBlock(currentBlockNumber))
      .timestamp;
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 31536000]
    });

    await stakingContract.connect(user).unstake(0);
    const stakes = await stakingContract.getStakes(address);
    expect(stakes.length).to.equal(1);
    expect(await token.balanceOf(address)).to.equal(
      ethers.utils.parseEther("1500")
    );
  });
});
