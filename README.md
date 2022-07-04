# Uniswitch

Uniswitch is a protocol that enables users to exchange ether and ERC20 tokens together.
The protocol works with liquidity pools that removes the need to match a maker and a taker order.
The protocol takes a 0.25% fee for an ETH to token or token to ETH switch and a 0.5% fee for a token to token switch.

You can try the protocol with the goerli testnet instance at this address: `0x57a866Bfb81D0FC2aaF1CddA7948a3e41587A585`
[See on Etherscan](https://goerli.etherscan.io/address/0x57a866Bfb81D0FC2aaF1CddA7948a3e41587A585#code)

## Contracts

The protocol works with the factory pattern. Thus it is made of 2 contracts :

- UniswitchFactory.sol, the factory contract that creates the pools and keeps track of them
- UniswitchPool.sol, the contract model of a pool that hosts ether and and ERC20 token

## Factory interface

**tokenToPool(address token) view returns(address)**

Returns the pool address related to the token address in parameter.

**poolToToken(address pool) view returns(address)**

Returns the token address related to the pool address in parameter.

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
The user gets 100000000 shares in the pool for initializing it.
Emits a "PoolInitialized" event.

**provideLiquidity(uint256 minShares) payable**

Enables to deposit tokens and ether in the pool.
"minShares" parameter represents the minimum number of share you are willing to accept for this investment.
The amount of tokens transfered and of shares obtained are computed depenting on the amount of ether sent.
Requires to allow the pool address to use a transferFrom transaction for the token.
Emits a "LiquidityProvided" event.

**withdrawLiquidity(uint256 weiAmount, uint256 minToken)**

Enables to withdraw tokens and ether from the pool.
"weiAmount" parameter represents the amount of wei you want to withdraw.
"minToken" parameter represents the minimum amount of tokens you are willing to accept in return.
Emits a "LiquidityWithdrew" event.

**ethToTokenSwitch(address to, uint256 minTokenOut) payable**

Enables to trade ether against tokens.
The contract computes the number of token you get with the infamous constant product formula.
"to" parameter is the address that will receive to tokens.
"minTokenOut" parameter represents the minimum amount of tokens you are willing to accept for this trade.
Emits a "EthToTokenSwitched" event.

**tokenToEthSwitch(address to, uint256 tokenAmount, uint256 minWeiOut)**

Enables to trade tokens against ether.
The contract computes the number of token you get with the infamous constant product formula.
"to" parameter is the address that will receive to tokens.
"tokenAmount" parameter represents the number of tokens you want to trade.
"minWeiOut" parameter represents the minimum amount of wei you are willing to accept for this trade.
Requires to allow the pool address to use a transferFrom transaction for the token.
Emits a "TokenToEthSwitched" event.

**tokenToTokenSwitch(address to, uint256 token1Amount, uint256 minToken2Amount, address token2Addr)**

Enables to trade the token of the pool against a token from another pool.
The present pool will communicated with the pool of the other token and trade ether between them.
The contracts compute the number of token you get with the infamous constant product formula.
"to" parameter is the address that will receive to tokens.
"tokenInAmount" parameter represents the number of tokens you want to trade.
"minTokenOutAmount" parameter represents the minimum amount of tokens you are willing to accept for this trade.
"tokenOutAddr" parameter represents the address of the token you want to get.
Requires to allow the pool address to use a transferFrom transaction for the token you send.
Emits a "EthToTokenSwitched" event from the first pool, and "EthToTokenSwitched" from the second pool.

## Events

- PoolLaunched(address indexed token, address pool)
- PoolInitialized(uint256 weiAmount, uint256 tokenAmount)
- LiquidityProvided(address indexed provider, uint256 sharesCreated, uint256 weiAmount, uint256 tokenAmount)
- LiquidityWithdrew(address indexed withdrawer, uint256 sharesBurnt, uint256 weiAmount, uint256 tokenAmount)
- EthToTokenSwitched(address indexed from, address indexed to, uint256 weiIn, uint256 tokenOut)
- TokenToEthSwitched(address indexed from, address indexed to, uint256 tokenIn, uint256 weiOut)

## Usage

First, run `npm i`.
Second, copy `.env.example`, rename it to `.env` and fill the fields

You can then run multiple commands:

- Run test suit with `npm run test`
- Run coverage report with `npm run coverage`
- Deploy the protocol with `npm run deploy:<network>`

## Settings

You can turn gas report and optimisation on and off in the hardhat.config.js file with the `showGasReporter` and `enableOptimizer` macros.
