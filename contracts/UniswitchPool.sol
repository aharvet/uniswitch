//SPDX-License-Identifier: MIT

/* TO DO
- add fee

DONE

added check for pool volume
*/

pragma solidity ^0.6.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./test/Debug.sol";


contract UniswitchPool is Debug {
    using SafeMath for uint256;

    IERC20 token;

    mapping(address => uint256) public shares;
    uint256 public totalShares = 0;

    modifier initialized() {
        uint256 tokenBalance = token.balanceOf(address(this));

        require(address(this).balance > 0 && tokenBalance > 0);
        _;
    }

    event PoolInitialized(address pool, address token, uint256 weiAmount, uint256 tokenAmount);
    event EthToTokenSwitch(address user, address token, uint256 weiAmount, uint256 tokenAmount);
    event TokenToEthSwitch(address user, address token, uint256 weiAmount, uint256 tokenAmount);

    constructor(address _tokenAddr) public {
        require(_tokenAddr != address(0), "Zero address provided");

        token = IERC20(_tokenAddr);
    }

    function initializePool(uint256 _tokenAmount) external payable {
        require(msg.value > 100000 && _tokenAmount > 100000, "Not enough liquidity provided");

        shares[msg.sender] = 1000;
        totalShares = 1000;

        require(token.transferFrom(msg.sender, address(this), _tokenAmount), "Error in token transfer");

        emit PoolInitialized(address(this), address(token), msg.value, _tokenAmount);
    }

    function investLiquidity() external payable initialized {

    }

    function divestLiquidity() external initialized {

    }

    function ethToTokenSwitch(uint256 _minTokenOut) external payable {
        uint256 _tokenBalance = token.balanceOf(address(this));
        uint256 _fee = msg.value.div(5); // 0.2%
        uint256 _tokenOut = msg.value.sub(_fee).mul(_tokenBalance).div(address(this).balance);

        require(_tokenOut >= _minTokenOut, "Not enough wei provided");
        require(_tokenOut <= _tokenBalance, "Not enough volume in the pool");
        require(token.transfer(msg.sender, _tokenOut), "Error in token transfer");

        emit EthToTokenSwitch(msg.sender, address(token), msg.value, _tokenOut);
    }

    function tokenToEthSwitch(uint256 _tokenAmount, uint256 _minWeiOut) external payable {
        uint256 _tokenBalance = token.balanceOf(address(this)).add(_tokenAmount);
        uint256 _fee = _tokenAmount.div(5); // 0.2%
        uint256 _weiOut = _tokenAmount.sub(_fee).mul(address(this).balance).div(_tokenBalance);

        require(_weiOut >= _minWeiOut, "Not enough token provided");
        require(_weiOut <= address(this).balance, "Not enough volume in the pool");
        require(token.transferFrom(msg.sender, address(this), _tokenAmount), "Error in token transfer");

        msg.sender.transfer(_weiOut);

        emit TokenToEthSwitch(msg.sender, address(token), _weiOut, _tokenAmount);
    }
}
