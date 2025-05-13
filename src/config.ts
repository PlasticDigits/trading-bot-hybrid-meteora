import * as dotenv from "dotenv";
import BN from "bn.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import DLMM from "@meteora-ag/dlmm";
import { AmmImpl } from "@mercurial-finance/dynamic-amm-sdk";

dotenv.config();

// Load and validate config from .env
const rpcUrl = process.env.SOLANA_RPC_URL!;
const poolAddr = new PublicKey(process.env.METEORA_POOL!);
const tokenMint = new PublicKey(process.env.TOKEN_MINT!);
const wsolMint = new PublicKey(process.env.WSOL_MINT!);
const poolType = (process.env.POOL_TYPE || "DLMM").toUpperCase();

if (poolType !== "DLMM" && poolType !== "DAMM") {
  throw new Error("POOL_TYPE must be either DLMM or DAMM");
}

// Trading interval parameters
const minInterval = parseInt(process.env.MIN_INTERVAL_MS!) || 30000; // minimum time between trades (ms)
const maxInterval = parseInt(process.env.MAX_INTERVAL_MS!) || 120000; // maximum time between trades (ms)

// Price and slippage parameters
const randomFactor = parseFloat(process.env.RANDOM_FACTOR!) || 0.05; // fraction to perturb target price (e.g. 0.05 = ±5%)
const slippageBps = new BN(parseInt(process.env.SLIPPAGE_BPS!) || 100); // slippage tolerance in basis points (e.g. 100 = 1%)

// Trade size parameters
let maxTradeFraction: number;
let minTradeFraction: number;

// Check if legacy TRADE_FRACTION is set
if (process.env.TRADE_FRACTION) {
  const tradeFraction = parseFloat(process.env.TRADE_FRACTION || "0.05");
  maxTradeFraction = tradeFraction;
  minTradeFraction = tradeFraction * 0.2; // 20% of trade fraction as minimum
} else {
  // Use new MIN_TRADE_FRACTION and MAX_TRADE_FRACTION env vars
  maxTradeFraction = parseFloat(process.env.MAX_TRADE_FRACTION || "0.05");
  minTradeFraction = parseFloat(process.env.MIN_TRADE_FRACTION || "0.01");
}

// Buy/Sell ratio parameter
const buysPerSell = parseFloat(process.env.BUYS_PER_SELL || "2.0"); // ratio of buys to sells, reduces size of buys relative to sells

// Random decision threshold for unpredictable trading
const randomDecisionThreshold = parseFloat(
  process.env.RANDOM_DECISION_THRESHOLD || "0.8"
); // 80% follow ratio-based strategy by default

// Validate required environment variables
if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

// Initialize Solana connection and wallet
const connection = new Connection(rpcUrl, "confirmed");
let secretKey: Uint8Array;
try {
  // Try parsing as JSON array first
  const jsonKey = JSON.parse(process.env.PRIVATE_KEY!);
  if (Array.isArray(jsonKey)) {
    secretKey = new Uint8Array(jsonKey);
  } else {
    throw new Error("Invalid JSON array format");
  }
} catch {
  // If JSON parsing fails, try base58
  try {
    secretKey = bs58.default.decode(process.env.PRIVATE_KEY!);
  } catch (e) {
    throw new Error(
      "PRIVATE_KEY must be either a base58 string or a JSON array of numbers"
    );
  }
}
const wallet = Keypair.fromSecretKey(secretKey);
console.log("Wallet Successfully Loaded:", wallet.publicKey.toBase58());

// Initialize pool based on pool type
let dlmmPool: Promise<DLMM> | null = null;
let dammPool: Promise<AmmImpl> | null = null;

if (poolType === "DLMM") {
  dlmmPool = DLMM.create(connection, poolAddr);
} else {
  dammPool = AmmImpl.create(connection, poolAddr);
}

interface Config {
  connection: Connection;
  poolAddr: PublicKey;
  tokenMint: PublicKey;
  wsolMint: PublicKey;
  minInterval: number;
  maxInterval: number;
  randomFactor: number;
  slippageBps: BN;
  maxTradeFraction: number;
  minTradeFraction: number;
  wallet: Keypair;
  poolType: string;
  dlmmPool: Promise<DLMM> | null;
  dammPool: Promise<AmmImpl> | null;
  buysPerSell: number;
  randomDecisionThreshold: number;
}

const config: Config = {
  connection,
  poolAddr,
  tokenMint,
  wsolMint,
  minInterval,
  maxInterval,
  randomFactor,
  slippageBps,
  maxTradeFraction,
  minTradeFraction,
  wallet,
  poolType,
  dlmmPool,
  dammPool,
  buysPerSell,
  randomDecisionThreshold,
};

export default config;
