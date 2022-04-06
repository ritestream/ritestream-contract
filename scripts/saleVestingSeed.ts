import { ethers } from "ethers";

const saleVestingSeed = [
  {
    beneficiary: "0x472FD48b8F2CcDE44EbcF0Ae3bE72ff6370Cd14D", //AB Ventures
    vestingAmount: ethers.BigNumber.from("483747"),
    duration: 40867200,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("13916"),
    initialClaimed: false,
    claimStartTime: 1649322900
  },
  {
    beneficiary: "0xaacAe045E4AB12e9f0C155973E60215dA5c085d0", //Croc Capital
    vestingAmount: ethers.BigNumber.from("2177225"),
    duration: 30326400,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("83510"),
    initialClaimed: false,
    claimStartTime: 1649322900
  },
  {
    beneficiary: "0x9C05B49aa0a40C3F43DAa939E319234106229b80", //Joseph
    vestingAmount: ethers.BigNumber.from("500000"),
    duration: 40867200,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("26528"),
    initialClaimed: false,
    claimStartTime: 1649322900
  },
  {
    beneficiary: "0x390DAAc16d5879f70A51674CDdAd5e8b20abB885", //GSG Digital Frontier
    vestingAmount: ethers.BigNumber.from("6666667"),
    duration: 30326400,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("576261"),
    initialClaimed: false,
    claimStartTime: 1649322900
  },
  {
    beneficiary: "0xb47B752d27de51A9D84d0F0d1D74Bc099D7aAda9", //Anders Christiansen
    vestingAmount: ethers.BigNumber.from("1300000"),
    duration: 30326400,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("112376"),
    initialClaimed: false,
    claimStartTime: 1649322900
  }
];

export default saleVestingSeed;
