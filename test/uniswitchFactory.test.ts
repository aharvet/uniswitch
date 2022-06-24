import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TestToken } from '../typechain-types/contracts/tests/TestToken';
import { UniswitchFactory } from '../typechain-types/contracts/UniswitchFactory';

const {
  getContractFactory,
  constants: { AddressZero },
} = ethers;

describe('UniswitchFactory', () => {
  let token: TestToken;
  let factory: UniswitchFactory;

  beforeEach(async () => {
    const TestToken = await getContractFactory('TestToken');
    const UniswitchFactory = await getContractFactory('UniswitchFactory');

    token = (await TestToken.deploy('Test Token', 'TTK')) as TestToken;
    factory = (await UniswitchFactory.deploy()) as UniswitchFactory;
  });

  it('should launch a pool', async () => {
    await factory.launchPool(token.address);
    const pool = await factory.tokenToPool(token.address);

    expect(await factory.poolToToken(pool)).to.equal(token.address);
  });

  it('should emit PoolLaunched event', async () => {
    const tx = await factory.launchPool(token.address);
    const { events } = await tx.wait();

    await expect(tx).to.emit(factory, 'PoolLaunched');
    if (!events) return;
    expect(events[0].args?.token).to.equal(token.address);
    expect(events[0].args?.pool).to.not.be.undefined;
  });

  it('should not lauch a pool with zero address', async () => {
    await expect(factory.launchPool(AddressZero)).to.be.revertedWith(
      'UniswitchFactory: Zero address provided',
    );
  });

  it('should not lauch a pool if there is already one for the token', async () => {
    await factory.launchPool(token.address);
    await expect(factory.launchPool(token.address)).to.be.revertedWith(
      'UniswitchFactory: Pool already created for token',
    );
  });
});
