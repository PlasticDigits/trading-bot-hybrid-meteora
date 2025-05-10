import {
  getSolBalance,
  getSwapMinOut,
  getTokenBalance,
  executeSwap,
} from "./solana";
import config from "./config";
import { BN } from "bn.js";
import { PublicKey } from "@solana/web3.js";

const {
  randomFactor,
  maxTradeFraction,
  minTradeFraction,
  wsolMint,
  tokenMint,
  dlmmPool,
  buysPerSell,
} = config;

// Core trading cycle: compute target, decide trade, execute swap
async function tradeCycle() {
  //Calculation for trade ratios
  let botRatio: number,
    poolRatio: number,
    targetRatio: number,
    botSolBal: number,
    botTokenBal: number;
  try {
    // Get our current ratio
    botSolBal = await getSolBalance();
    botTokenBal = await getTokenBalance();
    if (botSolBal === 0 || botTokenBal === 0) {
      console.log("Insufficient balance for trading.");
      return;
    }
    botRatio = botTokenBal / botSolBal;

    // Get the pool's current ratio token/wsol
    const pool = await dlmmPool;
    poolRatio = pool.tokenX.publicKey.equals(wsolMint)
      ? Number(pool.tokenX.amount) / Number(pool.tokenY.amount)
      : Number(pool.tokenY.amount) / Number(pool.tokenX.amount);

    // Add noise to the pool ratio between [-randomFactor, +randomFactor]
    const noise = Math.random() * 2 * randomFactor - randomFactor;
    targetRatio = botRatio * (1 + noise);

    console.log(
      `Current ratio = ${botRatio.toFixed(6)}, target = ${targetRatio.toFixed(
        6
      )}`
    );
  } catch (err) {
    console.error("Error in tradeCycle ratio calculation:", err);
    return;
  }

  // Decide trade action
  let inToken: PublicKey, outToken: PublicKey, inAmountBN: BN;
  try {
    const pool = await dlmmPool;
    const tradeFraction =
      Math.random() * (maxTradeFraction - minTradeFraction) + minTradeFraction;
    if (poolRatio < targetRatio) {
      // Buy tokens: in=WSOL, out=Token
      inToken = pool.tokenX.publicKey.equals(wsolMint)
        ? pool.tokenX.publicKey
        : pool.tokenY.publicKey;
      outToken = inToken.equals(pool.tokenX.publicKey)
        ? pool.tokenY.publicKey
        : pool.tokenX.publicKey;
      const solToSpend = Math.floor(botSolBal * tradeFraction);
      inAmountBN = new BN(solToSpend);
      // Since is buy, we need to adjust the size by the buy to sell ratio from config
      inAmountBN = inAmountBN.div(new BN(1 + buysPerSell));
    } else {
      // Sell tokens: in=Token, out=WSOL
      inToken = pool.tokenX.publicKey.equals(tokenMint)
        ? pool.tokenX.publicKey
        : pool.tokenY.publicKey;
      outToken = inToken.equals(pool.tokenX.publicKey)
        ? pool.tokenY.publicKey
        : pool.tokenX.publicKey;
      const tokenToSell = Math.floor(botTokenBal * tradeFraction);
      inAmountBN = new BN(tokenToSell);
    }
  } catch (err) {
    console.error("Error in tradeCycle deciding trade action:", err);
    return;
  }

  // Get swap quote and execute
  try {
    const swapQuote = await getSwapMinOut(inAmountBN, inToken);
    await executeSwap(inAmountBN, inToken, swapQuote);
  } catch (err) {
    console.error("Swap failed:", err);
  }
}

export default tradeCycle;
