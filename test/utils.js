const {
  waffle: { provider },
} = require('hardhat');

const getBalances = async (addr, tokenAbstraction) => {
  const weiBalance = await provider.getBalance(addr);
  const tokenBalance = await tokenAbstraction.balanceOf(addr);
  return { weiBalance, tokenBalance };
};

const getPoolShares = async (addr, poolAbstraction) => {
  const userShares = await poolAbstraction.shares(addr);
  const totalShares = await poolAbstraction.totalShares();
  return { userShares, totalShares };
};

const computeSwitchOutAmount = (amountIn, coinInBalance, coinOutBalance) => {
  return Math.floor((coinOutBalance / (coinInBalance + amountIn)) * amountIn);
};

// const computeShareFlow = (weiFlow, initialWeiBalance, initialTokenBalance, initialTotalShares) => {
//   const expectedShareAmount = Math.floor((weiFlow * initialTotalShares) / initialWeiBalance);
//   const expectedTokenAmount =
//     Math.floor(initialTokenBalance / initialTotalShares) * expectedShareAmount;
//   return [expectedShareAmount, expectedTokenAmount];
// };

// const getTokensBalances = async (addr, tokensAbstract) => {
//   return Promise.all(tokensAbstract.map((tokenAbstract) => tokenAbstract.balanceOf(addr)));
// };

module.exports = {
  getBalances,
  getPoolShares,
  computeSwitchOutAmount,
  //   computeShareFlow,
  //   getTokensBalances,
};
