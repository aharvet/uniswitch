// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IUniswitchFactory {
    function poolsAmount() external view returns (uint256);

    function tokens(uint256 i) external view returns (address);

    function tokenToPool(address _addr) external view returns (address);

    function poolToToken(address _addr) external view returns (address);

    event PoolLaunched(address token, address pool);

    function launchPool(address _token) external;

    function getTokens() external view returns (address[] memory);
}
