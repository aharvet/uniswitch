// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IUniswitchFactory.sol";

import "hardhat/console.sol";

contract UniswitchPool {
    using SafeMath for uint256;

    IUniswitchFactory public immutable factory;
    IERC20 public immutable token;

    mapping(address => uint256) public shares;
    uint256 public totalShares = 0;

    event PoolInitialized(address pool, uint256 weiAmount, uint256 tokenAmount);
    event LiquidityProvided(
        address user,
        uint256 sharesCreated,
        uint256 weiAmount,
        uint256 tokenAmount
    );
    event LiquidityWithdrew(
        address user,
        address token,
        uint256 weiAmount,
        uint256 tokenAmount
    );
    event EthToTokenSwitched(
        address user,
        address token,
        uint256 weiIn,
        uint256 tokenOut
    );
    event TokenToEthSwitched(
        address user,
        address token,
        uint256 tokenIn,
        uint256 weiOut
    );
    event TokenToTokenSwitchedPoolA(
        address user,
        address token1,
        address token2,
        uint256 tokenIn,
        uint256 weiOut
    );
    event TokenToTokenSwitchedPoolB(
        address user,
        address token2,
        uint256 weiIn,
        uint256 tokenOut
    );

    constructor(address _tokenAddr) public {
        require(
            _tokenAddr != address(0),
            "UniswitchPool: Zero address provided"
        );

        factory = IUniswitchFactory(msg.sender);
        token = IERC20(_tokenAddr);
    }

    /// @notice Has to be called anytime the pool has no liquidity.
    /// That means it can be called multiple times in the pool lifetime.
    function initializePool(uint256 tokenAmount) external payable {
        // If no shares in circulation, the pool has no liquidity
        require(totalShares == 0, "UniswitchPool: pool already has liquidity");
        require(
            msg.value >= 100000 && tokenAmount >= 100000,
            "UniswitchPool: Not enough liquidity provided"
        );

        shares[msg.sender] = 1000;
        totalShares = 1000;

        emit PoolInitialized(address(this), msg.value, tokenAmount);

        token.transferFrom(msg.sender, address(this), tokenAmount);
    }

    function provideLiquidity(uint256 minShares) external payable {
        uint256 _totalShares = totalShares;
        // If no shares in circulation, the pool has no liquidity
        require(_totalShares != 0, "UniswitchPool: pool not initialized");

        // Computes the rate of shares per wei inside the pool, and multiply it
        // by the amount of wei invested
        uint256 sharesAmount = msg.value.mul(_totalShares).div(
            // Wei sent by user is already added to contract balance
            address(this).balance.sub(msg.value)
        );
        require(
            sharesAmount >= minShares,
            "UniswitchPool: Not enough share received"
        );

        // Computes the rate of token inside the pool per shares, and multiply it
        // by the amount of shares the user will receive
        uint256 tokenAmount = sharesAmount
            .mul(token.balanceOf(address(this)))
            .div(_totalShares);

        // Will never overflow because the number of shares in existence will always
        // be substencially lower that funds pooled
        shares[msg.sender] += sharesAmount;
        totalShares += sharesAmount;

        emit LiquidityProvided(
            msg.sender,
            sharesAmount,
            msg.value,
            tokenAmount
        );

        token.transferFrom(msg.sender, address(this), tokenAmount);
    }

    function withdrawLiquidity(uint256 _weiAmount, uint256 _minToken) external {
        // computes the rate of share per wei inside the pool, and multiply it by the amount
        // of wei divested
        uint256 _withdrewShareAmount = _weiAmount.mul(totalShares).div(
            address(this).balance
        );
        uint256 _tokenPerShare = token.balanceOf(address(this)).div(
            totalShares
        );
        uint256 _tokenOut = _withdrewShareAmount.mul(_tokenPerShare);
        require(_tokenOut >= _minToken, "Not enough token in return");

        // Will never underflow because the number of share burnt is proportionnaly to liquidity withdrew
        shares[msg.sender] = shares[msg.sender].sub(_withdrewShareAmount);
        totalShares = totalShares.sub(_withdrewShareAmount);

        emit LiquidityWithdrew(
            msg.sender,
            address(token),
            _weiAmount,
            _tokenOut
        );

        token.transfer(msg.sender, _tokenOut);
        msg.sender.transfer(_weiAmount);
    }

    function ethToTokenSwitch(uint256 _minTokenOut) external payable {
        uint256 _tokenOut = ethInHandler(msg.sender, _minTokenOut, false);

        emit EthToTokenSwitched(
            msg.sender,
            address(token),
            msg.value,
            _tokenOut
        );
    }

    function tokenToEthSwitch(uint256 _tokenAmount, uint256 _minWeiOut)
        external
    {
        uint256 _weiOut = tokenInHandler(msg.sender, _tokenAmount, _minWeiOut);

        emit TokenToEthSwitched(
            msg.sender,
            address(token),
            _tokenAmount,
            _weiOut
        );

        msg.sender.transfer(_weiOut);
    }

    function tokenToTokenSwitch(
        uint256 _token1Amount,
        uint256 _minToken2Amount,
        address _token2Addr
    ) external {
        uint256 _weiOut = tokenInHandler(msg.sender, _token1Amount, 0);

        address _poolToken2Addr = factory.tokenToPool(_token2Addr);
        UniswitchPool _poolToken2 = UniswitchPool(_poolToken2Addr);

        _poolToken2.tokenToTokenIn{value: _weiOut}(
            msg.sender,
            _minToken2Amount
        );

        emit TokenToTokenSwitchedPoolA(
            msg.sender,
            address(token),
            _token2Addr,
            _token1Amount,
            _weiOut
        );
    }

    function tokenToTokenIn(address _to, uint256 _minTokenOut)
        external
        payable
    {
        address tokenAssociated = factory.poolToToken(msg.sender);
        require(tokenAssociated != address(0), "Sender is not a pool");

        uint256 _tokenOut = ethInHandler(_to, _minTokenOut, true);

        emit TokenToTokenSwitchedPoolB(
            _to,
            address(token),
            msg.value,
            _tokenOut
        );
    }

    function ethInHandler(
        address _to,
        uint256 _minTokenOut,
        bool _tokenToToken
    ) private returns (uint256) {
        uint256 _tokenBalance = token.balanceOf(address(this));
        // computes the rate of token per wei inside the pool, and multiply it by the amount of wei to switch
        uint256 _tokenOut = msg.value.mul(_tokenBalance).div(
            address(this).balance
        );

        require(
            _tokenOut >= _minTokenOut,
            _tokenToToken
                ? "Not enough token provided"
                : "Not enough wei provided"
        );

        token.transfer(_to, _tokenOut);

        return _tokenOut;
    }

    function tokenInHandler(
        address _to,
        uint256 _tokenAmount,
        uint256 _minWeiOut
    ) private returns (uint256) {
        uint256 _tokenBalance = token.balanceOf(address(this)).add(
            _tokenAmount
        );
        // computes the rate of wei per token inside the pool, and multiply it by the amount of token to switch
        uint256 _weiOut = _tokenAmount.mul(address(this).balance).div(
            _tokenBalance
        );

        require(_weiOut >= _minWeiOut, "Not enough token provided");
        token.transferFrom(_to, address(this), _tokenAmount);

        return _weiOut;
    }
}
