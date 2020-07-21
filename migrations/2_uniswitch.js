const UniswitchFactory = artifacts.require("UniswitchFactory");

module.exports = function(deployer, network) {
    deployer.deploy(UniswitchFactory);
};
