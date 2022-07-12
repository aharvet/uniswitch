// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import {UniswitchPool} from "./UniswitchPool.sol";

contract UniswitchFactory {
    mapping(address => address) public tokenToPool;
    mapping(address => address) public poolToToken;

    event PoolLaunched(address indexed token, address pool);

    function launchPool(address token) external {
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
