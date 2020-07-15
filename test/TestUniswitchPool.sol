// SPDX-License-Identifier: MIT

pragma solidity ^0.6.11;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/test/TestToken.sol";
import "../contracts/UniswitchFactory.sol";
import "../contracts/UniswitchPool.sol";


contract TestUniswitchPool {
    TestToken internal token = TestToken(DeployedAddresses.TestToken());
    UniswitchFactory internal factory = UniswitchFactory(DeployedAddresses.UniswitchFactory());
    UniswitchPool internal pool;

    uint256 public initialBalance = 10 ether;

    function beforeAll() public {
        token.mint(address(this), 10 ether);

        address _poolAddress = factory.launchPool(DeployedAddresses.TestToken());

        pool = UniswitchPool(_poolAddress);

        token.approve(address(pool), 1000000 ether);
    }

    function testInitializePool() public {
        pool.initializePool{value: 1000000}(1000000);

        uint256 poolEthBalance = address(pool).balance;
        uint256 poolTokenBalance = token.balanceOf(address(pool));
        uint256 userShares = pool.shares(address(this));
        uint256 totalShares = pool.totalShares();

        Assert.equal(poolEthBalance, 1000000, "Bad eth balance");
        Assert.equal(poolTokenBalance, 1000000, "Bad token balance");
        Assert.equal(userShares, 1000, "Bad user shares amount");
        Assert.equal(totalShares, 1000, "Bad total shares amount");
    }

    function testEthToTokenSwitch() public {
        uint256 userInitialBalance = token.balanceOf(address(this));
        pool.ethToTokenSwitch{value: 10000}(0);
        uint256 userFinalBalance = token.balanceOf(address(this));

        Assert.equal(userFinalBalance - userInitialBalance, 10000, "Bad token amount");
    }

    function testEthToTokenSwitch2() public {
        uint256 userInitialBalance = token.balanceOf(address(this));
        pool.ethToTokenSwitch{value: 10000}(0);
        uint256 userFinalBalance = token.balanceOf(address(this));

        Assert.equal(userFinalBalance - userInitialBalance, 9801, "Bad token amount");
    }

    function testTokenToEthSwitch() public payable {
        // uint256 userInitialBalance = address(this).balance;
        pool.tokenToEthSwitch(10000, 0);
        // uint256 userFinalBalance = address(this).balance;
        // Assert.equal(userFinalBalance - userInitialBalance, 10406, "Bad wei amount");
    }
}
