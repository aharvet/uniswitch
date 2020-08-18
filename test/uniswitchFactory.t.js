const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');

contract('UniswitchFactory', () => {
    let token = null;
    let factory = null;

    before(async () => {
        token = await TestToken.new('Test Token', 'TTK');
        factory = await UniswitchFactory.deployed();
    });

    it('should launch a pool', async () => {
        await factory.launchPool(token.address);

        const tokenStored = await factory.getTokens();
        const fromTokenToPool = await factory.tokenToPool(token.address);
        const fromPoolToToken = await factory.poolToToken(fromTokenToPool);

        assert.equal(tokenStored[0], token.address , 'Wrong token address');
        assert.equal(fromPoolToToken, token.address, 'Wrong pool to token');
    });
});
