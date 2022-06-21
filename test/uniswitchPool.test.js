const { expect } = require('chai');
const {
  ethers: { utils, getSigners, getContractFactory, BigNumber },
  waffle: { provider },
} = require('hardhat');

const {
  getBalances,
  getPoolShares,
  computeSwitchOutAmount,
  computeShareFlow,
} = require('./utils');

describe('UniswitchPool', (accounts) => {
  const oneWith18Decimals = utils.parseUnits('1', 18);

  let owner, user;
  let token;
  let factory;
  let pool;

  beforeEach(async () => {
    [owner, user] = await getSigners();

    const TestToken = await getContractFactory('TestToken');
    const UniswitchFactory = await getContractFactory('UniswitchFactory');
    const UniswitchPool = await getContractFactory('UniswitchPool');

    token = await TestToken.deploy('Test Token', 'TTK');
    factory = await UniswitchFactory.deploy();

    const tx = await factory.launchPool(token.address);
    const { events } = await tx.wait();
    const poolAddress = events[0].args.pool;
    pool = UniswitchPool.attach(poolAddress);

    await token.mint(user.address, oneWith18Decimals);
    await token.connect(user).approve(poolAddress, oneWith18Decimals);

    hre.tracer.nameTags[owner.address] = 'OWNER';
    hre.tracer.nameTags[user.address] = 'USER';
    hre.tracer.nameTags[factory.address] = 'FACTORY';
    hre.tracer.nameTags[pool.address] = 'POOL';
  });

  describe('initializePool', () => {
    const weiPooled = BigNumber.from(1000000);
    const tokenPooled = BigNumber.from(2000000);

    it('should initialize pool', async () => {
      await pool
        .connect(user)
        .initializePool(tokenPooled, { value: weiPooled });

      const { weiBalance, tokenBalance } = await getBalances(
        pool.address,
        token,
      );
      const { userShares, totalShares } = await getPoolShares(
        user.address,
        pool,
      );

      expect(weiBalance).to.equal(weiPooled);
      expect(tokenBalance).to.equal(tokenPooled);
      expect(userShares).to.equal(1000);
      expect(totalShares).to.equal(1000);
    });

    it('should emit PoolInitialized event', async () => {
      const tx = await pool
        .connect(user)
        .initializePool(tokenPooled, { value: weiPooled });
      const { events } = await tx.wait();

      await expect(tx)
        .to.emit(pool, 'PoolInitialized')
        .withArgs(pool.address, weiPooled, tokenPooled);
    });

    it('should not initialize pool with less than 100000 ether', async () => {
      await expect(
        pool.initializePool(tokenPooled, { value: 100 }),
      ).to.revertedWith('UniswitchPool: Not enough liquidity provided');
    });

    it('should not initialize pool with less than 100000 tokens', async () => {
      await expect(
        pool.initializePool(100, { value: weiPooled }),
      ).to.revertedWith('UniswitchPool: Not enough liquidity provided');
    });

    it('should not initialize pool if already initialized ', async () => {
      await pool
        .connect(user)
        .initializePool(tokenPooled, { value: weiPooled });

      await expect(
        pool.connect(user).initializePool(tokenPooled, { value: weiPooled }),
      ).to.be.revertedWith('UniswitchPool: already initialized');
    });
  });

  // it('should switch eth to token', async () => {
  //   const weiPooled = 10000000000;
  //   const tokenPooled = 20000000000;
  //   await pool.connect(user).initializePool(tokenPooled, { value: weiPooled });

  //   const initialUserTokenBalance = await token.balanceOf(user.address);

  //   const amountSwitched = 100000000;
  //   const expectedTokenAmount = computeSwitchOutAmount(amountSwitched, weiPooled, tokenPooled);

  //   const tx = await pool.connect(user).ethToTokenSwitch(0, { value: amountSwitched });
  //   await tx.wait();

  //   const { weiBalance: finalPoolWeiBalance, tokenBalance: finalPoolTokenBalance } =
  //     await getBalances(pool.address, token);
  //   const finalUserTokenBalance = await token.balanceOf(user.address);

  //   expect(finalPoolWeiBalance - weiPooled).to.equal(amountSwitched);
  //   expect(tokenPooled - finalPoolTokenBalance).to.equal(expectedTokenAmount);
  //   expect(finalUserTokenBalance.sub(initialUserTokenBalance)).to.equal(expectedTokenAmount);
  // });

  // it('should switch token to eth', async () => {
  //   const weiPooled = 10000000000;
  //   const tokenPooled = 20000000000;
  //   await pool.connect(user).initializePool(tokenPooled, { value: weiPooled });

  //   const initialUserWeiBalance = await provider.getBalance(user.address);
  //   const amountSwitched = 10000000;
  //   const expectedWeiAmount = computeSwitchOutAmount(amountSwitched, tokenPooled, weiPooled);

  //   await pool.connect(user).tokenToEthSwitch(amountSwitched, 0, { gasPrice: 0 });

  //   const { weiBalance: finalPoolWeiBalance, tokenBalance: finalPoolTokenBalance } =
  //     await getBalances(pool.address, token);
  //   const finalUserWeiBalance = await provider.getBalance(user.address);

  //   expect(finalPoolTokenBalance - tokenPooled).to.equal(amountSwitched);
  //   expect(weiPooled - finalPoolWeiBalance).to.equal(expectedWeiAmount);
  //   expect(finalUserWeiBalance.sub(initialUserWeiBalance)).to.equal(expectedWeiAmount);
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
