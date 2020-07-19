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
        coinOutBalance / (coinInBalance + amountIn) * amountIn * 0.998 // 0.2% fee
    );
}

const computeShareFlow = (weiFlow, initialWeiBalance, initialTokenBalance, initialTotalShares) => {
    const expectedShareAmount = Math.floor(weiFlow * initialTotalShares / initialWeiBalance);
    const expectedTokenAmount = Math.floor(initialTokenBalance / initialTotalShares) * expectedShareAmount;
    return [expectedShareAmount, expectedTokenAmount];
}

module.exports = {
    getBalances,
    getPoolShares,
    computeSwitchOutAmount,
    computeShareFlow
}
