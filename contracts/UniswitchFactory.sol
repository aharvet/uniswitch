// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import {IUniswitchFactory} from "./interfaces/IUniswitchFactory.sol";
import {UniswitchPool} from "./UniswitchPool.sol";

contract UniswitchFactory is IUniswitchFactory {
    mapping(address => address) public override tokenToPool;
    mapping(address => address) public override poolToToken;

    function launchPool(address token) external override {
        require(
            tokenToPool[token] == address(0),
            "UniswitchFactory: pool already created for token"
        );

        address pool = address(new UniswitchPool(token));
        tokenToPool[token] = pool;
        poolToToken[pool] = token;

        emit PoolLaunched(token, pool);
    }
}
