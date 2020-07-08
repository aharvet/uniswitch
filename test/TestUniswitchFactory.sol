// SPDX-License-Identifier: MIT

pragma solidity ^0.6.11;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/test/TestToken.sol";
import "../contracts/UniswitchFactory.sol";


contract TestUniswitchFactory {
    function testLaunchPool() external {
        TestToken token = TestToken(DeployedAddresses.TestToken());
        UniswitchFactory instance = UniswitchFactory(DeployedAddresses.UniswitchFactory());

        address _token = DeployedAddresses.TestToken();
        address _newPool = instance.launchPool(_token);
        address _fromTokens = instance.tokens(0);
        address _fromPoolToToken = instance.poolToToken(_newPool);
        address _fromTokenToPool = instance.tokenToPool(_token);

        Assert.equal(_fromPoolToToken, _token, "Wrong address stored");
        Assert.equal(_fromTokenToPool, _newPool, "Wrong address stored");
        Assert.equal(_fromTokens, _token, "Wrong address stored");
    }
}
