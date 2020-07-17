/* TO DO
- write unhappy paths
*/

const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');
const UniswitchPool = artifacts.require('UniswitchPool');

contract('UniswitchPool', accounts => {
    let token = null;
    let factory = null;
    let pool = null;

    before(async () => {
        token = await TestToken.deployed();
        token.mint(accounts[0], web3.utils.toWei('1', 'ether'));

        factory = await UniswitchFactory.deployed();
        await factory.launchPool(token.address);
        const poolAddr = await factory.tokenToPool(token.address);
        pool = await UniswitchPool.at(poolAddr);

        token.approve(pool.address, web3.utils.toWei('1', 'ether'));
    });

    it('should initialize pool', async () => {
        await pool.initializePool(1000000, { value: 1000000 });

        const weiBalance = await web3.eth.getBalance(pool.address);
        const tokenBalance = await token.balanceOf(pool.address);
        const userShares = await pool.shares(accounts[0]);
        const totalShares = await pool.totalShares();

        assert.equal(weiBalance, 1000000);
        assert.equal(tokenBalance.toNumber(), 1000000);
        assert.equal(userShares, 1000);
        assert.equal(totalShares, 1000);
    });

    it('should switch eth to token', async () => {
        const poolWei = parseInt(await web3.eth.getBalance(pool.address));
        const poolToken = (await token.balanceOf(pool.address)).toNumber();

        const amountSwitched = 10000;
        const fee = amountSwitched * 0.002;
        const expectedTokenAmount = Math.floor(poolToken / (poolWei + amountSwitched) * (amountSwitched - fee));

        const initialTokenBalance = await token.balanceOf(accounts[0]);
        const tx = await pool.ethToTokenSwitch(0, { value: amountSwitched });
        const finalTokenBalance = await token.balanceOf(accounts[0]);

        const { event, args } = tx.logs[0];

        assert.equal(event, 'EthToTokenSwitch');
        assert.equal(args[3].toNumber(), expectedTokenAmount);
        assert.equal(finalTokenBalance.sub(initialTokenBalance).toNumber(), expectedTokenAmount);
    });

    it('should switch eth to token a second time', async () => {
        const poolWei = parseInt(await web3.eth.getBalance(pool.address));
        const poolToken = (await token.balanceOf(pool.address)).toNumber();

        const amountSwitched = 10000;
        const fee = amountSwitched * 0.002;
        const expectedTokenAmount = Math.floor(poolToken / (poolWei + amountSwitched) * (amountSwitched - fee));

        const initialTokenBalance = await token.balanceOf(accounts[0]);
        const tx = await pool.ethToTokenSwitch(0, { value: amountSwitched });
        const finalTokenBalance = await token.balanceOf(accounts[0]);

        const { event, args } = tx.logs[0];

        assert.equal(event, 'EthToTokenSwitch');
        assert.equal(args[3].toNumber(), expectedTokenAmount);
        assert.equal(finalTokenBalance.sub(initialTokenBalance).toNumber(), expectedTokenAmount);
    });

    it('should switch token to eth', async () => {
        const poolWei = parseInt(await web3.eth.getBalance(pool.address));
        const poolToken = (await token.balanceOf(pool.address)).toNumber();

        const amountSwitched = 10000;
        const fee = amountSwitched * 0.002;
        const expectedTokenAmount = Math.floor(poolWei / (poolToken + amountSwitched) * (amountSwitched - fee));

        const tx = await pool.tokenToEthSwitch(10000, 0);
        const { event, args } = tx.logs[0];

        assert.equal(event, 'TokenToEthSwitch');
        assert.equal(args[2], expectedTokenAmount);
    });

    it('should invest liquidity', async () => {
        const weiInvested = 10000;

        const initialWeiBalance = await web3.eth.getBalance(pool.address);
        const initialTokenBalance = await token.balanceOf(pool.address);
        const initialUserShares = await pool.shares(accounts[0]);
        const initialTotalShares = await pool.totalShares();

        await pool.investLiquidity(0, { value: weiInvested});

        const finalWeiBalance = await web3.eth.getBalance(pool.address);
        const finalTokenBalance = await token.balanceOf(pool.address);
        const finalUserShares = await pool.shares(accounts[0]);
        const finalTotalShares = await pool.totalShares();

        const expectedShareAmount = Math.floor(weiInvested * initialTotalShares / initialWeiBalance);
        const expectedTokenAmount = Math.floor(initialTokenBalance / initialTotalShares) * expectedShareAmount;

        assert.equal(finalWeiBalance - initialWeiBalance, weiInvested);
        assert.equal(finalTokenBalance - initialTokenBalance, expectedTokenAmount);
        assert.equal(finalUserShares - initialUserShares, expectedShareAmount);
        assert.equal(finalTotalShares - initialTotalShares, expectedShareAmount);
    });

    it('should divest liquidity', async () => {
        const weiDivested = 8000;

        const initialWeiBalance = await web3.eth.getBalance(pool.address);
        const initialTokenBalance = await token.balanceOf(pool.address);
        const initialUserShares = await pool.shares(accounts[0]);
        const initialTotalShares = await pool.totalShares();

        await pool.divestLiquidity(weiDivested, 0);

        const finalWeiBalance = await web3.eth.getBalance(pool.address);
        const finalTokenBalance = await token.balanceOf(pool.address);
        const finalUserShares = await pool.shares(accounts[0]);
        const finalTotalShares = await pool.totalShares();

        const expectedShareAmount = Math.floor(weiDivested * initialTotalShares / initialWeiBalance);
        const expectedTokenAmount = Math.floor(initialTokenBalance / initialTotalShares) * expectedShareAmount;

        assert.equal(initialWeiBalance - finalWeiBalance, weiDivested);
        assert.equal(initialTokenBalance - finalTokenBalance, expectedTokenAmount);
        assert.equal(initialUserShares - finalUserShares, expectedShareAmount);
        assert.equal(initialTotalShares - finalTotalShares, expectedShareAmount);
    });
});
