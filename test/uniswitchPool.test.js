const { expect } = require('chai');
const {
  ethers: { utils, getSigners, getContractFactory, BigNumber },
  waffle: { provider },
} = require('hardhat');

const {
  getBalances,
  getPoolShares,
  computeSwitchOutAmount,
  computeShareReceived,
  initPoolAndReturnSharesData,
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

    await token.mint(owner.address, oneWith18Decimals);
    await token.mint(user.address, oneWith18Decimals);
    await token.approve(poolAddress, oneWith18Decimals);
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
        token.balanceOf,
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
      ).to.be.revertedWith('UniswitchPool: pool already has liquidity');
    });
  });

  describe('provideLiquidity', () => {
    const weiProvided = BigNumber.from(10000);
    const weiDepositForInit = BigNumber.from(2000000);
    const tokenDepositForInit = BigNumber.from(1000000);

    it('should provide liquidity', async () => {
      const { userShares: initialUserShares, totalShares: initialTotalShares } =
        await initPoolAndReturnSharesData(
          user,
          pool,
          tokenDepositForInit,
          weiDepositForInit,
        );

      const { expectedShareAmount, expectedTokenAmount } = computeShareReceived(
        weiProvided,
        weiDepositForInit,
        tokenDepositForInit,
        initialTotalShares,
      );

      await pool.connect(user).provideLiquidity(0, { value: weiProvided });

      const { weiBalance: finalWeiBalance, tokenBalance: finalTokenBalance } =
        await getBalances(pool.address, token.balanceOf);
      const { userShares: finalUserShares, totalShares: finalTotalShares } =
        await getPoolShares(user.address, pool);

      expect(finalWeiBalance.sub(weiDepositForInit)).equal(weiProvided);
      expect(finalTokenBalance.sub(tokenDepositForInit)).equal(
        expectedTokenAmount,
      );
      expect(finalUserShares.sub(initialUserShares)).equal(expectedShareAmount);
      expect(finalTotalShares.sub(initialTotalShares)).equal(
        expectedShareAmount,
      );
    });

    it('should emit LiquidityProvided event', async () => {
      const { totalShares } = await initPoolAndReturnSharesData(
        user,
        pool,
        tokenDepositForInit,
        weiDepositForInit,
      );

      const { expectedShareAmount, expectedTokenAmount } = computeShareReceived(
        weiProvided,
        weiDepositForInit,
        tokenDepositForInit,
        totalShares,
      );

      const tx = await pool
        .connect(user)
        .provideLiquidity(0, { value: weiProvided });

      await expect(tx)
        .to.emit(pool, 'LiquidityProvided')
        .withArgs(
          user.address,
          expectedShareAmount,
          weiProvided,
          expectedTokenAmount,
        );
    });

    it('should not provide liquidity if pool not initialized', async () => {
      await expect(
        pool.connect(user).provideLiquidity(0, { value: weiProvided }),
      ).to.be.revertedWith('UniswitchPool: pool not initialized');
    });

    it('should not provide liquidity if not enough share received', async () => {
      const { totalShares } = await initPoolAndReturnSharesData(
        user,
        pool,
        tokenDepositForInit,
        weiDepositForInit,
      );

      const { expectedShareAmount } = computeShareReceived(
        weiProvided,
        weiDepositForInit,
        tokenDepositForInit,
        totalShares,
      );

      await expect(
        pool
          .connect(user)
          .provideLiquidity(expectedShareAmount.add(1), { value: weiProvided }),
      ).to.be.revertedWith('UniswitchPool: Not enough share received');
    });
  });

  describe('withdrawLiquidity', () => {
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
});
