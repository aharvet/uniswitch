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

        token.approve(pool.address, web3.utils.toWei('1', 'ether'))
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
        const initialTokenBalance = await token.balanceOf(accounts[0]);
        await pool.ethToTokenSwitch(0, { value: 10000 });
        const finalTokenBalance = await token.balanceOf(accounts[0]);

        assert.equal(finalTokenBalance.sub(initialTokenBalance).toNumber(), 10000);
    });

    it('should switch eth to token a second time', async () => {
        const initialTokenBalance = await token.balanceOf(accounts[0]);
        await pool.ethToTokenSwitch(0, { value: 10000 });
        const finalTokenBalance = await token.balanceOf(accounts[0]);

        assert.equal(finalTokenBalance.sub(initialTokenBalance).toNumber(), 9801);
    });

    it('should switch token to eth', async () => {
        const initialTokenBalance = await token.balanceOf(pool.address);
        await pool.tokenToEthSwitch(10000, 0);
        const finalTokenBalance = await token.balanceOf(pool.address);

        assert.equal(finalTokenBalance - initialTokenBalance, 10000);
    });
});
