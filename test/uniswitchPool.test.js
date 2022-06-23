const { expect } = require('chai');
const {
  ethers: { utils, getSigners, getContractFactory, BigNumber },
  waffle: { provider },
} = require('hardhat');

const {
  getBalances,
  getPoolShares,
  computeSwitchOutAmount,
  computeSharesAmount,
  initPoolAndReturnSharesData,
} = require('./utils');

describe('UniswitchPool', () => {
  const oneWith18Decimals = utils.parseUnits('1', 18);

  let owner, user, user2;
  let token;
  let factory;
  let pool;

  beforeEach(async () => {
    [owner, user, user2] = await getSigners();

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
      const k = await pool.k();

      expect(weiBalance).to.equal(weiPooled);
      expect(tokenBalance).to.equal(tokenPooled);
      expect(userShares).to.equal(100000000);
      expect(totalShares).to.equal(100000000);
      expect(k).equal(weiPooled.mul(tokenPooled));
    });

    it('should emit PoolInitialized event', async () => {
      const tx = await pool
        .connect(user)
        .initializePool(tokenPooled, { value: weiPooled });

      await expect(tx)
        .to.emit(pool, 'PoolInitialized')
        .withArgs(weiPooled, tokenPooled);
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
      ).to.be.revertedWith('UniswitchPool: Pool already has liquidity');
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

      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiProvided,
        weiDepositForInit,
        tokenDepositForInit,
        initialTotalShares,
      );

      await pool
        .connect(user)
        .provideLiquidity(expectedShareAmount, { value: weiProvided });

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

      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiProvided,
        weiDepositForInit,
        tokenDepositForInit,
        totalShares,
      );

      const tx = await pool
        .connect(user)
        .provideLiquidity(expectedShareAmount, { value: weiProvided });

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
      ).to.be.revertedWith('UniswitchPool: Pool not initialized');
    });

    it('should not provide liquidity if not enough share received', async () => {
      const { totalShares } = await initPoolAndReturnSharesData(
        user,
        pool,
        tokenDepositForInit,
        weiDepositForInit,
      );

      const { expectedShareAmount } = computeSharesAmount(
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
    const weiDepositForInit = BigNumber.from(2000000);
    const tokenDepositForInit = BigNumber.from(1000000);

    beforeEach(async () => {
      await pool.initializePool(tokenDepositForInit, {
        value: weiDepositForInit,
      });
    });

    it('should withdraw liquidity', async () => {
      const weiWithdrew = BigNumber.from(8000);

      const { userShares: initialUserShares, totalShares: initialTotalShares } =
        await getPoolShares(owner.address, pool);
      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiWithdrew,
        weiDepositForInit,
        tokenDepositForInit,
        initialTotalShares,
      );

      await pool.withdrawLiquidity(weiWithdrew, expectedTokenAmount);

      const { weiBalance: finalWeiBalance, tokenBalance: finalTokenBalance } =
        await getBalances(pool.address, token.balanceOf);
      const { userShares: finalUserShares, totalShares: finalTotalShares } =
        await getPoolShares(owner.address, pool);

      expect(weiDepositForInit.sub(finalWeiBalance)).equal(weiWithdrew);
      expect(tokenDepositForInit.sub(finalTokenBalance)).equal(
        expectedTokenAmount,
      );
      expect(initialUserShares.sub(finalUserShares)).equal(expectedShareAmount);
      expect(initialTotalShares.sub(finalTotalShares)).equal(
        expectedShareAmount,
      );
    });

    it('should should emit LiquidityWithdrew event', async () => {
      const weiWithdrew = BigNumber.from(8000);

      const { totalShares } = await getPoolShares(owner.address, pool);
      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiWithdrew,
        weiDepositForInit,
        tokenDepositForInit,
        totalShares,
      );

      await expect(pool.withdrawLiquidity(weiWithdrew, expectedTokenAmount))
        .to.emit(pool, 'LiquidityWithdrew')
        .withArgs(
          owner.address,
          expectedShareAmount,
          weiWithdrew,
          expectedTokenAmount,
        );
    });

    it('should withdraw all liquidity', async () => {
      it('should divest liquidity', async () => {
        await pool.withdrawLiquidity(weiDepositForInit, 0);

        const { weiBalance, tokenBalance } = await getBalances(
          pool.address,
          token.balanceOf,
        );
        const { userShares, totalShares } = await getPoolShares(
          owner.address,
          pool,
        );

        expect(weiBalance).equal(0);
        expect(tokenBalance).equal(0);
        expect(userShares).equal(0);
        expect(totalShares).equal(0);
      });
    });

    it('should correctly withdraw after provide for provider', async () => {
      await pool.connect(user).provideLiquidity(0, { value: 10000000 });

      const weiWithdrew = BigNumber.from(8000);

      const {
        weiBalance: initialWeiBalance,
        tokenBalance: initialTokenBalance,
      } = await getBalances(pool.address, token.balanceOf);
      const { userShares: initialUserShares, totalShares: initialTotalShares } =
        await getPoolShares(user.address, pool);
      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiWithdrew,
        initialWeiBalance,
        initialTokenBalance,
        initialTotalShares,
      );

      await pool
        .connect(user)
        .withdrawLiquidity(weiWithdrew, expectedTokenAmount);

      const { weiBalance: finalWeiBalance, tokenBalance: finalTokenBalance } =
        await getBalances(pool.address, token.balanceOf);
      const { userShares: finalUserShares, totalShares: finalTotalShares } =
        await getPoolShares(user.address, pool);

      expect(initialWeiBalance.sub(finalWeiBalance)).equal(weiWithdrew);
      expect(initialTokenBalance.sub(finalTokenBalance)).equal(
        expectedTokenAmount,
      );
      expect(initialUserShares.sub(finalUserShares)).equal(expectedShareAmount);
      expect(initialTotalShares.sub(finalTotalShares)).equal(
        expectedShareAmount,
      );
    });

    it('should correctly withdraw after provide for initiator', async () => {
      await pool.connect(user).provideLiquidity(0, { value: 10000000 });

      const weiWithdrew = BigNumber.from(8000);

      const {
        weiBalance: initialWeiBalance,
        tokenBalance: initialTokenBalance,
      } = await getBalances(pool.address, token.balanceOf);
      const { userShares: initialUserShares, totalShares: initialTotalShares } =
        await getPoolShares(owner.address, pool);
      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiWithdrew,
        initialWeiBalance,
        initialTokenBalance,
        initialTotalShares,
      );

      await pool.withdrawLiquidity(weiWithdrew, expectedTokenAmount);

      const { weiBalance: finalWeiBalance, tokenBalance: finalTokenBalance } =
        await getBalances(pool.address, token.balanceOf);
      const { userShares: finalUserShares, totalShares: finalTotalShares } =
        await getPoolShares(owner.address, pool);

      expect(initialWeiBalance.sub(finalWeiBalance)).equal(weiWithdrew);
      expect(initialTokenBalance.sub(finalTokenBalance)).equal(
        expectedTokenAmount,
      );
      expect(initialUserShares.sub(finalUserShares)).equal(expectedShareAmount);
      expect(initialTotalShares.sub(finalTotalShares)).equal(
        expectedShareAmount,
      );
    });

    it('should correctly withdraw after switch', async () => {
      await pool
        .connect(user)
        .ethToTokenSwitch(user.address, 0, { value: 10000000 });

      const weiWithdrew = BigNumber.from(8000);

      const {
        weiBalance: initialWeiBalance,
        tokenBalance: initialTokenBalance,
      } = await getBalances(pool.address, token.balanceOf);
      const { userShares: initialUserShares, totalShares: initialTotalShares } =
        await getPoolShares(owner.address, pool);
      const { expectedShareAmount, expectedTokenAmount } = computeSharesAmount(
        weiWithdrew,
        initialWeiBalance,
        initialTokenBalance,
        initialTotalShares,
      );

      await pool.withdrawLiquidity(weiWithdrew, expectedTokenAmount);

      const { weiBalance: finalWeiBalance, tokenBalance: finalTokenBalance } =
        await getBalances(pool.address, token.balanceOf);
      const { userShares: finalUserShares, totalShares: finalTotalShares } =
        await getPoolShares(owner.address, pool);

      expect(initialWeiBalance.sub(finalWeiBalance)).equal(weiWithdrew);
      expect(initialTokenBalance.sub(finalTokenBalance)).equal(
        expectedTokenAmount,
      );
      expect(initialUserShares.sub(finalUserShares)).equal(expectedShareAmount);
      expect(initialTotalShares.sub(finalTotalShares)).equal(
        expectedShareAmount,
      );
    });

    it('should not withdraw more than provided', async () => {
      const weiProvided = BigNumber.from(80000);

      await pool.connect(user).provideLiquidity(0, { value: weiProvided });

      await expect(pool.connect(user).withdrawLiquidity(weiProvided.add(1), 0))
        .to.be.reverted;
    });

    it('should not withdraw if not enough tokens in return', async () => {
      const weiWithdrew = BigNumber.from(8000);

      const { totalShares } = await getPoolShares(owner.address, pool);
      const { expectedTokenAmount } = computeSharesAmount(
        weiWithdrew,
        weiDepositForInit,
        tokenDepositForInit,
        totalShares,
      );

      await expect(
        pool.withdrawLiquidity(weiWithdrew, expectedTokenAmount.add(1)),
      ).to.be.revertedWith('UniswitchPool: Not enough token in return');
    });

    it('should not withdraw if not enough liquidity', async () => {
      await expect(
        pool.withdrawLiquidity(weiDepositForInit.add(1), 0),
      ).to.be.revertedWith('UniswitchPool: Not enough shares in the pool');
    });
  });

  describe('Switch', () => {
    const weiDepositForInit = BigNumber.from(200000000);
    const tokenDepositForInit = BigNumber.from(100000000000);

    beforeEach(async () => {
      await pool.initializePool(tokenDepositForInit, {
        value: weiDepositForInit,
      });
    });

    describe('ethToTokenSwitch', () => {
      it('should switch', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const initialUserTokenBalance = await token.balanceOf(user.address);
        const expectedTokenAmount = computeSwitchOutAmount(
          amountSwitched,
          weiDepositForInit,
          tokenDepositForInit,
          await pool.FEE_RATE(),
        );

        await pool
          .connect(user)
          .ethToTokenSwitch(user.address, expectedTokenAmount, {
            value: amountSwitched,
          });

        const {
          weiBalance: finalPoolWeiBalance,
          tokenBalance: finalPoolTokenBalance,
        } = await getBalances(pool.address, token.balanceOf);
        const finalUserTokenBalance = await token.balanceOf(user.address);

        expect(finalPoolWeiBalance.sub(weiDepositForInit)).to.equal(
          amountSwitched,
        );
        expect(tokenDepositForInit.sub(finalPoolTokenBalance)).to.equal(
          expectedTokenAmount,
        );
        expect(finalUserTokenBalance.sub(initialUserTokenBalance)).to.equal(
          expectedTokenAmount,
        );
      });

      it('should switch twice', async () => {
        const amount1Switched = BigNumber.from(1000000);
        const amount2Switched = BigNumber.from(53000000);

        const initialUserTokenBalance = await token.balanceOf(user.address);

        const feeRate = await pool.FEE_RATE();
        const expectedTokenOut1 = computeSwitchOutAmount(
          amount1Switched,
          weiDepositForInit,
          tokenDepositForInit,
          feeRate,
        );
        const expectedTokenOut2 = computeSwitchOutAmount(
          amount2Switched,
          weiDepositForInit.add(amount1Switched),
          tokenDepositForInit.sub(expectedTokenOut1),
          feeRate,
        );

        await pool
          .connect(user)
          .ethToTokenSwitch(user.address, expectedTokenOut1, {
            value: amount1Switched,
          });
        await pool
          .connect(user)
          .ethToTokenSwitch(user.address, expectedTokenOut2, {
            value: amount2Switched,
          });

        const {
          weiBalance: finalPoolWeiBalance,
          tokenBalance: finalPoolTokenBalance,
        } = await getBalances(pool.address, token.balanceOf);
        const finalUserTokenBalance = await token.balanceOf(user.address);

        expect(finalPoolWeiBalance.sub(weiDepositForInit)).to.equal(
          amount1Switched.add(amount2Switched),
        );
        expect(tokenDepositForInit.sub(finalPoolTokenBalance)).to.equal(
          expectedTokenOut1.add(expectedTokenOut2),
        );
        expect(finalUserTokenBalance.sub(initialUserTokenBalance)).to.equal(
          expectedTokenOut1.add(expectedTokenOut2),
        );
      });

      it('should receive switch on `to` address', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const initialUserTokenBalance = await token.balanceOf(user2.address);
        const expectedTokenAmount = computeSwitchOutAmount(
          amountSwitched,
          weiDepositForInit,
          tokenDepositForInit,
          await pool.FEE_RATE(),
        );

        await pool
          .connect(user)
          .ethToTokenSwitch(user2.address, expectedTokenAmount, {
            value: amountSwitched,
          });

        const finalUserTokenBalance = await token.balanceOf(user2.address);

        expect(finalUserTokenBalance.sub(initialUserTokenBalance)).to.equal(
          expectedTokenAmount,
        );
      });

      it('should emit EthToTokenSwitched event', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedTokenAmount = computeSwitchOutAmount(
          amountSwitched,
          weiDepositForInit,
          tokenDepositForInit,
          await pool.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .ethToTokenSwitch(user.address, expectedTokenAmount, {
              value: amountSwitched,
            }),
        )
          .to.emit(pool, 'EthToTokenSwitched')
          .withArgs(
            user.address,
            user.address,
            amountSwitched,
            expectedTokenAmount,
          );
      });

      it('should emit EthToTokenSwitched event with specific `to` address', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedTokenAmount = computeSwitchOutAmount(
          amountSwitched,
          weiDepositForInit,
          tokenDepositForInit,
          await pool.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .ethToTokenSwitch(user2.address, expectedTokenAmount, {
              value: amountSwitched,
            }),
        )
          .to.emit(pool, 'EthToTokenSwitched')
          .withArgs(
            user.address,
            user2.address,
            amountSwitched,
            expectedTokenAmount,
          );
      });

      it('should not switch eth for tokens if not enough tokens out', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedTokenAmount = computeSwitchOutAmount(
          amountSwitched,
          weiDepositForInit,
          tokenDepositForInit,
          await pool.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .ethToTokenSwitch(user.address, expectedTokenAmount.add(1), {
              value: amountSwitched,
            }),
        ).to.be.revertedWith('UniswitchPool: Not enough tokens received');
      });
    });

    describe('tokenToEthSwitch', () => {
      it('should switch', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedWeiAmount = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        const tx = await pool
          .connect(user)
          .tokenToEthSwitch(user.address, amountSwitched, expectedWeiAmount);
        const { events } = await tx.wait();

        const {
          weiBalance: finalPoolWeiBalance,
          tokenBalance: finalPoolTokenBalance,
        } = await getBalances(pool.address, token.balanceOf);

        expect(weiDepositForInit.sub(finalPoolWeiBalance)).to.equal(
          expectedWeiAmount,
        );
        expect(finalPoolTokenBalance.sub(tokenDepositForInit)).to.equal(
          amountSwitched,
        );
        expect(events[events.length - 1].args.weiOut).to.equal(
          expectedWeiAmount,
        );
      });

      it('should switch twice', async () => {
        const amount1Switched = BigNumber.from(1000000);
        const amount2Switched = BigNumber.from(53000000);

        const feeRate = await pool.FEE_RATE();
        const expectedWeiOut1 = computeSwitchOutAmount(
          amount1Switched,
          tokenDepositForInit,
          weiDepositForInit,
          feeRate,
        );
        const expectedWeiOut2 = computeSwitchOutAmount(
          amount2Switched,
          tokenDepositForInit.add(amount1Switched),
          weiDepositForInit.sub(expectedWeiOut1),
          feeRate,
        );

        const tx1 = await pool
          .connect(user)
          .tokenToEthSwitch(user.address, amount1Switched, expectedWeiOut1);
        const { events: events1 } = await tx1.wait();
        const tx2 = await pool
          .connect(user)
          .tokenToEthSwitch(user.address, amount2Switched, expectedWeiOut2);
        const { events: events2 } = await tx2.wait();

        const weiOut1 = events1[events1.length - 1].args.weiOut;
        const weiOut2 = events2[events1.length - 1].args.weiOut;

        const {
          weiBalance: finalPoolWeiBalance,
          tokenBalance: finalPoolTokenBalance,
        } = await getBalances(pool.address, token.balanceOf);

        expect(weiDepositForInit.sub(finalPoolWeiBalance)).to.equal(
          expectedWeiOut1.add(expectedWeiOut2),
        );
        expect(finalPoolTokenBalance.sub(tokenDepositForInit)).to.equal(
          amount1Switched.add(amount2Switched),
        );
        expect(weiOut1.add(weiOut2)).to.equal(
          expectedWeiOut1.add(expectedWeiOut2),
        );
      });

      it('should receive switch on `to` address', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const initialUserTokenBalance = await provider.getBalance(
          user2.address,
        );
        const expectedWeiAmount = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        await pool
          .connect(user)
          .tokenToEthSwitch(user2.address, amountSwitched, expectedWeiAmount);

        const finalUserTokenBalance = await provider.getBalance(user2.address);

        expect(finalUserTokenBalance.sub(initialUserTokenBalance)).to.equal(
          expectedWeiAmount,
        );
      });

      it('should emit TokenToEthSwitched event', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedWeiAmount = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .tokenToEthSwitch(user.address, amountSwitched, expectedWeiAmount),
        )
          .to.emit(pool, 'TokenToEthSwitched')
          .withArgs(
            user.address,
            user.address,
            amountSwitched,
            expectedWeiAmount,
          );
      });

      it('should emit TokenToEthSwitched event with specific `to` address', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedWeiAmount = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .tokenToEthSwitch(user2.address, amountSwitched, expectedWeiAmount),
        )
          .to.emit(pool, 'TokenToEthSwitched')
          .withArgs(
            user.address,
            user2.address,
            amountSwitched,
            expectedWeiAmount,
          );
      });

      it('should not swith tokens for eth if not enough eth out', async () => {
        const amountSwitched = BigNumber.from(1000000);

        const expectedWeiAmount = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .tokenToEthSwitch(
              user.address,
              amountSwitched,
              expectedWeiAmount.add(1),
            ),
        ).to.be.revertedWith('UniswitchPool: Not enough wei received');
      });
    });

    describe('tokenToTokenSwitch', () => {
      const wei2DepositForInit = BigNumber.from(8000000);
      const token2DepositForInit = BigNumber.from(3000000000);
      const amountSwitched = BigNumber.from(2500000);

      let token2;
      let pool2;

      beforeEach(async () => {
        const TestToken = await getContractFactory('TestToken');
        const UniswitchPool = await getContractFactory('UniswitchPool');

        token2 = await TestToken.deploy('Test Token 2', 'TTK2');

        const tx = await factory.launchPool(token2.address);
        const { events } = await tx.wait();
        const pool2Address = events[0].args.pool;
        pool2 = UniswitchPool.attach(pool2Address);

        await token2.mint(owner.address, oneWith18Decimals);
        await token2.approve(pool2Address, oneWith18Decimals);
        await pool2.initializePool(token2DepositForInit, {
          value: wei2DepositForInit,
        });

        hre.tracer.nameTags[token2.address] = 'TOKEN2';
        hre.tracer.nameTags[pool2.address] = 'POOL2';
      });

      it('should switch', async () => {
        const initialUserBalance = await token2.balanceOf(user.address);

        const expectedWeiOut = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        const expectedTokenOut = computeSwitchOutAmount(
          expectedWeiOut,
          wei2DepositForInit,
          token2DepositForInit,
          await pool2.FEE_RATE(),
        );

        await pool
          .connect(user)
          .tokenToTokenSwitch(
            user.address,
            amountSwitched,
            expectedTokenOut,
            token2.address,
          );

        const finalUserBalance = await token2.balanceOf(user.address);

        const {
          weiBalance: finalPoolWeiBalance,
          tokenBalance: finalPoolTokenBalance,
        } = await getBalances(pool.address, token.balanceOf);
        const {
          weiBalance: finalPool2WeiBalance,
          tokenBalance: finalPool2TokenBalance,
        } = await getBalances(pool2.address, token2.balanceOf);

        expect(weiDepositForInit.sub(finalPoolWeiBalance)).to.equal(
          expectedWeiOut,
        );
        expect(finalPoolTokenBalance.sub(tokenDepositForInit)).to.equal(
          amountSwitched,
        );
        expect(finalPool2WeiBalance.sub(wei2DepositForInit)).to.equal(
          expectedWeiOut,
        );
        expect(token2DepositForInit.sub(finalPool2TokenBalance)).to.equal(
          expectedTokenOut,
        );
        expect(finalUserBalance.sub(initialUserBalance)).equal(
          expectedTokenOut,
        );
      });

      it('should switch twice', async () => {
        const amount1Switched = BigNumber.from(1000000);
        const amount2Switched = BigNumber.from(53000000);

        const initialUserBalance = await token2.balanceOf(user.address);

        const feeRate1 = await pool.FEE_RATE();
        const feeRate2 = await pool2.FEE_RATE();
        const expectedWeiOut1 = computeSwitchOutAmount(
          amount1Switched,
          tokenDepositForInit,
          weiDepositForInit,
          feeRate1,
        );
        const expectedTokenOut1 = computeSwitchOutAmount(
          expectedWeiOut1,
          wei2DepositForInit,
          token2DepositForInit,
          feeRate2,
        );
        const expectedWeiOut2 = computeSwitchOutAmount(
          amount2Switched,
          tokenDepositForInit.add(amount1Switched),
          weiDepositForInit.sub(expectedWeiOut1),
          feeRate1,
        );
        const expectedTokenOut2 = computeSwitchOutAmount(
          expectedWeiOut2,
          wei2DepositForInit.add(expectedWeiOut1),
          token2DepositForInit.sub(expectedTokenOut1),
          feeRate2,
        );

        await pool
          .connect(user)
          .tokenToTokenSwitch(
            user.address,
            amount1Switched,
            expectedTokenOut1,
            token2.address,
          );
        await pool
          .connect(user)
          .tokenToTokenSwitch(
            user.address,
            amount2Switched,
            expectedTokenOut2,
            token2.address,
          );

        const finalUserBalance = await token2.balanceOf(user.address);

        const {
          weiBalance: finalPoolWeiBalance,
          tokenBalance: finalPoolTokenBalance,
        } = await getBalances(pool.address, token.balanceOf);
        const {
          weiBalance: finalPool2WeiBalance,
          tokenBalance: finalPool2TokenBalance,
        } = await getBalances(pool2.address, token2.balanceOf);

        expect(weiDepositForInit.sub(finalPoolWeiBalance)).to.equal(
          expectedWeiOut1.add(expectedWeiOut2),
        );
        expect(finalPoolTokenBalance.sub(tokenDepositForInit)).to.equal(
          amount1Switched.add(amount2Switched),
        );
        expect(finalPool2WeiBalance.sub(wei2DepositForInit)).to.equal(
          expectedWeiOut1.add(expectedWeiOut2),
        );
        expect(token2DepositForInit.sub(finalPool2TokenBalance)).to.equal(
          expectedTokenOut1.add(expectedTokenOut2),
        );
        expect(finalUserBalance.sub(initialUserBalance)).equal(
          expectedTokenOut1.add(expectedTokenOut2),
        );
      });

      it('should receive switch on `to` address', async () => {
        const initialUserBalance = await token2.balanceOf(user2.address);

        const expectedWeiOut = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );

        const expectedTokenOut = computeSwitchOutAmount(
          expectedWeiOut,
          wei2DepositForInit,
          token2DepositForInit,
          await pool2.FEE_RATE(),
        );

        await pool
          .connect(user)
          .tokenToTokenSwitch(
            user2.address,
            amountSwitched,
            expectedTokenOut,
            token2.address,
          );

        const finalUserBalance = await token2.balanceOf(user2.address);

        expect(finalUserBalance.sub(initialUserBalance)).equal(
          expectedTokenOut,
        );
      });

      it('should emit TokenToEthSwitched & EthToTokenSwitched events', async () => {
        const expectedWeiOut = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );
        const expectedTokenOut = computeSwitchOutAmount(
          expectedWeiOut,
          wei2DepositForInit,
          token2DepositForInit,
          await pool2.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .tokenToTokenSwitch(
              user.address,
              amountSwitched,
              expectedTokenOut,
              token2.address,
            ),
        )
          .to.emit(pool, 'TokenToEthSwitched')
          .withArgs(user.address, pool2.address, amountSwitched, expectedWeiOut)
          .to.emit(pool2, 'EthToTokenSwitched')
          .withArgs(
            pool.address,
            user.address,
            expectedWeiOut,
            expectedTokenOut,
          );
      });

      it('should emit TokenToEthSwitched & EthToTokenSwitched events with specific `to` address', async () => {
        const expectedWeiOut = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );
        const expectedTokenOut = computeSwitchOutAmount(
          expectedWeiOut,
          wei2DepositForInit,
          token2DepositForInit,
          await pool2.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .tokenToTokenSwitch(
              user2.address,
              amountSwitched,
              expectedTokenOut,
              token2.address,
            ),
        )
          .to.emit(pool2, 'EthToTokenSwitched')
          .withArgs(
            pool.address,
            user2.address,
            expectedWeiOut,
            expectedTokenOut,
          );
      });

      it('should not switch if not enough tokens out', async () => {
        const expectedWeiOut = computeSwitchOutAmount(
          amountSwitched,
          tokenDepositForInit,
          weiDepositForInit,
          await pool.FEE_RATE(),
        );
        const expectedTokenOut = computeSwitchOutAmount(
          expectedWeiOut,
          wei2DepositForInit,
          token2DepositForInit,
          await pool2.FEE_RATE(),
        );

        await expect(
          pool
            .connect(user)
            .tokenToTokenSwitch(
              user.address,
              amountSwitched,
              expectedTokenOut.add(1),
              token2.address,
            ),
        ).to.be.revertedWith('UniswitchPool: Not enough tokens received');
      });

      it('should not switch if no pool associated to token', async () => {
        const { address: randomAddress } = ethers.Wallet.createRandom();

        await expect(
          pool
            .connect(user)
            .tokenToTokenSwitch(user.address, amountSwitched, 0, randomAddress),
        ).to.be.revertedWith('UniswitchPool: No pool for this token');
      });
    });
  });
});
