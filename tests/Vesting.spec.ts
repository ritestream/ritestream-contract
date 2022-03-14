import hre, { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";

let token: tsEthers.Contract;
let vesting: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let user2: tsEthers.Signer;
let startTime = 0;

describe("Sale Vesting", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];
    user2 = (await ethers.getSigners())[2];
    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Token", "TKN", 18);

    const latestBlockNumber = await ethers.provider.getBlockNumber();

    const latestBlock = await ethers.provider.getBlock(latestBlockNumber);

    startTime = latestBlock.timestamp + 1000;

    vesting = await (
      await ethers.getContractFactory("SaleVesting")
    ).deploy(token.address, startTime);

    await token.transfer(vesting.address, ethers.BigNumber.from("100000"));
  });

  it("Should get rite token address and balance of rite token after vesting contract deployed", async () => {
    const riteAddress = await vesting.RITE();
    expect(riteAddress).to.equal(token.address);

    const balance = await token.balanceOf(vesting.address);

    expect(balance).to.equal(ethers.BigNumber.from("100000"));
  });

  it("Should only allow owner to set start time", async () => {
    const tgeDate = startTime + 1000;
    try {
      await vesting.connect(user).setTGEDate(tgeDate);
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }

    await vesting.setTGEDate(tgeDate);

    expect(await vesting.TGEDate()).to.equal(tgeDate);
  });

  it("Should allow owner to set vesting", async () => {
    const userAddress = await user.getAddress();
    const user2Address = await user2.getAddress();
    const userVestingList = [
      {
        beneficiary: userAddress,
        vestingAmount: ethers.BigNumber.from("10000"),
        duration: 31556926, //12 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("100"),
        initialClaimed: false,
        claimStartTime: startTime + 2592000
      },
      {
        beneficiary: user2Address,
        vestingAmount: ethers.BigNumber.from("20000"),
        duration: 31556926, //12 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("200"),
        initialClaimed: false,
        claimStartTime: startTime + 2592000
      }
    ];

    await vesting.setVesting(userVestingList);

    const userVesting = await vesting
      .connect(user)
      .getBeneficiaryVesting(await user.getAddress());

    expect(userVesting.beneficiary).to.equal(userAddress);
    expect(userVesting.vestingAmount).to.equal(ethers.BigNumber.from("10000"));

    const user2Vesting = await vesting
      .connect(user2)
      .getBeneficiaryVesting(await user2.getAddress());
    expect(user2Vesting.beneficiary).to.equal(user2Address);
    expect(user2Vesting.vestingAmount).to.equal(ethers.BigNumber.from("20000"));
  });

  it("Should not allow set vesting if vesting already exist", async () => {
    const userAddress = await user.getAddress();
    const user2Address = await user2.getAddress();
    const userVestingList = [
      {
        beneficiary: userAddress,
        vestingAmount: ethers.BigNumber.from("10000"),
        duration: 31556926, //12 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("100"),
        initialClaimed: false,
        claimStartTime: startTime + 2592000 ////Tuesday, February 8, 2022 11:03:12 AM GMT+10:00 +  30days
      },
      {
        beneficiary: user2Address,
        vestingAmount: ethers.BigNumber.from("20000"),
        duration: 31556926, //12 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("200"),
        initialClaimed: false,
        claimStartTime: startTime + 2592000 // Tuesday, February 8, 2022 11:03:12 AM GMT+10:00
      }
    ];

    try {
      await vesting.setVesting(userVestingList);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Vesting already exists");
    }
  });

  it("Should not allow to claim before TGE start", async () => {
    try {
      await vesting.connect(user).claim();
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Claim is not allowed before TGE start"
      );
    }
  });

  it("Should allow user to claim initial amount after TGE start", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 7200]
    });

    await vesting.connect(user).claim();
    const userBalanceAfter = await token.balanceOf(user.getAddress());

    expect(userBalanceAfter).to.equal(ethers.BigNumber.from("100"));

    const userAddress = await user.getAddress();
    const vestingDetail = await vesting
      .connect(user)
      .getBeneficiaryVesting(userAddress);

    expect(ethers.utils.formatUnits(vestingDetail.lastClaimedTime, 0)).to.equal(
      (startTime + 7200).toString()
    );
  });

  it("Should allow user2 to claim initial amount with linear amount after TGE start", async () => {
    await vesting.connect(user2).claim();
    const user2BalanceAfter = await token.balanceOf(user2.getAddress());

    expect(user2BalanceAfter).to.equal(ethers.BigNumber.from("200"));
  });

  it("Should not allow user to claim linear before cliff", async () => {
    try {
      await vesting.connect(user).claim();
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Claiming is not allowed before cliff period"
      );
    }
  });

  it("Should allow user to claim linear after cliff", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 2592000 + 7200]
    });

    await vesting.connect(user).claim();
    const userBalanceAfter = await token.balanceOf(user.getAddress());

    //(1646881392 - 1644289392)* (10000-100)/31556926
    expect(userBalanceAfter).to.equal(ethers.BigNumber.from("913"));
  });

  it("Should allow user to claim rest of token after vesting period end", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 31556926 + 17200]
    });

    await vesting.connect(user).claim();
    const userBalanceAfter = await token.balanceOf(user.getAddress());

    expect(userBalanceAfter).to.equal(ethers.BigNumber.from("10000"));
  });

  it("Should not allow TGE before deployment date", async () => {
    try {
      await (
        await ethers.getContractFactory("SaleVesting")
      ).deploy(token.address, 0);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "TGE cannot be before the deployment date"
      );
    }
  });
  it("Should not allow RITE address to be zero", async () => {
    const RITE = ethers.constants.AddressZero;
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const latestBlock = await ethers.provider.getBlock(latestBlockNumber);
    startTime = latestBlock.timestamp + 1000;
    try {
      await (
        await ethers.getContractFactory("TeamVesting")
      ).deploy(RITE, startTime);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Address cannot be zero");
    }
  });
});
