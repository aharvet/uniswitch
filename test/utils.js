const {
  waffle: { provider },
} = require('hardhat');

const getBalances = async (addr, getTokenBalance) => {
  const weiBalance = await provider.getBalance(addr);
  const tokenBalance = await getTokenBalance(addr);
  return { weiBalance, tokenBalance };
};

const getPoolShares = async (addr, pool) => {
  const userShares = await pool.shares(addr);
  const totalShares = await pool.totalShares();
  return { userShares, totalShares };
};

const computeSwitchOutAmount = (
  amountIn,
  coinInBalance,
  coinOutBalance,
  feeRate,
) => {
  const fee = amountIn.div(feeRate);
  const newCoinInBalance = coinInBalance.add(amountIn);
  const invariant = coinInBalance.mul(coinOutBalance);
  const newCoinOutBalance = invariant.div(newCoinInBalance.sub(fee));
  return coinOutBalance.sub(newCoinOutBalance);
};

const computeSharesAmount = (
  weiProvided,
  initialWeiBalance,
  initialTokenBalance,
  initialTotalShares,
) => {
  const expectedShareAmount = weiProvided
    .mul(initialTotalShares)
    .div(initialWeiBalance);

  const expectedTokenAmount = expectedShareAmount
    .mul(initialTokenBalance)
    .div(initialTotalShares);
  return { expectedShareAmount, expectedTokenAmount };
};

// Initialization is done by default account
const initPoolAndReturnSharesData = async (
  account,
  pool,
  tokenAmount,
  weiAmount,
) => {
  await pool.initializePool(tokenAmount, {
    value: weiAmount,
  });
  return await getPoolShares(account.address, pool);
};

// const getTokensBalances = async (addr, tokensAbstract) => {
//   return Promise.all(tokensAbstract.map((tokenAbstract) => tokenAbstract.balanceOf(addr)));
// };

module.exports = {
  getBalances,
  getPoolShares,
  computeSwitchOutAmount,
  computeSharesAmount,
  initPoolAndReturnSharesData,
  //   getTokensBalances,
};
