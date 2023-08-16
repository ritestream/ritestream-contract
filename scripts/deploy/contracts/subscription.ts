import { deployProxy, upgradeProxy, verifyOnEtherscan } from "../utils";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

export const contractNames = () => ["subscription"];

export const constructorArguments = () => [];

export const deploy = async (deployer, setAddresses) => {
  console.log("deploying subscription");
  const subscription = await deployProxy(
    "Subscription",
    ["0xA73f64370f052B1a6B36f87e837bd22dA17E8381"], // update live token address
    deployer,
    1
  );
  console.log(`deployed Subscription to address ${subscription.address}`);
  setAddresses({ subscription: subscription.address });

  const verifyAddress = await getImplementationAddress(
    deployer.provider,
    subscription.address
  );

  console.log(`verifying subscription on Etherscan ${verifyAddress}`);
  await verifyOnEtherscan(verifyAddress, constructorArguments());

  return subscription;
};

export const upgrade = async (deployer, addresses) => {
  return await upgradeProxy(
    "subscription",
    addresses.subscription,
    deployer,
    1
  );
};
