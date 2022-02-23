import hre, { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";
import { exists } from "fs";

let token: tsEthers.Contract;
let employeeVesting: tsEthers.Contract;
let deployer: tsEthers.Signer;
let employee1: tsEthers.Signer;
let employee2: tsEthers.Signer;
let startTime = 0;

describe("Team Vesting", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    employee1 = (await ethers.getSigners())[1];
    employee2 = (await ethers.getSigners())[2];
    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Token", "TKN", 18);

    employeeVesting = await (
      await ethers.getContractFactory("TeamVesting")
    ).deploy(token.address, startTime);

    await token.transfer(
      employeeVesting.address,
      ethers.BigNumber.from("10000000")
    );

    const latestBlockNumber = await ethers.provider.getBlockNumber();

    const latestBlock = await ethers.provider.getBlock(latestBlockNumber);

    startTime = latestBlock.timestamp + 1000;
  });

  it("Should get rite token address and balance of rite token after vesting contract deployed", async () => {
    const riteAddress = await employeeVesting.RITE();
    expect(riteAddress).to.equal(token.address);

    const balance = await token.balanceOf(employeeVesting.address);

    expect(balance).to.equal(ethers.BigNumber.from("10000000"));
  });

  it("Should only allow owner to set start time", async () => {
    try {
      await employeeVesting.connect(employee1).setStartDate(startTime);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }

    await employeeVesting.setStartDate(startTime);
    expect(await employeeVesting.startDate()).to.equal(startTime);
  });

  it("Should only allow owner to set employee vesting", async () => {
    const employee1Address = await employee1.getAddress();
    const employee2Address = await employee2.getAddress();
    const employeeList = [
      {
        beneficiary: employee1Address,
        vestingAmount: ethers.BigNumber.from("1500000"),
        duration: 93312000, //36 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("250000"),
        initialClaimed: false,
        claimStartTime: startTime + 15552000,
        terminated: false
      },
      {
        beneficiary: employee2Address,
        vestingAmount: ethers.BigNumber.from("625000"),
        duration: 93312000, //36 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("10500"),
        initialClaimed: false,
        claimStartTime: startTime + 15552000,
        terminated: false
      }
    ];

    try {
      await employeeVesting.connect(employee1).setTeamVesting(employeeList);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }

    await employeeVesting.setTeamVesting(employeeList);

    const employee1VestingDetail = await employeeVesting.getBeneficiaryVesting(
      employee1Address
    );
    const employee2VestingDetail = await employeeVesting.getBeneficiaryVesting(
      employee2Address
    );

    expect(employee1VestingDetail.beneficiary).to.equal(employee1Address);
    expect(employee1VestingDetail.vestingAmount).to.equal(
      ethers.BigNumber.from("1500000")
    );
    expect(employee1VestingDetail.terminated).to.equal(false);

    expect(employee2VestingDetail.beneficiary).to.equal(employee2Address);
    expect(employee2VestingDetail.vestingAmount).to.equal(
      ethers.BigNumber.from("625000")
    );
    expect(employee2VestingDetail.terminated).to.equal(false);
  });

  it("Should not allow owner to set vesting if vesting already exist", async () => {
    const employee1Address = await employee1.getAddress();
    const employee2Address = await employee2.getAddress();
    const employeeList = [
      {
        beneficiary: employee1Address,
        vestingAmount: ethers.BigNumber.from("1500000"),
        duration: 93312000, //36 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("250000"),
        initialClaimed: false,
        claimStartTime: startTime + 15552000, //Date and time (GMT): Tuesday, February 8, 2022 11:23:14 PM +  180 days
        terminated: true
      },
      {
        beneficiary: employee2Address,
        vestingAmount: ethers.BigNumber.from("625000"),
        duration: 93312000, //36 months
        claimedAmount: 0,
        lastClaimedTime: 0,
        initialAmount: ethers.BigNumber.from("10500"),
        initialClaimed: false,
        claimStartTime: startTime + 15552000, ///Date and time (GMT): Tuesday, February 8, 2022 11:23:14 PM + 180 days
        terminated: true
      }
    ];

    try {
      await employeeVesting.setTeamVesting(employeeList);
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Vesting already exists for beneficiary"
      );
    }
  });
  it("Should not allow employee to claim token before the cliff", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 7200]
    });

    try {
      await employeeVesting.connect(employee1).claim();
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Claiming period has not started"
      );
    }
  });

  it("Should allow employee to claim initialAmount after the cliff", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 15552001]
    });

    await employeeVesting.connect(employee1).claim();
    expect(await token.balanceOf(employee1.getAddress())).to.equal(
      ethers.BigNumber.from("250000")
    );
  });

  it("Should allow employee to claim daily released token", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 15552001 + 86400]
    });

    //(1500000-250000) * 86400/93312000
    await employeeVesting.connect(employee1).claim();
    expect(await token.balanceOf(employee1.getAddress())).to.equal(
      ethers.BigNumber.from("250000").add(ethers.BigNumber.from("1157"))
    );
  });

  it("Should only allow owner to terminate employee", async () => {
    try {
      await employeeVesting
        .connect(employee1)
        .terminateNow(await employee2.getAddress());
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }

    await employeeVesting.terminateNow(await employee2.getAddress());

    const employee2VestingDetail = await employeeVesting.getBeneficiaryVesting(
      await employee2.getAddress()
    );
    expect(employee2VestingDetail.terminated).to.equal(true);
  });

  it("Should allow employee to claim rest of the token after vesting period", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 15552001 + 933120011]
    });

    await employeeVesting.connect(employee1).claim();
    expect(await token.balanceOf(employee1.getAddress())).to.equal(
      ethers.BigNumber.from("1500000")
    );
  });

  it("Should not allow employee to claim token if been terminated", async () => {
    try {
      await employeeVesting.connect(employee2).claim();
      throw new Error("Should not reach here");
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Beneficiary has terminated");
    }
  });
});
