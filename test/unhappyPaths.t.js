const { expectRevert } = require('@openzeppelin/test-helpers');
const { getBalances } = require('./tools');

const TestToken = artifacts.require('TestToken');
const UniswitchFactory = artifacts.require('UniswitchFactory');
const UniswitchPool = artifacts.require('UniswitchPool');

contract('Unhappy Paths', (accounts) => {
  let token = null;
  let factory = null;
  let pool = null;

  before(async () => {
    factory = await UniswitchFactory.deployed();

    token = await TestToken.new('Test Token', 'TTK');
    await token.mint(accounts[0], web3.utils.toWei('1', 'ether'));

    const receipt = await factory.launchPool(token.address);
    pool = await UniswitchPool.at(receipt.logs[0].args.pool);

    await token.approve(pool.address, web3.utils.toWei('1', 'ether'));
  });

  it('should NOT swith token with tokenToTokenIn function', async () => {
    await expectRevert(
      pool.tokenToTokenIn(accounts[0], 0, { value: 100000 }),
      'Sender is not a pool',
    );
  });

  it('should NOT switch token to token if not enough token in return', async () => {
    const token2 = await TestToken.new('Test Token 2', 'TTK2');
    await token2.mint(accounts[0], web3.utils.toWei('1', 'ether'));

    const receipt = await factory.launchPool(token2.address);
    const pool2 = await UniswitchPool.at(receipt.logs[0].args.pool);
    await token2.approve(pool2.address, web3.utils.toWei('1', 'ether'));
    await pool2.initializePool(100000, { value: 100000 });

    await expectRevert(
      pool.tokenToTokenSwitch(100, 100000000, token2.address),
      'Not enough token provided',
    );
  });
});
