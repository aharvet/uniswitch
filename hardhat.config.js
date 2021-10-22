require('dotenv').config();

require('@nomiclabs/hardhat-waffle');

module.exports = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: false,
        runs: 999999,
      },
    },
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_ENDPOINT,
      accounts: process.env.DEPLOYER_PRIVATE_KEY,
    },
  },
};
