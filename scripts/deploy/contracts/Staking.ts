import { verifyOnEtherscan } from "../utils";
import { deployContract } from "../utils";

export const contractNames = () => ["staking"];

export const constructorArguments = () => [];

export const deploy = async (deployer, setAddresses) => {
  console.log("deploying Staking");
  const staking = await deployContract(
    "Staking",
    ["0x0F5D54b27bDb556823F96f2536496550f8816dC5"], // update live token address
    deployer,
    1
  );
  console.log(`deployed Staking to address ${staking.address}`);
  setAddresses({ staking: staking.address });

  return staking;
};
