const { expect } = require('chai');
const { ethers } = require('hardhat');

const { getBalances, getPoolShares, computeSwitchOutAmount, computeShareFlow } = require('./utils');

describe('UniswitchPool', (accounts) => {
  let token;
  let factory;
  let pool;
  let owner;
  let user;

  beforeEach(async () => {
    const oneMillionString = ethers.utils.parseUnits('1', 18);

    [owner, user] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory('TestToken');
    const UniswitchFactory = await ethers.getContractFactory('UniswitchFactory');
    const UniswitchPool = await ethers.getContractFactory('UniswitchPool');

    token = await TestToken.deploy('Test Token', 'TTK');
    factory = await UniswitchFactory.deploy();

    await factory.launchPool(token.address);
    const poolAddress = await factory.tokenToPool(token.address);
    pool = UniswitchPool.attach(poolAddress);

    await token.mint(user.address, oneMillionString);
    await token.connect(user).approve(poolAddress, oneMillionString);
  });

  it('should initialize pool', async () => {
    const weiPooled = 1000000;
    const tokenPooled = 2000000;
    await pool.connect(user).initializePool(tokenPooled, { value: weiPooled });

    const { weiBalance, tokenBalance } = await getBalances(pool.address, token);
    const { userShares, totalShares } = await getPoolShares(user.address, pool);

    expect(weiBalance).to.equal(weiPooled);
    expect(tokenBalance).to.equal(tokenPooled);
    expect(userShares).to.equal(1000);
    expect(totalShares).to.equal(1000);
  });

  // it('should NOT initialize a pool with low amounts', async () => {
  //   await expectRevert(pool.initializePool(1000, { value: 100 }), 'Not enough liquidity provided');
  // });

  // it('should switch eth to token', async () => {
  //   const [initialPoolWeiBalance, initialPoolTokenBalance] = await getBalances(pool.address, token);
  //   const initialUserTokenBalance = await token.balanceOf(accounts[0]);

  //   const amountSwitched = 10000;
  //   const expectedTokenAmount = computeSwitchOutAmount(
  //     amountSwitched,
  //     parseInt(initialPoolWeiBalance),
  //     initialPoolTokenBalance,
  //   );

  //   await pool.ethToTokenSwitch(0, { value: amountSwitched });

  //   const [finalPoolWeiBalance, finalPoolTokenBalance] = await getBalances(pool.address, token);
  //   const finalUserTokenBalance = await token.balanceOf(accounts[0]);

  //   assert.equal(
  //     finalPoolWeiBalance - initialPoolWeiBalance,
  //     amountSwitched,
  //     'Wrong pool wei final amount',
  //   );
  //   assert.equal(
  //     finalPoolTokenBalance - initialPoolTokenBalance,
  //     -expectedTokenAmount,
  //     'Wrong pool token final amount',
  //   );
  //   assert.equal(
  //     finalUserTokenBalance.sub(initialUserTokenBalance).toNumber(),
  //     expectedTokenAmount,
  //     'Wrong user token final amount',
  //   );
  // });

  // it('should switch eth to token a second time', async () => {
  //   const [initialPoolWeiBalance, initialPoolTokenBalance] = await getBalances(pool.address, token);
  //   const initialUserTokenBalance = await token.balanceOf(accounts[0]);

  //   const amountSwitched = 10000;
  //   const expectedTokenAmount = computeSwitchOutAmount(
  //     amountSwitched,
  //     parseInt(initialPoolWeiBalance),
  //     initialPoolTokenBalance,
  //   );

  //   await pool.ethToTokenSwitch(0, { value: amountSwitched });

  //   const [finalPoolWeiBalance, finalPoolTokenBalance] = await getBalances(pool.address, token);
  //   const finalUserTokenBalance = await token.balanceOf(accounts[0]);

  //   assert.equal(
  //     finalPoolWeiBalance - initialPoolWeiBalance,
  //     amountSwitched,
  //     'Wrong pool wei final amount',
  //   );
  //   assert.equal(
  //     finalPoolTokenBalance - initialPoolTokenBalance,
  //     -expectedTokenAmount,
  //     'Wrong pool token final amount',
  //   );
  //   assert.equal(
  //     finalUserTokenBalance.sub(initialUserTokenBalance).toNumber(),
  //     expectedTokenAmount,
  //     'Wrong user token final amount',
  //   );
  // });

  // it('should switch token to eth', async () => {
  //   const [initialWeiBalance, initialTokenBalance] = await getBalances(pool.address, token);
  //   const initialUserTokenBalance = await token.balanceOf(accounts[0]);

  //   const amountSwitched = 10000;
  //   const expectedWeiAmount = computeSwitchOutAmount(
  //     amountSwitched,
  //     initialTokenBalance.toNumber(),
  //     initialWeiBalance,
  //   );

  //   await pool.tokenToEthSwitch(10000, 0);

  //   const [finalWeiBalance, finalTokenBalance] = await getBalances(pool.address, token);
  //   const finalUserTokenBalance = await token.balanceOf(accounts[0]);

  //   assert.equal(
  //     finalTokenBalance - initialTokenBalance,
  //     amountSwitched,
  //     'Wrong pool token final amount',
  //   );
  //   assert.equal(
  //     finalWeiBalance - initialWeiBalance,
  //     -expectedWeiAmount,
  //     'Wrong pool wei final amount',
  //   );
  //   assert.equal(
  //     finalUserTokenBalance.sub(initialUserTokenBalance).toNumber(),
  //     -amountSwitched,
  //     'Wrong user token final amount',
  //   );
  // });

  // it('should invest liquidity', async () => {
  //   const weiInvested = 10000;

  //   const [initialWeiBalance, initialTokenBalance] = await getBalances(pool.address, token);
  //   const [initialUserShares, initialTotalShares] = await getPoolShares(accounts[0], pool);

  //   const [expectedShareAmount, expectedTokenAmount] = computeShareFlow(
  //     weiInvested,
  //     initialWeiBalance,
  //     initialTokenBalance,
  //     initialTotalShares,
  //   );

  //   await pool.investLiquidity(0, { value: weiInvested });

  //   const [finalWeiBalance, finalTokenBalance] = await getBalances(pool.address, token);
  //   const [finalUserShares, finalTotalShares] = await getPoolShares(accounts[0], pool);

  //   assert.equal(finalWeiBalance - initialWeiBalance, weiInvested, 'Wrong pool wei final amount');
  //   assert.equal(
  //     finalTokenBalance - initialTokenBalance,
  //     expectedTokenAmount,
  //     'Wrong pool token final amount',
  //   );
  //   assert.equal(
  //     finalUserShares - initialUserShares,
  //     expectedShareAmount,
  //     'Wrong user share final amount',
  //   );
  //   assert.equal(
  //     finalTotalShares - initialTotalShares,
  //     expectedShareAmount,
  //     'Wrong total share final amount',
  //   );
  // });

  // it('should divest liquidity', async () => {
  //   const weiDivested = 8000;

  //   const [initialWeiBalance, initialTokenBalance] = await getBalances(pool.address, token);
  //   const [initialUserShares, initialTotalShares] = await getPoolShares(accounts[0], pool);

  //   const [expectedShareAmount, expectedTokenAmount] = computeShareFlow(
  //     weiDivested,
  //     initialWeiBalance,
  //     initialTokenBalance,
  //     initialTotalShares,
  //   );

  //   await pool.divestLiquidity(weiDivested, 0);

  //   const [finalWeiBalance, finalTokenBalance] = await getBalances(pool.address, token);
  //   const [finalUserShares, finalTotalShares] = await getPoolShares(accounts[0], pool);

  //   assert.equal(initialWeiBalance - finalWeiBalance, weiDivested, 'Wrong pool wei final amount');
  //   assert.equal(
  //     initialTokenBalance - finalTokenBalance,
  //     expectedTokenAmount,
  //     'Wrong pool token final amount',
  //   );
  //   assert.equal(
  //     initialUserShares - finalUserShares,
  //     expectedShareAmount,
  //     'Wrong user share final amount',
  //   );
  //   assert.equal(
  //     initialTotalShares - finalTotalShares,
  //     expectedShareAmount,
  //     'Wrong total share final amount',
  //   );
  // });
});
