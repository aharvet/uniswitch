const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');
const UniswitchPool = artifacts.require('UniswitchPool');

contract('Token to token switch', accounts => {
    let token = null;
    let token2 = null;
    let token3 = null;
    let factory = null;

    before(async () => {
        token = await TestToken.new('Test Token', 'TTK');
        token2 = await TestToken.new('Test Token 2', 'TTK2');
        token3 = await TestToken.new('Test Token 3', 'TTK3');

        factory = await UniswitchFactory.deployed();

        await factory.launchPool(token.address);
        await factory.launchPool(token2.address);
        await factory.launchPool(token3.address);
    });

    it('should return tokens array', async () => {
        const tokensArray = await factory.getTokens();

        assert.equal(tokensArray[0], token.address);
        assert.equal(tokensArray[1], token2.address);
        assert.equal(tokensArray[2], token3.address);
    });
});
