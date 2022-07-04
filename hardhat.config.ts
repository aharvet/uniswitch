import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import '@nomiclabs/hardhat-etherscan';
import 'solidity-coverage';
import 'hardhat-tracer';
import '@typechain/hardhat';

dotenv.config();

// Macros
const showGasReporter = false;
const enableOptimizer = true;

export default {
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
