require('dotenv').config();

require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');
require('@nomiclabs/hardhat-etherscan');
require('solidity-coverage');
require('hardhat-tracer');

// Macros
const showGasReporter = false;
const enableOptimizer = true;

module.exports = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: showGasReporter || enableOptimizer,
        runs: 999999,
      },
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    goerli: {
      url: process.env.GOERLI_ENDPOINT || '',
      accounts: [process.env.DEPLOYER_PRIVATE_KEY] || '',
    },
  },
  gasReporter: {
    enabled: showGasReporter,
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
