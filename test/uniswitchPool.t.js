const { getBalances, getPoolShares, computeSwitchOutAmount, computeShareFlow } = require('./tools');

const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');
const UniswitchPool = artifacts.require('UniswitchPool');

contract('UniswitchPool', accounts => {
    let token = null;
    let factory = null;
    let pool = null;

    before(async () => {
        token = await TestToken.new('Test Token', 'TTK');
        await token.mint(accounts[0], web3.utils.toWei('1', 'ether'));

        factory = await UniswitchFactory.deployed();
        await factory.launchPool(token.address);
        const poolAddr = await factory.tokenToPool(token.address);
        pool = await UniswitchPool.at(poolAddr);

        token.approve(pool.address, web3.utils.toWei('1', 'ether'));
    });

    it('should initialize pool', async () => {
        await pool.initializePool(1000000, { value: 1000000 });

        const [weiBalance, tokenBalance] = await getBalances(pool.address, token);
        const [userShares, totalShares] = await getPoolShares(accounts[0], pool);

        assert.equal(weiBalance, 1000000, 'Wrong wei balance');
        assert.equal(tokenBalance.toNumber(), 1000000, 'Wrong token balance');
        assert.equal(userShares, 1000, 'Wrong user share amount');
        assert.equal(totalShares, 1000, 'Wrong total share amount');
    });

    it('should switch eth to token', async () => {
        const [initialPoolWeiBalance, initialPoolTokenBalance] = await getBalances(pool.address, token);
        const initialUserTokenBalance = await token.balanceOf(accounts[0]);

        const amountSwitched = 10000;
        const expectedTokenAmount = computeSwitchOutAmount(amountSwitched, parseInt(initialPoolWeiBalance), initialPoolTokenBalance);

        await pool.ethToTokenSwitch(0, { value: amountSwitched });

        const [finalPoolWeiBalance, finalPoolTokenBalance] = await getBalances(pool.address, token);
        const finalUserTokenBalance = await token.balanceOf(accounts[0]);

        assert.equal(finalPoolWeiBalance - initialPoolWeiBalance, amountSwitched, 'Wrong pool wei final amount');
        assert.equal(finalPoolTokenBalance - initialPoolTokenBalance, -expectedTokenAmount, 'Wrong pool token final amount');
        assert.equal(finalUserTokenBalance.sub(initialUserTokenBalance).toNumber(), expectedTokenAmount, 'Wrong user token final amount');
    });

    it('should switch eth to token a second time', async () => {
        const [initialPoolWeiBalance, initialPoolTokenBalance] = await getBalances(pool.address, token);
        const initialUserTokenBalance = await token.balanceOf(accounts[0]);

        const amountSwitched = 10000;
        const expectedTokenAmount = computeSwitchOutAmount(amountSwitched, parseInt(initialPoolWeiBalance), initialPoolTokenBalance);

        await pool.ethToTokenSwitch(0, { value: amountSwitched });

        const [finalPoolWeiBalance, finalPoolTokenBalance] = await getBalances(pool.address, token);
        const finalUserTokenBalance = await token.balanceOf(accounts[0]);

        assert.equal(finalPoolWeiBalance - initialPoolWeiBalance, amountSwitched, 'Wrong pool wei final amount');
        assert.equal(finalPoolTokenBalance - initialPoolTokenBalance, -expectedTokenAmount, 'Wrong pool token final amount')
        assert.equal(finalUserTokenBalance.sub(initialUserTokenBalance).toNumber(), expectedTokenAmount, 'Wrong user token final amount');
    });

    it('should switch token to eth', async () => {
        const [initialWeiBalance, initialTokenBalance] = await getBalances(pool.address, token);
        const initialUserTokenBalance = await token.balanceOf(accounts[0]);

        const amountSwitched = 10000;
        const expectedWeiAmount = computeSwitchOutAmount(amountSwitched, initialTokenBalance.toNumber(), initialWeiBalance);

        await pool.tokenToEthSwitch(10000, 0);

        const [finalWeiBalance, finalTokenBalance] = await getBalances(pool.address, token);
        const finalUserTokenBalance = await token.balanceOf(accounts[0]);

        assert.equal(finalTokenBalance - initialTokenBalance, amountSwitched, 'Wrong pool token final amount')
        assert.equal(finalWeiBalance - initialWeiBalance, -expectedWeiAmount, 'Wrong pool wei final amount');
        assert.equal(finalUserTokenBalance.sub(initialUserTokenBalance).toNumber(), -amountSwitched, 'Wrong user token final amount');
    });

    it('should invest liquidity', async () => {
        const weiInvested = 10000;

        const [initialWeiBalance, initialTokenBalance] = await getBalances(pool.address, token);
        const [initialUserShares, initialTotalShares] = await getPoolShares(accounts[0], pool);

        const [expectedShareAmount, expectedTokenAmount] = computeShareFlow(weiInvested, initialWeiBalance, initialTokenBalance, initialTotalShares);

        await pool.investLiquidity(0, { value: weiInvested});

        const [finalWeiBalance, finalTokenBalance] = await getBalances(pool.address, token);
        const [finalUserShares, finalTotalShares] = await getPoolShares(accounts[0], pool);

        assert.equal(finalWeiBalance - initialWeiBalance, weiInvested, 'Wrong pool wei final amount');
        assert.equal(finalTokenBalance - initialTokenBalance, expectedTokenAmount, 'Wrong pool token final amount');
        assert.equal(finalUserShares - initialUserShares, expectedShareAmount, 'Wrong user share final amount');
        assert.equal(finalTotalShares - initialTotalShares, expectedShareAmount, 'Wrong total share final amount');
    });

    it('should divest liquidity', async () => {
        const weiDivested = 8000;

        const [initialWeiBalance, initialTokenBalance] = await getBalances(pool.address, token);
        const [initialUserShares, initialTotalShares] = await getPoolShares(accounts[0], pool);

        const [expectedShareAmount, expectedTokenAmount] = computeShareFlow(weiDivested, initialWeiBalance, initialTokenBalance, initialTotalShares);

        await pool.divestLiquidity(weiDivested, 0);

        const [finalWeiBalance, finalTokenBalance] = await getBalances(pool.address, token);
        const [finalUserShares, finalTotalShares] = await getPoolShares(accounts[0], pool);

        assert.equal(initialWeiBalance - finalWeiBalance, weiDivested, 'Wrong pool wei final amount');
        assert.equal(initialTokenBalance - finalTokenBalance, expectedTokenAmount, 'Wrong pool token final amount');
        assert.equal(initialUserShares - finalUserShares, expectedShareAmount, 'Wrong user share final amount');
        assert.equal(initialTotalShares - finalTotalShares, expectedShareAmount, 'Wrong total share final amount');
    });
});
