import hre, { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";

let token: tsEthers.Contract;
let employeeVesting: tsEthers.Contract;
let deployer: tsEthers.Signer;
let employee1: tsEthers.Signer;
let employee2: tsEthers.Signer;
const startTime = 1644362594; //Date and time (GMT): Tuesday, February 8, 2022 11:23:14 PM

describe("Employee Vesting", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    employee1 = (await ethers.getSigners())[1];
    employee2 = (await ethers.getSigners())[2];
    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Token", "TKN", 18);

    employeeVesting = await (
      await ethers.getContractFactory("EmployeeVesting")
    ).deploy(token.address);

    await token.mint(employeeVesting.address, ethers.BigNumber.from("100000"));
  });

  it("Should get rite token address and balance of rite token after vesting contract deployed", async () => {
    const riteAddress = await employeeVesting.RITE();
    expect(riteAddress).to.equal(token.address);

    const balance = await token.balanceOf(employeeVesting.address);

    expect(balance).to.equal(ethers.BigNumber.from("100000"));
  });

  it("Should only allow owner to set start time", async () => {
    try {
      await employeeVesting.connect(employee1).setStartDate(startTime);
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
        claimStartTime: 1644362594 + 15552000, //Date and time (GMT): Tuesday, February 8, 2022 11:23:14 PM +  180 days
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
        claimStartTime: 1644362594 + 15552000, ///Date and time (GMT): Tuesday, February 8, 2022 11:23:14 PM + 180 days
        terminated: false
      }
    ];

    try {
      await employeeVesting.connect(employee1).setEmployeeVesting(employeeList);
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }

    await employeeVesting.setEmployeeVesting(employeeList);

    const employee1VestingDetail = await employeeVesting.getEmployeeVesting(
      employee1Address
    );
    const employee2VestingDetail = await employeeVesting.getEmployeeVesting(
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

  it("Should not allow employee to claim token before the cliff", async () => {
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [startTime + 7200]
    });

    try {
      await employeeVesting.connect(employee1).claim();
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Claiming period has not started"
      );
    }
  });
});
