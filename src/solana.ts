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
 * @returns {Promise<{minOut: BN, binArraysPubkey: any[]}>} Object containing the minimum output amount and bin array public keys
 */
async function getSwapMinOut(
  amountIn: BN,
  inToken: PublicKey
): Promise<{ minOut: BN; binArraysPubkey: any[] }> {
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
}

/**
 * Executes a swap transaction on the DLMM pool
 * @param {BN} amountIn - The input amount as a BN
 * @param {PublicKey} inToken - The public key of the input token
 * @param {Object} swapQuote - The swap quote containing minimum output amount and bin array public keys
 * @param {BN} swapQuote.minOut - The minimum output amount
 * @param {any[]} swapQuote.binArraysPubkey - The bin array public keys
 * @returns {Promise<void>}
 */
async function executeSwap(
  amountIn: BN,
  inToken: PublicKey,
  swapQuote: { minOut: BN; binArraysPubkey: any[] }
): Promise<void> {
  const pool = await config.dlmmPool;
  await pool.refetchStates();
  const outToken = inToken.equals(pool.tokenY.publicKey)
    ? pool.tokenX.publicKey
    : pool.tokenY.publicKey;
  const tx = await pool.swap({
    inToken,
    outToken,
    inAmount: amountIn,
    lbPair: pool.pubkey,
    binArraysPubkey: swapQuote.binArraysPubkey,
    minOutAmount: swapQuote.minOut,
    user: config.wallet.publicKey,
  });
  const signature = await sendAndConfirmTransaction(config.connection, tx, [
    config.wallet,
  ]);
  console.log(`Swap executed: https://solscan.io/tx/${signature}`);
}

export { getSolBalance, getTokenBalance, getSwapMinOut, executeSwap };
