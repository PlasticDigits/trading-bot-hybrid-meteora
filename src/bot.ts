import {
  getSolBalance,
  getSwapMinOut,
  getTokenBalance,
  executeSwap,
} from "./solana";
import config from "./config";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

const {
  randomFactor,
  maxTradeFraction,
  minTradeFraction,
  wsolMint,
  tokenMint,
  dlmmPool,
  dammPool,
  poolType,
  buysPerSell,
  randomDecisionThreshold,
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
    const tokenBalBN = await getTokenBalance();
    botTokenBal = tokenBalBN.toNumber(); // Convert BN to number
    if (botSolBal === 0 || botTokenBal === 0) {
      console.log("Insufficient balance for trading.");
      return;
    }
    botRatio = (botTokenBal * 10 ** 9) / botSolBal;

    // Local token variables to normalize between DLMM and DAMM
    let tokenXPubkey: PublicKey;
    let tokenYPubkey: PublicKey;
    let tokenXAmount: string | number | bigint;
    let tokenYAmount: string | number | bigint;

    // Get the pool's current ratio token/wsol
    if (poolType === "DLMM") {
      if (!dlmmPool) {
        console.error("DLMM pool not initialized");
        return;
      }
      const pool = await dlmmPool;
      await pool.refetchStates();
      tokenXPubkey = pool.tokenX.publicKey;
      tokenYPubkey = pool.tokenY.publicKey;
      tokenXAmount = pool.tokenX.amount;
      tokenYAmount = pool.tokenY.amount;
    } else {
      // DAMM Pool
      if (!dammPool) {
        console.error("DAMM pool not initialized");
        return;
      }
      const pool = await dammPool;
      await pool.updateState();

      // Check both tokenAMint/tokenBMint and poolState for the amounts
      tokenXPubkey = pool.tokenAMint.address;
      tokenYPubkey = pool.tokenBMint.address;
      tokenXAmount = pool.poolInfo.tokenAAmount.toNumber();
      tokenYAmount = pool.poolInfo.tokenBAmount.toNumber();
    }

    // Calculate pool ratio with our normalized tokens
    poolRatio = tokenXPubkey.equals(wsolMint)
      ? (Number(tokenYAmount) * 10 ** 9) / Number(tokenXAmount)
      : (Number(tokenXAmount) * 10 ** 9) / Number(tokenYAmount);

    // Add noise to the pool ratio between [-randomFactor, +randomFactor]
    const noise = Math.random() * 2 * randomFactor - randomFactor;
    // Target a noisy version of the pool ratio for convergence with randomness
    targetRatio = poolRatio * (1 + noise);

    console.log(
      `Bot ratio = ${botRatio.toFixed(6)}, pool ratio = ${poolRatio.toFixed(
        6
      )}, noisy target = ${targetRatio.toFixed(6)}`
    );
    console.log(
      `Bot ratio / pool ratio = ${(botRatio / poolRatio).toFixed(6)}`
    );
  } catch (err) {
    console.error("Error in tradeCycle ratio calculation:", err);
    return;
  }

  // Decide trade action
  let inToken: PublicKey, outToken: PublicKey, inAmountBN: BN;
  try {
    // Local token variables to normalize between DLMM and DAMM
    let tokenXPubkey: PublicKey;
    let tokenYPubkey: PublicKey;

    if (poolType === "DLMM") {
      if (!dlmmPool) {
        console.error("DLMM pool not initialized");
        return;
      }
      const pool = await dlmmPool;
      tokenXPubkey = pool.tokenX.publicKey;
      tokenYPubkey = pool.tokenY.publicKey;
    } else {
      // DAMM Pool
      if (!dammPool) {
        console.error("DAMM pool not initialized");
        return;
      }
      const pool = await dammPool;

      // Based on the AmmImpl type definition, we need to use tokenAMint and tokenBMint
      tokenXPubkey = pool.tokenAMint.address;
      tokenYPubkey = pool.tokenBMint.address;
    }

    const tradeFraction =
      Math.random() * (maxTradeFraction - minTradeFraction) + minTradeFraction;

    // Calculate the probability of buying that will maintain the exact buysPerSell ratio
    // No matter how often the bot is above or below target ratio
    let shouldBuyTokens: boolean;

    // With probability randomDecisionThreshold, follow natural action (buy when below, sell when above)
    // Otherwise, use a skewed random decision that ensures exactly buysPerSell buys for every 1 sell
    const followNatural = Math.random() < randomDecisionThreshold;

    if (followNatural) {
      // Follow natural action based on ratio comparison
      shouldBuyTokens = botRatio < targetRatio;
    } else {
      // When randomizing, make buysPerSell/(buysPerSell+1) of random actions be buys
      // This ensures exactly buysPerSell buys for every sell, regardless of market conditions
      const randomBuyThreshold = buysPerSell / (buysPerSell + 1);
      shouldBuyTokens = Math.random() < randomBuyThreshold;
    }

    if (shouldBuyTokens) {
      // Buy tokens
      inToken = tokenXPubkey.equals(wsolMint) ? tokenXPubkey : tokenYPubkey;
      outToken = inToken.equals(tokenXPubkey) ? tokenYPubkey : tokenXPubkey;
      const solToSpend = Math.floor(botSolBal * tradeFraction);
      inAmountBN = new BN(solToSpend);
      // Since is buy, we need to adjust the size by the buy to sell ratio from config
      inAmountBN = inAmountBN.div(new BN(buysPerSell));
      if (followNatural) {
        console.log(`Buying tokens to approach noisy target ratio`);
      } else {
        console.log(`Buying tokens to follow random action`);
      }
    } else {
      // Sell tokens
      inToken = tokenXPubkey.equals(tokenMint) ? tokenXPubkey : tokenYPubkey;
      outToken = inToken.equals(tokenXPubkey) ? tokenYPubkey : tokenXPubkey;
      const tokenToSell = Math.floor(botTokenBal * tradeFraction);
      inAmountBN = new BN(tokenToSell);
      if (followNatural) {
        console.log(`Selling tokens to approach noisy target ratio`);
      } else {
        console.log(`Selling tokens to follow random action`);
      }
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
