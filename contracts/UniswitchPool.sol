// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IUniswitchFactory.sol";

contract UniswitchPool {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address payable;

    uint256 public constant FEE_RATE = 400; // 0.25%
    uint256 public totalShares;
    uint256 public k;

    IUniswitchFactory public immutable factory;
    IERC20 public immutable token;

    mapping(address => uint256) public shares;

    event PoolInitialized(uint256 weiAmount, uint256 tokenAmount);
    event LiquidityProvided(
        address indexed provider,
        uint256 sharesCreated,
        uint256 weiAmount,
        uint256 tokenAmount
    );
    event LiquidityWithdrew(
        address indexed withdrawer,
        uint256 sharesBurnt,
        uint256 weiAmount,
        uint256 tokenAmount
    );
    event EthToTokenSwitched(
        address indexed from,
        address indexed to,
        uint256 weiIn,
        uint256 tokenOut
    );
    event TokenToEthSwitched(
        address indexed from,
        address indexed to,
        uint256 tokenIn,
        uint256 weiOut
    );

    constructor(address tokenAddr) public {
        require(
            tokenAddr != address(0),
            "UniswitchPool: Zero address provided"
        );

        factory = IUniswitchFactory(msg.sender);
        token = IERC20(tokenAddr);
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

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);

        emit PoolInitialized(msg.value, tokenAmount);
    }

    function provideLiquidity(uint256 minShares) external payable {
        uint256 _totalShares = totalShares; // gas savings
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
        uint256 _totalShares = totalShares; // gas savings
        // Computes the rate of shares per wei inside the pool, and multiply it by the amount
        // of wei withdrew to get the corresponding shares amount
        uint256 sharesAmount = weiAmount.mul(_totalShares).div(
            address(this).balance
        );
        // Computes the number of token per share and multiplies it by the number of shares to burn
        uint256 tokenOut = sharesAmount.mul(token.balanceOf(address(this))).div(
            _totalShares
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

    function ethToTokenSwitch(address to, uint256 minTokenOut)
        external
        payable
    {
        uint256 newWeiBalance = address(this).balance;
        uint256 fee = msg.value.div(FEE_RATE);
        uint256 currentTokenBalance = token.balanceOf(address(this));
        // Cannot underflow because due to its computation, fee is always lower
        // than newWeiBalance
        uint256 newTokenBalance = k.div(newWeiBalance - fee);
        uint256 tokenOut = currentTokenBalance.sub(newTokenBalance);

        require(
            tokenOut >= minTokenOut,
            "UniswitchPool: Not enough tokens received"
        );

        k = newWeiBalance.mul(newTokenBalance);

        token.safeTransfer(to, tokenOut);

        emit EthToTokenSwitched(msg.sender, to, msg.value, tokenOut);
    }

    function tokenToEthSwitch(
        address payable to,
        uint256 tokenInAmount,
        uint256 minWeiOut
    ) external {
        uint256 weiOut = tokenInHandler(to, tokenInAmount, minWeiOut);
        to.sendValue(weiOut);
    }

    function tokenToTokenSwitch(
        address to,
        uint256 tokenInAmount,
        uint256 minTokenOutAmount,
        address tokenOutAddr
    ) external {
        address poolTokenOutAddr = factory.tokenToPool(tokenOutAddr);

        require(
            poolTokenOutAddr != address(0),
            "UniswitchPool: No pool for this token"
        );

        uint256 weiOut = tokenInHandler(poolTokenOutAddr, tokenInAmount, 0);
        UniswitchPool(poolTokenOutAddr).ethToTokenSwitch{value: weiOut}(
            to,
            minTokenOutAmount
        );
    }

    function tokenInHandler(
        address to,
        uint256 tokenInAmount,
        uint256 minWeiOut
    ) private returns (uint256 weiOut) {
        uint256 newTokenBalance = token.balanceOf(address(this)).add(
            tokenInAmount
        );
        uint256 fee = tokenInAmount.div(FEE_RATE);
        // Cannot underflow because due to its computation, fee is always lower
        // than newTokenBalance
        uint256 newWeiBalance = k.div(newTokenBalance - fee);
        weiOut = address(this).balance.sub(newWeiBalance);

        require(weiOut >= minWeiOut, "UniswitchPool: Not enough wei received");

        k = newWeiBalance.mul(newTokenBalance);

        token.safeTransferFrom(msg.sender, address(this), tokenInAmount);

        emit TokenToEthSwitched(msg.sender, to, tokenInAmount, weiOut);
    }
}
