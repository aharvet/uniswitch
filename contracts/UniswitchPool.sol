//SPDX-License-Identifier: MIT

pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract UniswitchPool {
    using SafeMath for uint256;

    IERC20 token;

    mapping(address => uint256) public shares;
    uint256 public totalShares = 0;

    modifier initialized() {
        uint256 tokenBalance = token.balanceOf(address(this));

        require(address(this).balance > 0 && tokenBalance > 0);
        _;
    }

    constructor(address _tokenAddr) public {
        require(_tokenAddr != address(0), "Zero address provided");

        token = IERC20(_tokenAddr);
    }

    function initializePool(uint256 _tokenAmount) external payable {
        require(msg.value > 100000 && _tokenAmount > 100000, "Not enough liquidity provided");

        shares[msg.sender] = 1000;
        totalShares = 1000;

        require(token.transferFrom(msg.sender, address(this), _tokenAmount));
    }

    function investLiquidity() external payable initialized {

    }

    function divestLiquidity() external initialized {

    }

    function tokenToEthSwitch() external {

    }

    function ethToTokenSwitch() external {

    }
}
