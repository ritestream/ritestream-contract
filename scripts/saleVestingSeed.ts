import { ethers } from "ethers";

const saleVestingSeed = [
  {
    beneficiary: "0xA61D1f138df1E04DEe8E8A092ca20C206d88d063",
    vestingAmount: ethers.BigNumber.from("2500000"),
    duration: "31536000",
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("62500"),
    initialClaimed: false,
    claimStartTime: 1645329862
  },
  {
    beneficiary: "0xB66e29158d18c34097a199624e5B126703B346C3",
    vestingAmount: ethers.BigNumber.from("2500000"),
    duration: 31536000,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("62500"),
    initialClaimed: false,
    claimStartTime: 1645329862
  },
  {
    beneficiary: "0x51108169c4eCD8Ba6437838ebc307898525aAF66",
    vestingAmount: ethers.BigNumber.from("2500000"),
    duration: 31536000,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("62500"),
    initialClaimed: false,
    claimStartTime: 1645329862
  },
  {
    beneficiary: "0x0196B25f7dCfe31DAD0f016357Bd0c7d5ff96b16",
    vestingAmount: ethers.BigNumber.from("1750000"),
    duration: 31536000,
    claimedAmount: 0,
    lastClaimedTime: 0,
    initialAmount: ethers.BigNumber.from("43750"),
    initialClaimed: false,
    claimStartTime: 1645329862
  }
];

export default saleVestingSeed;
