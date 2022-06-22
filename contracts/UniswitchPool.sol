// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IUniswitchFactory.sol";

import "hardhat/console.sol";

contract UniswitchPool {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address payable;

    uint256 public constant FEE_RATE = 400; // 0.25%
    uint256 public k;

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
        uint256 sharesBurnt,
        uint256 weiAmount,
        uint256 tokenAmount
    );
    event EthToTokenSwitched(address user, uint256 weiIn, uint256 tokenOut);
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
        require(totalShares == 0, "UniswitchPool: Pool already has liquidity");
        require(
            msg.value >= 100000 && tokenAmount >= 100000,
            "UniswitchPool: Not enough liquidity provided"
        );

        shares[msg.sender] = 100000000;
        totalShares = 100000000;
        k = msg.value.mul(tokenAmount);

        emit PoolInitialized(address(this), msg.value, tokenAmount);

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
    }

    function provideLiquidity(uint256 minShares) external payable {
        uint256 _totalShares = totalShares;
        // If no shares in circulation, the pool has no liquidity
        require(_totalShares != 0, "UniswitchPool: Pool not initialized");

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

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
    }

    function withdrawLiquidity(uint256 weiAmount, uint256 minToken) external {
        // Computes the rate of shares per wei inside the pool, and multiply it by the amount
        // of wei withdrew to get the corresponding shares amount
        uint256 sharesAmount = weiAmount.mul(totalShares).div(
            address(this).balance
        );
        // Computes the number of token per share and multiplies it by the number of shares to burn
        uint256 tokenOut = sharesAmount.mul(token.balanceOf(address(this))).div(
            totalShares
        );
        require(
            tokenOut >= minToken,
            "UniswitchPool: Not enough token in return"
        );

        // Will revert if user tries to withdraw more than authorized
        shares[msg.sender] = shares[msg.sender].sub(
            sharesAmount,
            "UniswitchPool: Not enough shares in the pool"
        );
        // Will never underflow because the number of shares burnt is proportionnaly to liquidity withdrew
        totalShares -= sharesAmount;

        emit LiquidityWithdrew(msg.sender, sharesAmount, weiAmount, tokenOut);

        // Will revert if not enough wei or tokens in the pool
        token.safeTransfer(msg.sender, tokenOut);
        payable(msg.sender).sendValue(weiAmount);
    }

    function ethToTokenSwitch(uint256 minTokenOut) external payable {
        uint256 tokenOut = ethInHandler(msg.sender, minTokenOut, false);

        emit EthToTokenSwitched(msg.sender, msg.value, tokenOut);
    }

    function tokenToEthSwitch(uint256 tokenAmount, uint256 minWeiOut) external {
        uint256 weiOut = tokenInHandler(msg.sender, tokenAmount, minWeiOut);

        emit TokenToEthSwitched(
            msg.sender,
            address(token),
            tokenAmount,
            weiOut
        );

        payable(msg.sender).sendValue(weiOut);
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
        address to,
        uint256 minTokenOut,
        bool tokenToToken
    ) private returns (uint256) {
        uint256 newWeiBalance = address(this).balance;
        uint256 fee = msg.value.div(FEE_RATE);
        uint256 currentTokenBalance = token.balanceOf(address(this));
        // Cannot underflow because due to its computation, fee is always lower
        // than newWeiBalance
        uint256 newTokenBalance = k.div(newWeiBalance - fee);
        uint256 tokenOut = currentTokenBalance.sub(newTokenBalance);

        require(
            tokenOut >= minTokenOut,
            tokenToToken
                ? "UniswitchPool: Not enough token provided"
                : "UniswitchPool: Not enough tokens received"
        );

        k = newWeiBalance.mul(newTokenBalance);

        token.safeTransfer(to, tokenOut);

        return tokenOut;
    }

    function tokenInHandler(
        address to,
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
        token.safeTransferFrom(to, address(this), _tokenAmount);

        return _weiOut;
    }
}
