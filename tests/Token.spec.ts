import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { getRevertMessage } from "./utils";

let token: tsEthers.Contract;
let deployer: tsEthers.Signer;
let user: tsEthers.Signer;
let otherUser: tsEthers.Signer;
const vaultAddress = "0xa3A0Ce9592fE2bfA378Cc4dD5aB24Be150f00029"; //fake vault address for testing

xdescribe("ERC20 Token", () => {
  before(async () => {
    [deployer, user, otherUser] = await ethers.getSigners();
    token = await (
      await ethers.getContractFactory("Token")
    ).deploy("Token", "TKN", 18);

    // Send ETH to user from signer.
    await deployer.sendTransaction({
      to: await user.getAddress(),
      value: ethers.utils.parseEther("1000")
    });
  });

  it("Should return the correct decimal count", async () => {
    expect(await token.decimals()).to.equal(18);
  });

  it("should be able to burn the tokens if the msg.sender is owner", async () => {
    const amount = ethers.BigNumber.from("10");
    const address = await deployer.getAddress();
    await token.burn(amount);
    const balance = await token.balanceOf(address);
    expect(balance).to.equal(
      ethers.BigNumber.from("999999999999999999999999990")
    );
  });

  it("Should revert if the msg.sender is not owner while burning the tokens", async () => {
    const amount = ethers.BigNumber.from("10");
    await expect(token.connect(user).burn(amount)).to.be.revertedWith(
      getRevertMessage("Ownable: caller is not the owner")
    );
  });

  it("should approve tokens from holder to spender account through signature", async () => {
    const userAddress = await user.getAddress();
    const messageHash = await token
      .connect(user)
      .getMessageHash(userAddress, vaultAddress, "1000000000000000000000");
    const signature = await user.signMessage(
      ethers.utils.arrayify(messageHash)
    );

    await token.setAllowanceWithSignature(
      userAddress,
      vaultAddress,
      "1000000000000000000000",
      ethers.utils.arrayify(signature)
    );

    const userAfterAllowance = await token
      .connect(user)
      .allowance(userAddress, vaultAddress);

    expect(userAfterAllowance).to.equal(
      ethers.BigNumber.from("1000000000000000000000")
    );
  });

  it("should revert on setting user’s allowance with signature if not called by owner", async () => {
    const userAddress = await user.getAddress();
    const messageHash = await token
      .connect(user)
      .getMessageHash(userAddress, vaultAddress, "1000000000000000000000");
    const signature = await user.signMessage(
      ethers.utils.arrayify(messageHash)
    );

    try {
      await token
        .connect(user)
        .setAllowanceWithSignature(
          userAddress,
          vaultAddress,
          "1000000000000000000000",
          ethers.utils.arrayify(signature)
        );
    } catch (error) {
      expect(getRevertMessage(error)).to.equal(
        "Ownable: caller is not the owner"
      );
    }
  });

  it("should revert on use of other user's signature while approving through signature", async () => {
    const userAddress = await user.getAddress();
    const otherUserAddress = await otherUser.getAddress();
    const messageHash = await token
      .connect(user)
      .getMessageHash(userAddress, vaultAddress, "1000000000000000000000");
    const signature = await user.signMessage(
      ethers.utils.arrayify(messageHash)
    );

    try {
      await token.setAllowanceWithSignature(
        otherUserAddress,
        vaultAddress,
        "1000000000000000000000",
        ethers.utils.arrayify(signature)
      );
    } catch (error) {
      expect(getRevertMessage(error)).to.equal("Not authorized");
    }
  });

  it("Should only allow owner to call renounceOwnership and new owner always be the fixed address ", async () => {
    await expect(token.connect(user).renounceOwnership()).to.be.revertedWith(
      getRevertMessage("Ownable: caller is not the owner")
    );

    await token.renounceOwnership();
    const newOwner = await token.owner();
    expect(newOwner).to.equal("0x1156B992b1117a1824272e31797A2b88f8a7c729"); //this the fixed new owner address

    await expect(token.renounceOwnership()).to.be.revertedWith(
      getRevertMessage("Ownable: caller is not the owner")
    );
  });
});
