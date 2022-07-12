// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IUniswitchFactory {
    event PoolLaunched(address indexed token, address pool);

    function tokenToPool(address token) external view returns (address);

    function poolToToken(address pool) external view returns (address);

    function launchPool(address token) external;
}
