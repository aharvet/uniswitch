const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('UniswitchFactory', () => {
  let token;
  let factory;

  beforeEach(async () => {
    const TestToken = await ethers.getContractFactory('TestToken');
    const UniswitchFactory = await ethers.getContractFactory('UniswitchFactory');
    token = await TestToken.deploy('Test Token', 'TTK');
    factory = await UniswitchFactory.deploy();
    await token.deployed();
    await factory.deployed();
  });

  it('should launch a pool', async () => {
    await factory.launchPool(token.address);
    const pool = await factory.tokenToPool(token.address);

    expect((await factory.getTokens())[0]).to.equal(token.address);
    expect(await factory.poolToToken(pool)).to.equal(token.address);
  });
});
