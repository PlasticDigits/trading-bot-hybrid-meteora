# Trading Bot for Meteora DLMM

A Solana-based trading bot that interacts with Meteora DLMM (Decentralized Liquidity Market Maker) pools to execute automated trades based on configurable parameters.

## Overview

This bot implements an automated trading strategy that:

- Monitors token/WSOL ratios in a Meteora DLMM pool
- Executes trades based on configurable parameters and random factors
- Maintains a balance between buying and selling operations
- Implements slippage protection and error handling

## Features

- Automated trading cycle with configurable intervals
- Random factor implementation for trade execution
- Slippage protection on swaps
- Configurable trade sizes and buy/sell ratios
- Error handling and retry mechanisms
- Real-time balance monitoring

## Prerequisites

- Node.js environment
- Solana wallet with private key
- Access to a Solana RPC endpoint
- Sufficient SOL and token balances for trading

## Environment Variables

Create a `.env` file by copying the `.copyme` file:

```bash
cp .copyme .env
```

Then edit the `.env` file with your specific configuration values. See the comments in `.copyme` for detailed explanations of each variable.

### Key Configuration Parameters

- `PRIVATE_KEY`: Wallet private key in either format:
  - Base58 format (64 chars): `"3Bx...XYZ=="`
  - JSON array format (64 numbers): `"[1,2,3,...,64]"`
- `METEORA_POOL`: token/sol pool to trade on.
- `MIN_INTERVAL_MS`: Minimum time between trades (default: 30000ms)
- `MAX_INTERVAL_MS`: Maximum time between trades (default: 120000ms)
- `RANDOM_FACTOR`: Price perturbation factor (default: 0.05 = ±5%)
- `SLIPPAGE_BPS`: Slippage tolerance in basis points (default: 100 = 1%)
- `TRADE_FRACTION`: Maximum trade fraction of holdings (default: 0.05 = 5%)
- `BUYS_PER_SELL`: Ratio of buys to sells (default: 2.0)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
yarn install
```

3. Configure your `.env` file
4. Run the bot:

```bash
yarn start
```

## Core Components

### Main Loop (`main.ts`)

- Implements the main trading loop
- Handles error recovery and retry logic
- Manages random delays between trades

### Bot Logic (`bot.ts`)

- Implements the core trading strategy
- Calculates token/WSOL ratios
- Decides trade actions based on pool conditions
- Executes swaps with configured parameters

### Solana Integration (`solana.ts`)

- Manages Solana wallet interactions
- Handles token balance queries
- Executes swap transactions
- Implements slippage protection

### Configuration (`config.ts`)

- Loads and validates environment variables
- Initializes Solana connection and wallet
- Sets up Meteora DLMM pool instance
- Manages trading parameters

## Error Handling

The bot implements comprehensive error handling:

- Automatic retry after errors with configurable delay
- Balance validation before trades
- Slippage protection on swaps
- Transaction confirmation monitoring

## Security Considerations

- Private keys should be stored securely in environment variables
- Slippage protection is implemented to prevent unfavorable trades
- Trade sizes are limited to prevent excessive exposure
- Error handling prevents loss of funds during failed transactions

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

The GNU GPL is a free, copyleft license that ensures the software remains free and open source. This means you are free to:

- Use the software for any purpose
- Change the software to suit your needs
- Share the software with others
- Share the changes you make

For more information about the GNU GPL v3.0, visit [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html)
