import { verifyOnEtherscan } from "../utils";
import { deployContract } from "../utils";

export const contractNames = () => ["staking"];

export const constructorArguments = () => [];

export const deploy = async (deployer, setAddresses) => {
  console.log("deploying Staking");
  const staking = await deployContract(
    "Staking",
    ["0xf62F3aF0Ee56E00655a99a952Ea507e58CDf1766"], // update live token address
    deployer,
    1
  );
  console.log(`deployed Staking to address ${staking.address}`);
  setAddresses({ staking: staking.address });

  return staking;
};
