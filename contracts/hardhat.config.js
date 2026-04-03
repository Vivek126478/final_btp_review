require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config({ path: '../.env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 15_000_000,
      gasPrice: 1
    },
    hardhat: {
      chainId: 1337,
      blockGasLimit: 15_000_000,
      initialBaseFeePerGas: 1
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
