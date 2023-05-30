import { config as dotenvConfig } from "dotenv";
dotenvConfig();
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "./scripts/tasks";
import "solidity-coverage";
import { ethers } from "ethers";

const defaultKey =
  "0000000000000000000000000000000000000000000000000000000000000001";
const defaultRpcUrl = "https://localhost:8545";
const defaultEtherBalance = "100000000";

export default {
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./build",
    tests: "./tests"
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false
    },
    binancetest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    binance: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 6000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    kovan: {
      url: process.env.KOVAN_URL || defaultRpcUrl,
      accounts: [process.env.PRIVATE_KEY || defaultKey]
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || defaultRpcUrl,
      accounts: [process.env.PRIVATE_KEY || defaultKey]
    },
    mainnet: {
      url: process.env.MAINNET_URL || defaultRpcUrl,
      accounts: [process.env.PRIVATE_KEY || defaultKey]
    }
  },
  etherscan: {
    // Obtain etherscan API key at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_KEY
  },
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200
          }
        }
      }
    ]
  }
};
