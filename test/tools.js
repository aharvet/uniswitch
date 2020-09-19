const getBalances = async (addr, tokenAbstract) => {
    const weiBalance = await web3.eth.getBalance(addr);
    const tokenBalance = await tokenAbstract.balanceOf(addr);
    return [weiBalance, tokenBalance];
}

const getPoolShares = async (addr, poolAbstract) => {
    const userShares = await poolAbstract.shares(addr);
    const totalShares = await poolAbstract.totalShares();
    return [userShares, totalShares];
}

const computeSwitchOutAmount = (amountIn, coinInBalance, coinOutBalance) => {
    return Math.floor(
        coinOutBalance / (coinInBalance + amountIn) * amountIn
    );
}

const computeShareFlow = (weiFlow, initialWeiBalance, initialTokenBalance, initialTotalShares) => {
    const expectedShareAmount = Math.floor(weiFlow * initialTotalShares / initialWeiBalance);
    const expectedTokenAmount = Math.floor(initialTokenBalance / initialTotalShares) * expectedShareAmount;
    return [expectedShareAmount, expectedTokenAmount];
}

const getTokensBalances = async (addr, tokensAbstract) => {
    return Promise.all(tokensAbstract.map(tokenAbstract => tokenAbstract.balanceOf(addr)));
}

module.exports = {
    getBalances,
    getPoolShares,
    computeSwitchOutAmount,
    computeShareFlow,
    getTokensBalances
}
