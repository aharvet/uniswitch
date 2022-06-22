# Uniswitch

Uniswitch is an Ethereum smart contract that enables users to exchange ether and ERC20 tokens together.
The protocol works with liquidity pools that removes the need to match a maker and a taker order.
The protocol takes no fee.

You can try the protocol with the ropsten testnet instance at this address : 0x7C17822D4B806032AFA7CD9faD0Ce41cA88C14d7
[See on Etherscan](https://ropsten.etherscan.io/address/0x7C17822D4B806032AFA7CD9faD0Ce41cA88C14d7#contracts)

## Contracts

The protocol works with the factory pattern. Thus it is made of 2 contracts :

- UniswitchFactory.sol, the factory contract that creates the pools and keeps track of them
- UniswitchPool.sol, the contract model of a pool that hosts ether and and ERC20 token

## Factory interface

**tokenToPool(address token) view returns(address)**

Returns the pool address related to the token address in parameter.

**poolToToken(address pool) view returns(address)**

Returns the token address related to the pool address in parameter.

**getTokens() view returns(address[])**

Returns an array of every token address with a pool associated.

**lauchPool(address token)**

Creates a new pool for the token with the address in parameter. Emits a "PoolLaunched" event.

## Pools interface

**shares(address user) view returns(uint256)**

Returns the number of shares a user has in the pool, each shares gives access to an amount of ether and the ERC20 token.

**totalShares() view returns(uint256)**

Returns the total number of shares in circulation.

**initializePool(uint256 tokenAmount) payable**

Initialize a pool with ether and tokens. Initialization is required to start using the pool and any time there is not liquidity left.
"tokenAmount" parameter represents the amount of token sent.
Requires to send at least 100000 units of wei and of the token and to allow the pool address to use a transferFrom transaction for the token.
The user gets 1000 shares in the pool for initializing it.
Emits a "PoolInitialized" event.

**provideLiquidity(uint256 minShare) payable**

Enables to deposit tokens and ether in the pool.
"minShare" parameter represents the minimum number of share you are willing to accept for this investment.
The amount of tokens transfered and of shares obtained are computed depenting on the amount of ether sent.
Requires to allow the pool address to use a transferFrom transaction for the token.
Emits a "LiquidityProvided" event.

**withdrawLiquidity(uint256 weiAmount, uint256 minToken)**

Enables to withdraw tokens and ether from the pool.
"weiAmount" parameter represents the amount of wei you want to withdraw.
"minToken" parameter represents the minimum amount of tokens you are willing to accept in return.
Emits a "LiquidityWithdrew" event.

**ethToTokenSwitch(uint256 minTokenOut) payable**

Enables to trade ether against tokens.
The contract computes the number of token you get depending on the ratio of ether and token available in the pool.
"minTokenOut" parameter represents the minimum amount of tokens you are willing to accept for this trade.
Emits a "EthToTokenSwitched" event.

**tokenToEthSwitch(uint256 tokenAmount, uint256 minWeiOut)**

Enables to trade tokens against ether.
The contract computes the number of ether you get depending on the ratio of ether and token available in the pool.
"tokenAmount" parameter represents the number of tokens you want to trade.
"minWeiOut" parameter represents the minimum amount of wei you are willing to accept for this trade.
Requires to allow the pool address to use a transferFrom transaction for the token.
Emits a "TokenToEthSwitched" event.

**tokenToTokenSwitch(uint256 token1Amount, uint256 minToken2Amount, address token2Addr)**

Enables to trade the token of the pool against a token from another pool.
The present pool will communicated with the pool of the other token to trade ether between them.
The contracts compute the number of tokens you get depending on the ratio of ether and token available in the two pools.
"token1Amount" parameter represents the number of tokens you want to trade.
"minToken2Amount" parameter represents the minimum amount of tokens you are willing to accept for this trade.
"token2Addr" parameter represents the address of the token you want to get.
Emits a "TokenToTokenSwitchedPoolA" event from the first pool, and "TokenToTokenSwitchedPoolB" from the second pool.

## Events

- PoolLaunched(address token, address pool)
- PoolInitialized(address pool, address token, uint256 weiAmount, uint256 tokenAmount)
- EthToTokenSwitched(address user, address token, uint256 weiIn, uint256 tokenOut)
- TokenToEthSwitched(address user, address token, uint256 tokenIn, uint256 weiOut)
- TokenToTokenSwitchedPoolA(address user, address token1, address token2, uint256 tokenIn, uint256 weiOut)
- TokenToTokenSwitchedPoolB(address user, address token2, uint256 weiIn, uint256 tokenOut)
- LiquidityProvided(address user, uint256 sharesCreated, uint256 weiAmount, uint256 tokenAmount)
- LiquidityWithdrew(address user, uint256 sharesBurnt, uint256 weiAmount, uint256 tokenAmount)

## Installation

## Testing
