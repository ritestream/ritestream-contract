import { deployContract } from "../utils";
import contracts from "../../../contracts.json";

export const contractNames = () => ["vault"];

export const constructorArguments = () => [contracts.binance.tokenUpgradeable];

export const deploy = async (deployer, setAddresses) => {
  console.log("deploying Vault");
  const vault = await deployContract(
    "Vault",
    constructorArguments(),
    deployer,
    1
  );
  console.log(`deployed Vault to address ${vault.address}`);
  setAddresses({ vault: vault.address });
  return vault;
};
