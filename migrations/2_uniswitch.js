const TestToken = artifacts.require("TestToken");
const UniswitchFactory = artifacts.require("UniswitchFactory");

module.exports = function(deployer) {
  deployer.deploy(TestToken, "Test Token", "TTK");
  deployer.deploy(UniswitchFactory);
};
