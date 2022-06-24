import { waffle } from 'hardhat';
import { UniswitchPool } from '../typechain-types/contracts/UniswitchPool';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const { provider } = waffle;

export const getBalances = async (
  addr: string,
  getTokenBalance: (account: string) => Promise<BigNumber>,
) => {
  const weiBalance = await provider.getBalance(addr);
  const tokenBalance = await getTokenBalance(addr);
  return { weiBalance, tokenBalance };
};

export const getPoolShares = async (
  addr: string,
  pool: UniswitchPool,
): Promise<{ userShares: BigNumber; totalShares: BigNumber }> => {
  const userShares = await pool.shares(addr);
  const totalShares = await pool.totalShares();
  return { userShares, totalShares };
};

export const computeSwitchInAmount = (
  amountOut: BigNumber,
  coinInBalance: BigNumber,
  coinOutBalance: BigNumber,
  feeRate: BigNumber,
): BigNumber => {
  if (amountOut.gte(coinOutBalance))
    throw new Error('amountOut >= coinOutBalance');
  const one = BigNumber.from(1);

  const newCoinOutBalance = coinOutBalance.sub(amountOut);
  const invariant = coinInBalance.mul(coinOutBalance);
  const newCoinInBalanceWithoutFee = invariant.div(newCoinOutBalance);
  const amountInWithoutFee = newCoinInBalanceWithoutFee.sub(coinInBalance);
  const amountIn = amountInWithoutFee.div(one.sub(one.div(feeRate)));

  return amountIn;
};

export const computeSwitchOutAmount = (
  amountIn: BigNumber,
  coinInBalance: BigNumber,
  coinOutBalance: BigNumber,
  feeRate: BigNumber,
): BigNumber => {
  const fee = amountIn.div(feeRate);
  const newCoinInBalance = coinInBalance.add(amountIn);
  const invariant = coinInBalance.mul(coinOutBalance);
  const newCoinOutBalance = invariant.div(newCoinInBalance.sub(fee));
  const amountOut = coinOutBalance.sub(newCoinOutBalance);

  return amountOut;
};

export const computeSharesAmount = (
  weiProvided: BigNumber,
  initialWeiBalance: BigNumber,
  initialTokenBalance: BigNumber,
  initialTotalShares: BigNumber,
): { expectedShareAmount: BigNumber; expectedTokenAmount: BigNumber } => {
  const expectedShareAmount = weiProvided
    .mul(initialTotalShares)
    .div(initialWeiBalance);
  const expectedTokenAmount = expectedShareAmount
    .mul(initialTokenBalance)
    .div(initialTotalShares);
  return { expectedShareAmount, expectedTokenAmount };
};

// Initialization is done by default account
export const initPoolAndReturnSharesData = async (
  account: SignerWithAddress,
  pool: UniswitchPool,
  tokenAmount: BigNumber,
  weiAmount: BigNumber,
): Promise<{ userShares: BigNumber; totalShares: BigNumber }> => {
  await pool.initializePool(tokenAmount, {
    value: weiAmount,
  });
  return await getPoolShares(account.address, pool);
};
