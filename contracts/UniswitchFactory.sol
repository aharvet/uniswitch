// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./UniswitchPool.sol";

contract UniswitchFactory {
    mapping(address => address) public tokenToPool;
    mapping(address => address) public poolToToken;

    event PoolLaunched(address token, address pool);

    function launchPool(address token) external {
        require(token != address(0), "UniswitchFactory: Zero address provided");
        require(
            tokenToPool[token] == address(0),
            "UniswitchFactory: pool already created for token"
        );

        address newPool = address(new UniswitchPool(token));
        tokenToPool[token] = newPool;
        poolToToken[newPool] = token;

        emit PoolLaunched(token, newPool);
    }
}
