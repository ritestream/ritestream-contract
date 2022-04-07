import { deployContract, verifyOnEtherscan } from "../utils";
import contracts from "../../../contracts.json";
import saleVestingSeed from "../../saleVestingSeed";

export const contractNames = () => ["saleVesting"];

const tgeDate = process.env.TGE_DATE; //Set the initial date of TGE. It can be changed once the contract is deployed.
export const constructorArguments = () => [
  contracts.binance.tokenUpgradeable,
  tgeDate
];

export const deploy = async (deployer, setAddresses) => {
  console.log("deploying SaleVesting");
  const saleVesting = await deployContract(
    "SaleVesting2",
    constructorArguments(),
    deployer,
    1
  );
  console.log(`deployed SaleVesting to address ${saleVesting.address}`);
  setAddresses({ saleVesting: saleVesting.address });

  await verifyOnEtherscan(saleVesting.address, constructorArguments());

  //Set sale vesting seed after deploy the contract
  await (await saleVesting.setVesting(saleVestingSeed)).wait();
  return saleVesting;
};
