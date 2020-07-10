// SPDX-License-Identifier: MIT

pragma solidity ^0.6.11;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/test/TestToken.sol";
import "../contracts/UniswitchFactory.sol";


contract TestUniswitchFactory {
    function testLaunchPool() public {
        UniswitchFactory factory = UniswitchFactory(DeployedAddresses.UniswitchFactory());

        address _token = DeployedAddresses.TestToken();
        address _newPool = factory.launchPool(_token);
        address _fromTokens = factory.tokens(0);
        address _fromPoolToToken = factory.poolToToken(_newPool);
        address _fromTokenToPool = factory.tokenToPool(_token);

        Assert.equal(_fromPoolToToken, _token, "Wrong address stored");
        Assert.equal(_fromTokenToPool, _newPool, "Wrong address stored");
        Assert.equal(_fromTokens, _token, "Wrong address stored");
    }
}
