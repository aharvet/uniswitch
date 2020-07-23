// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "./UniswitchPool.sol";


contract UniswitchFactory {
    address[] public tokens;
    mapping(address => address) public tokenToPool;
    mapping(address => address) public poolToToken;

    event PoolLaunched(address token, address pool);

    function launchPool(address _token) external {
        UniswitchPool _newPool = new UniswitchPool(_token);
        tokens.push(_token);
        tokenToPool[_token] = address(_newPool);
        poolToToken[address(_newPool)] = _token;

        emit PoolLaunched(_token, address(_newPool));
    }
}
