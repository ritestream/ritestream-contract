import { ethers, network } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { createTestUser, getRevertMessage } from "./utils";
import { randomInt } from "crypto";

let token: tsEthers.Contract;
let vesting: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let users: User[];

type User = {
  wallet: tsEthers.Wallet;
  share: number;
}

describe("MultiVest Gas Cost", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = (await ethers.getSigners())[1];

    const now = Date.now() + 1000*60*60*24*30;

    users = [];
    for (let i = 0; i < 20; i++) {
      const wallet = await createTestUser(deployer)
      const share = (i + 1) * Math.pow(10, randomInt(1, 10));
      users.push({wallet: wallet, share: share});
    }

    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Ritestream Token", "RITE", 18);

    
    let addresses = [];
    let data = [];
    for (let i = 0; i < 10; i++) {
      addresses.push(users[i].wallet.address);
      data.push({
        share: ethers.BigNumber.from(users[i].share), 
        released: ethers.BigNumber.from("0"),
        initialClaimable: ethers.BigNumber.from("0"),
        revocable: true,
        revoked: false,
      });
    }

    vesting = await (
      await ethers.getContractFactory("MultiVesting")
    ).deploy(
      Math.floor(now),
      Math.floor(now - 1000*60*60),
      1000*60*60*24*10,
      1000*60*60*24,
      100000000000000,
      token.address,
      addresses,
      data,
    );

    await token.mint(vesting.address, "100000000000000");

    for (let i = 10; i < 20; i++) {
      await vesting.connect(deployer).addVestor(users[i].wallet.address, ethers.BigNumber.from(users[i].share), ethers.BigNumber.from("0"), false);
    }
    
    const claimTo = async (to): Promise<void> => {
      for (let i = 0; i < to; i++) {
        await vesting.connect(users[i].wallet).release()
      }
    };

    await network.provider.send("evm_mine", [now + (1000*60*60)])
    await claimTo(10);

    await network.provider.send("evm_mine", [now + (1000*60*60*2)])
    await claimTo(20);

    await network.provider.send("evm_mine", [now + (1000*60*60*4)])
    await claimTo(5);

    for (let i = 0; i < 10; i++) {
      await vesting.connect(deployer).revokeVestor(users[i].wallet.address);
    }

    await network.provider.send("evm_mine", [now + (1000*60*60*8)])
    await claimTo(15);

    await network.provider.send("evm_mine", [now + (1000*60*60*11)])
    await claimTo(20);
    
  });

  it("run this test", async () => {
    expect("0").to.equal("0");
  });
});
