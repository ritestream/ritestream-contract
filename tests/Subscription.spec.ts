import hre, { ethers } from "hardhat";
import { BigNumber, BigNumberish, ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";
import { deployProxy } from "../scripts/deploy/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let token: tsEthers.Contract;
let subscription: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let operator: SignerWithAddress;
let nonce = 0;

describe("Subscription", () => {
  before(async () => {
    [deployer, user, operator] = await ethers.getSigners();

    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Token", "TKN", 18);

    subscription = await deployProxy(
      "Subscription",
      [token.address],
      deployer,
      1
    );

    await token
      .connect(deployer)
      .transfer(await user.getAddress(), ethers.utils.parseEther("1000"));

    //set approve for subscription contract to transfer token
    await token
      .connect(user)
      .approve(subscription.address, ethers.utils.parseEther("1000"));
  });

  it("Should get rite token address and balance of rite token after vesting contract deployed", async () => {
    const riteAddress = await subscription.RITE();
    expect(riteAddress).to.equal(token.address);

    const balance = await token.balanceOf(subscription.address);

    expect(balance).to.equal(ethers.BigNumber.from("0"));
    expect(await subscription.operator()).to.equal(await deployer.getAddress());

    expect(await token.balanceOf(await user.getAddress())).to.equal(
      ethers.utils.parseEther("1000")
    );
  });

  it("Should only allow owner to set operator", async () => {
    await expect(
      subscription.connect(user).setOperator(await operator.getAddress())
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await subscription.setOperator(await operator.getAddress());

    expect(await subscription.operator()).to.equal(await operator.getAddress());
  });

  it("Should not allow to update plan if no subscription found", async () => {
    const signature = await signMintMessage(
      await user.getAddress(),
      ethers.utils.parseEther("100"),
      operator,
      nonce
    );
    await expect(
      subscription
        .connect(user)
        .renewSubscription(ethers.utils.parseEther("100"), signature, nonce)
    ).to.be.revertedWith("No subscription plan found");
    nonce = nonce + 1;
  });

  it("Should allow user to subscribe", async () => {
    const signature = await signMintMessage(
      await user.getAddress(),
      ethers.utils.parseEther("100"),
      operator,
      nonce
    );
    await subscription
      .connect(user)
      .subscribe(ethers.utils.parseEther("100"), signature, nonce);

    const userSubscription = await subscription
      .connect(user)
      .getSubscription(await user.getAddress());
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const latestBlock = await ethers.provider.getBlock(latestBlockNumber);
    expect(userSubscription[0]).to.equal(await user.getAddress());
    expect(userSubscription[1]).to.equal(ethers.utils.parseEther("100"));
    expect(
      Number(ethers.utils.formatUnits(userSubscription[3], 0))
    ).to.be.greaterThan(Number(latestBlock.timestamp));
    nonce = nonce + 1;
  });

  it("Should not overwrite subscription on calling function again with different amount.", async () => {
    const signature = await signMintMessage(
      await user.getAddress(),
      ethers.utils.parseEther("50"),
      operator,
      nonce
    );

    await expect(
      subscription
        .connect(user)
        .subscribe(ethers.utils.parseEther("50"), signature, nonce)
    ).to.be.revertedWith("Already subscribed");
  });

  it("Should only allow owner to withdraw", async () => {
    await expect(subscription.connect(user).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    await subscription.connect(deployer).withdraw();

    expect(await token.balanceOf(subscription.address)).to.equal("0");
  });

  it("Should allow user to update subscription plan", async () => {
    const latestBlockNumber = await ethers.provider.getBlockNumber();
    const latestBlock = await ethers.provider.getBlock(latestBlockNumber);
    await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [latestBlock.timestamp + 2592000]
    });

    const signature = await signMintMessage(
      await user.getAddress(),
      ethers.utils.parseEther("200"),
      operator,
      nonce
    );
    await subscription
      .connect(user)
      .renewSubscription(ethers.utils.parseEther("200"), signature, nonce);

    const userSubscription = await subscription
      .connect(user)
      .getSubscription(await user.getAddress());
    const nextLatestBlockNumber = await ethers.provider.getBlockNumber();
    const nextLatestBlock = await ethers.provider.getBlock(
      nextLatestBlockNumber
    );
    expect(userSubscription[0]).to.equal(await user.getAddress());
    expect(userSubscription[1]).to.equal(ethers.utils.parseEther("300"));
    expect(
      Number(ethers.utils.formatUnits(userSubscription[3], 0))
    ).to.be.greaterThan(Number(nextLatestBlock.timestamp));
    nonce = nonce + 1;
  });
});

async function signMintMessage(
  address: string,
  amount: BigNumber,
  signer: SignerWithAddress,
  nonce: number
): Promise<Signature> {
  const message = ethers.utils.solidityKeccak256(
    ["address", "uint256", "uint256"],
    [address, amount, nonce]
  );
  return await signMessage(message, signer);
}

async function signMessage(message: string, signer: SignerWithAddress) {
  const sig = await signer.signMessage(ethers.utils.arrayify(message));
  const { v, r, s } = ethers.utils.splitSignature(sig);
  return { v, r, s };
}

type Signature = {
  v: BigNumberish,
  r: string,
  s: string
};
