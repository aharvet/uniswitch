require('@nomiclabs/hardhat-waffle');

module.exports = {
  solidity: '0.6.12',
  settings: {
    optimizer: {
      enabled: false,
      runs: 999999,
    },
  },
};
