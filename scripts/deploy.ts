import { ethers } from 'hardhat';

async function main() {
  const UniswitchFactory = await ethers.getContractFactory('UniswitchFactory');
  const factory = await UniswitchFactory.deploy();
  console.log(`UniswitchFactory deployed at ${factory.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
