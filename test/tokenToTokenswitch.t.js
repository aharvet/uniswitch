const { getBalances, computeSwitchOutAmount, getTokensBalances } = require('./tools');

const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');
const UniswitchPool = artifacts.require('UniswitchPool');

contract('Token to token switch', accounts => {
    let token = null;
    let token2 = null;
    let factory = null;
    let pool = null;
    let pool2 = null;

    before(async () => {
        token = await TestToken.new('Test Token', 'TTK');
        token2 = await TestToken.new('Test Token 2', 'TTK2');
        token.mint(accounts[0], web3.utils.toWei('1', 'ether'));
        token.mint(accounts[1], web3.utils.toWei('1', 'ether'));
        token2.mint(accounts[0], web3.utils.toWei('1', 'ether'));

        factory = await UniswitchFactory.deployed();
        await factory.launchPool(token.address);
        await factory.launchPool(token2.address);
        const poolAddr = await factory.tokenToPool(token.address);
        const pool2Addr = await factory.tokenToPool(token2.address);
        pool = await UniswitchPool.at(poolAddr);
        pool2 = await UniswitchPool.at(pool2Addr);

        token.approve(pool.address, web3.utils.toWei('1', 'ether'), { from: accounts[0] });
        token.approve(pool.address, web3.utils.toWei('1', 'ether'), { from: accounts[1] });
        token2.approve(pool2.address, web3.utils.toWei('1', 'ether'), { from: accounts[0] });

        await pool.initializePool(1000000, { from: accounts[0], value: 1000000 });
        await pool2.initializePool(1000000, { from: accounts[0], value: 1000000 });
    });

    it('should switch token to token', async () => {
        const [initialPool1WeiBalance, initialPool1TokenBalance] = await getBalances(pool.address, token);
        const [initialPool2WeiBalance, initialPool2TokenBalance] = await getBalances(pool2.address, token2);
        const [initialUserToken1Balance, initialUserToken2Balance] = await getTokensBalances(accounts[1], [token, token2]);

        const amountSwitched = 10000;
        const expectedWeiAmount = computeSwitchOutAmount(amountSwitched, initialPool1TokenBalance.toNumber(), initialPool1WeiBalance);
        const expectedTokenAmount = computeSwitchOutAmount(expectedWeiAmount, parseInt(initialPool2WeiBalance), initialPool2TokenBalance.toNumber());

        await pool.tokenToTokenSwitch(amountSwitched, 0, token2.address, { from: accounts[1] });

        const [finalPool1WeiBalance, finalPool1TokenBalance] = await getBalances(pool.address, token);
        const [finalPool2WeiBalance, finalPool2TokenBalance] = await getBalances(pool2.address, token2);
        const [finalUserToken1Balance, finalUserToken2Balance] = await getTokensBalances(accounts[1], [token, token2]);

        assert.equal(finalPool1WeiBalance - initialPool1WeiBalance, -expectedWeiAmount, 'Wrong pool1 wei final balance');
        assert.equal(finalPool1TokenBalance.sub(initialPool1TokenBalance).toNumber(), amountSwitched, 'Wrong pool1 token final balance');
        assert.equal(finalPool2WeiBalance - initialPool2TokenBalance, expectedWeiAmount, 'Wrong pool2 wei final balance');
        assert.equal(finalPool2TokenBalance.sub(initialPool2TokenBalance).toNumber(), -expectedTokenAmount, 'Wrong pool2 token final balance');
        assert.equal(finalUserToken1Balance.sub(initialUserToken1Balance).toNumber(), -amountSwitched, 'Wrong user token1 final balance');
        assert.equal(finalUserToken2Balance.sub(initialUserToken2Balance).toNumber(), expectedTokenAmount, 'Wrong user token2 final balance');
    });
});
