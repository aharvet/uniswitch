//SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IUniswitchFactory.sol";


contract UniswitchPool {
    using SafeMath for uint256;

    IUniswitchFactory private factory;
    IERC20 private token;

    mapping(address => uint256) public shares;
    uint256 public totalShares = 0;

    modifier initialized() {
        uint256 tokenBalance = token.balanceOf(address(this));

        require(address(this).balance > 0 && tokenBalance > 0);
        _;
    }

    event PoolInitialized(address pool, address token, uint256 weiAmount, uint256 tokenAmount);
    event EthToTokenSwitched(address user, address token, uint256 weiIn, uint256 tokenOut);
    event TokenToEthSwitched(address user, address token, uint256 tokenIn, uint256 weiOut);
    event TokenToTokenSwitchedPoolA(address user, address token1, address token2, uint256 tokenIn, uint256 weiOut);
    event TokenToTokenSwitchedPoolB(address user, address token2, uint256 weiIn, uint256 tokenOut);
    event LiquidityInvested(address user, address token, uint256 weiAmount, uint256 tokenAmount);
    event LiquidityDivested(address user, address token, uint256 weiAmount, uint256 tokenAmount);

    constructor(address _tokenAddr) public {
        require(_tokenAddr != address(0), "Zero address provided");

        factory = IUniswitchFactory(msg.sender);
        token = IERC20(_tokenAddr);
    }

    function initializePool(uint256 _tokenAmount) external payable {
        require(msg.value >= 100000 && _tokenAmount >= 100000, "Not enough liquidity provided");

        shares[msg.sender] = 1000;
        totalShares = 1000;

        token.transferFrom(msg.sender, address(this), _tokenAmount);

        emit PoolInitialized(address(this), address(token), msg.value, _tokenAmount);
    }

    function investLiquidity(uint256 _minShare) external payable initialized {
        uint _shareAmount = msg.value.mul(totalShares).div(address(this).balance); // computes the rate of share per wei inside the pool, and multiply it by the amount of wei invested
        require(_shareAmount >= _minShare, "Not enough liquidity provided");

        uint256 _tokenPerShare = token.balanceOf(address(this)).div(totalShares);
        uint _tokenAmount = _tokenPerShare.mul(_shareAmount);

        token.transferFrom(msg.sender, address(this), _tokenAmount);

        shares[msg.sender] = shares[msg.sender].add(_shareAmount);
        totalShares = totalShares.add(_shareAmount);

        emit LiquidityInvested(msg.sender, address(token), msg.value, _tokenAmount);
    }

    function divestLiquidity(uint256 _weiAmount, uint256 _minToken) external {
        uint256 _withdrewShareAmount = _weiAmount.mul(totalShares).div(address(this).balance); // computes the rate of share per wei inside the pool, and multiply it by the amount of wei divested
        uint256 _tokenPerShare = token.balanceOf(address(this)).div(totalShares);
        uint256 _tokenOut = _withdrewShareAmount.mul(_tokenPerShare);
        require(_tokenOut >= _minToken, "Not enough token in return");

        token.transfer(msg.sender, _tokenOut);
        msg.sender.transfer(_weiAmount);

        shares[msg.sender] = shares[msg.sender].sub(_withdrewShareAmount);
        totalShares = totalShares.sub(_withdrewShareAmount);

        emit LiquidityDivested(msg.sender, address(token), _weiAmount, _tokenOut);
    }

    function ethToTokenSwitch(uint256 _minTokenOut) external payable {
        uint256 _tokenOut = ethInHandler(msg.sender, _minTokenOut, false);

        emit EthToTokenSwitched(msg.sender, address(token), msg.value, _tokenOut);
    }

    function tokenToEthSwitch(uint256 _tokenAmount, uint256 _minWeiOut) external payable {
        uint _weiOut = tokenInHandler(msg.sender, _tokenAmount, _minWeiOut, true);

        msg.sender.transfer(_weiOut);

        emit TokenToEthSwitched(msg.sender, address(token), _tokenAmount, _weiOut);
    }

    function tokenToTokenSwitch(uint256 _token1Amount, uint256 _minToken2Amount, address _token2Addr) external {
        uint _weiOut = tokenInHandler(msg.sender, _token1Amount, 0, false);

        address _poolToken2Addr = factory.tokenToPool(_token2Addr);
        UniswitchPool _poolToken2 = UniswitchPool(_poolToken2Addr);

        _poolToken2.tokenToTokenIn{ value: _weiOut }(msg.sender, _minToken2Amount);

        emit TokenToTokenSwitchedPoolA(msg.sender, address(token), _token2Addr, _token1Amount, _weiOut);
    }

    function tokenToTokenIn(address _to, uint256 _minTokenOut) external payable returns(bool) {
        uint256 _tokenOut = ethInHandler(_to, _minTokenOut, true);

        emit TokenToTokenSwitchedPoolB(_to, address(token), msg.value, _tokenOut);

        return true;
    }

    function ethInHandler(address _to, uint256 _minTokenOut, bool _tokenToToken) private returns(uint256) {
        uint256 _tokenBalance = token.balanceOf(address(this));
        uint256 _fee = msg.value.div(500); // 0.2%
        uint256 _tokenOut = msg.value.sub(_fee).mul(_tokenBalance).div(address(this).balance); // computes the rate of token per wei inside the pool, and multiply it by the amount of wei to switch

        require(
            _tokenOut >= _minTokenOut,
            _tokenToToken ? "Not enough token provided" : "Not enough wei provided"
        );

        token.transfer(_to, _tokenOut);

        return _tokenOut;
    }

    function tokenInHandler(address _to, uint256 _tokenAmount, uint256 _minWeiOut, bool _doFee) private returns(uint256) {
        uint256 _fee;
        uint256 _tokenBalance = token.balanceOf(address(this)).add(_tokenAmount);
        if (_doFee) _fee = _tokenAmount.div(500); // 0.2%
        else _fee = 0;
        uint256 _weiOut = _tokenAmount.sub(_fee).mul(address(this).balance).div(_tokenBalance); // computes the rate of wei per token inside the pool, and multiply it by the amount of token to switch

        require(_weiOut >= _minWeiOut, "Not enough token provided");
        token.transferFrom(_to, address(this), _tokenAmount);

        return _weiOut;
    }
}
