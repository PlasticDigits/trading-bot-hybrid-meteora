// src/bot.ts
import { PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import BN from "bn.js";

import config from "./config";

/**
 * Gets the SOL balance of the configured wallet in lamports
 * @returns {Promise<number>} The SOL balance in lamports
 */
async function getSolBalance(): Promise<number> {
  return await config.connection.getBalance(config.wallet.publicKey);
}

/**
 * Gets the token balance of the configured wallet in raw amount
 * @returns {Promise<BN>} The token balance as a BN (Big Number)
 */
async function getTokenBalance(): Promise<BN> {
  const ata = await getOrCreateAssociatedTokenAccount(
    config.connection,
    config.wallet,
    config.tokenMint,
    config.wallet.publicKey
  );
  return new BN(ata.amount.toString()); // Convert bigint to string for BN
}

/**
 * Calculates the minimum output amount for a swap with slippage tolerance
 * @param {BN} amountIn - The input amount as a BN
 * @param {PublicKey} inToken - The public key of the input token
 * @returns {Promise<{minOut: BN, binArraysPubkey?: any[], swapQuote?: any}>} Object containing the minimum output amount and additional data
 */
async function getSwapMinOut(
  amountIn: BN,
  inToken: PublicKey
): Promise<{ minOut: BN; binArraysPubkey?: any[]; swapQuote?: any }> {
  if (config.poolType === "DLMM") {
    if (!config.dlmmPool) throw new Error("DLMM pool not initialized");

    const pool = await config.dlmmPool;
    await pool.refetchStates();
    const swapYtoX = inToken.equals(pool.tokenY.publicKey);
    const binArrays = await pool.getBinArrayForSwap(swapYtoX);
    const swapQuote = await pool.swapQuote(
      amountIn,
      swapYtoX,
      new BN(1),
      binArrays
    );
    // Apply slippage tolerance
    const minOut = swapQuote.minOutAmount.sub(
      swapQuote.minOutAmount.mul(config.slippageBps).div(new BN(10000))
    );
    return {
      minOut,
      binArraysPubkey: swapQuote.binArraysPubkey,
    };
  } else {
    // DAMM pool logic
    if (!config.dammPool) throw new Error("DAMM pool not initialized");

    const pool = await config.dammPool;
    await pool.updateState();

    // Get the token mints from the pool
    const tokenAMint = pool.tokenAMint.address;
    const tokenBMint = pool.tokenBMint.address;

    // Determine if we're swapping from tokenA to tokenB or vice versa
    const isSwappingTokenA = inToken.equals(tokenAMint);
    const inTokenMint = isSwappingTokenA ? tokenAMint : tokenBMint;

    // Convert slippage from basis points to decimal (100 bps = 1%)
    const slippageDecimal = config.slippageBps.toNumber() / 10000;

    // Get swap quote from DAMM pool
    const swapQuote = pool.getSwapQuote(inTokenMint, amountIn, slippageDecimal);

    return {
      minOut: swapQuote.minSwapOutAmount,
      swapQuote,
    };
  }
}

/**
 * Executes a swap transaction on the DLMM or DAMM pool
 * @param {BN} amountIn - The input amount as a BN
 * @param {PublicKey} inToken - The public key of the input token
 * @param {Object} swapQuote - The swap quote containing minimum output amount and additional data
 * @returns {Promise<void>}
 */
async function executeSwap(
  amountIn: BN,
  inToken: PublicKey,
  swapQuote: { minOut: BN; binArraysPubkey?: any[]; swapQuote?: any }
): Promise<void> {
  if (config.poolType === "DLMM") {
    if (!config.dlmmPool) throw new Error("DLMM pool not initialized");

    const pool = await config.dlmmPool;
    await pool.refetchStates();
    const outToken = inToken.equals(pool.tokenY.publicKey)
      ? pool.tokenX.publicKey
      : pool.tokenY.publicKey;

    if (!swapQuote.binArraysPubkey) {
      throw new Error("Missing binArraysPubkey for DLMM swap");
    }

    const tx = await pool.swap({
      inToken,
      outToken,
      inAmount: amountIn,
      lbPair: pool.pubkey,
      binArraysPubkey: swapQuote.binArraysPubkey,
      minOutAmount: swapQuote.minOut,
      user: config.wallet.publicKey,
    });
    const signature = await sendAndConfirmTransaction(
      config.connection,
      tx,
      [config.wallet],
      {
        skipPreflight: true,
        maxRetries: 10,
      }
    );
    console.log(`DLMM Swap executed: https://solscan.io/tx/${signature}`);
  } else {
    // DAMM pool logic
    if (!config.dammPool) throw new Error("DAMM pool not initialized");

    const pool = await config.dammPool;
    await pool.updateState();

    // Create swap transaction
    const swapTx = await pool.swap(
      config.wallet.publicKey,
      inToken,
      amountIn,
      swapQuote.minOut
    );

    // Send and confirm the transaction
    const signature = await sendAndConfirmTransaction(
      config.connection,
      swapTx,
      [config.wallet],
      {
        skipPreflight: true,
        maxRetries: 10,
      }
    );
    console.log(`DAMM Swap executed: https://solscan.io/tx/${signature}`);
  }
}

export { getSolBalance, getTokenBalance, getSwapMinOut, executeSwap };
