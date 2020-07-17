const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');
const UniswitchPool = artifacts.require('UniswitchPool');

contract('UniswitchPool', accounts => {
    let token = null;
    let factory = null;
    let pool = null;

    before(async () => {
        token = await TestToken.deployed();
        token.mint(accounts[1], web3.utils.toWei('1', 'ether'));

        factory = await UniswitchFactory.deployed();
        await factory.launchPool(token.address);
        const poolAddr = await factory.tokenToPool(token.address);
        pool = await UniswitchPool.at(poolAddr);

        await token.approve(pool.address, web3.utils.toWei('1', 'ether'), { from: accounts[1] });
        await token.approve(pool.address, web3.utils.toWei('1', 'ether'), { from: accounts[2] });
    });

    it('should provide a profit', async () => {
        await pool.initializePool(1000000, { from: accounts[1], value: 1000000 });

        const initialWeiBalance = web3.utils.toBN(
            await web3.eth.getBalance(pool.address)
        );

        await pool.ethToTokenSwitch(0, { from: accounts[2], value: 10000 });
        const tokenAmount = await token.balanceOf(accounts[2]);
        await pool.tokenToEthSwitch(tokenAmount, 0, { from: accounts[2] });

        const poolEth = await web3.eth.getBalance(pool.address);

        const finalWeiBalance = web3.utils.toBN(
            await web3.eth.getBalance(pool.address)
        );

        assert(finalWeiBalance.sub(initialWeiBalance).toNumber() > 0);
    });
});
