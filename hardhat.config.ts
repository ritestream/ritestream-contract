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
    opBnb: {
      url: "https://opbnb-testnet-rpc.bnbchain.org",
      chainId: 5611,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    binanceTest: {
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
    mainnet: {
      url: process.env.MAINNET_URL || defaultRpcUrl,
      accounts: [process.env.PRIVATE_KEY || defaultKey]
    }
  },
  etherscan: {
    // Obtain etherscan API key at https://etherscan.io/
    apiKey: {
      mainnet: process.env.ETHERSCAN_KEY,
      binance: process.env.ETHERSCAN_KEY,
      binanceTest: process.env.ETHERSCAN_KEY
    },
    customChains: [
      {
        network: "opBnb",
        chainId: 5611,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://goerli.etherscan.io"
        }
      }
    ]
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
