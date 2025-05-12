# Trading Bot for Meteora DLMM/DAMM

A Solana-based trading bot that interacts with Meteora DLMM (Dynamic Liquidity Market Maker) and DAMM (Dynamic Automated Market Maker) pools to execute hopefully profitable automated trades based on configurable parameters. **IMPORTANT** Any profits or losses are your responsibility solely. The default settings are likely to lose money so make sure to update them, because they arent set based on your specific situation. Also this code is not meant for big money as its not audited plus you need a secure environment and it doesnt support stuff like secure key management.

## Overview

This bot implements an automated trading strategy that:

- Monitors token/WSOL ratios in a Meteora DLMM or DAMM pool
- Executes trades based on configurable parameters and random factors
- Converges the bot's token/SOL ratio toward the pool's ratio over time
- Uses randomized noise to prevent exploitation by observers
- Maintains a balance between buying and selling operations
- Implements slippage protection and error handling
- Adds unpredictability through random decision making

## Features

- Automated trading cycle with configurable intervals
- Convergence mechanism that approaches pool ratio over time
- Random factor implementation that creates a noisy target ratio for unpredictability
- Randomized decision making to prevent pattern exploitation
- Slippage protection on swaps
- Configurable trade sizes and buy/sell ratios
- Error handling and retry mechanisms
- Real-time balance monitoring

## Trading Strategy

### Ratio-Based Trading with Randomization

The bot implements a sophisticated trading strategy that combines ratio-based decision making with controlled randomization:

1. **Convergence to Pool Ratio**: The bot naturally converges toward the pool's token/SOL ratio over time, which helps align with market conditions.

2. **Random Noise**: A configurable noise factor (`RANDOM_FACTOR`) adds unpredictability to the target ratio, making the bot's behavior less predictable.

3. **Decision Randomization**: The bot uses a two-part decision system:

   - With probability `RANDOM_DECISION_THRESHOLD` (default 80%), it follows the natural action based on ratio comparison
   - With probability `1-RANDOM_DECISION_THRESHOLD` (default 20%), it makes a random decision with a carefully calibrated probability

4. **Maintained Buy/Sell Ratio**: Even with randomization, the bot strictly maintains the configured `BUYS_PER_SELL` ratio:
   - For random decisions, exactly `BUYS_PER_SELL/(BUYS_PER_SELL+1)` of trades will be buys
   - This ensures a consistent trading pattern regardless of market conditions

### Profitability Benefits

**IMPORTANT** Profitability is up to you, not the code. The default settings will likely lose money because it depends on the market and your specific situation Check the Discalimer for more info.
This trading strategy increases profitability in several ways:

1. **Anti-Exploitation Protection**: By adding randomness, the bot becomes resistant to pattern recognition and front-running by observers and adversaries.

2. **Market-Making Opportunities**: The maintained buy/sell ratio creates natural market-making activity that can capitalize on bid-ask spreads.

3. **Risk Management**: The bot naturally buys low and sells high (with some randomness), reducing impermanent loss and increasing average returns.

4. **Market Participation**: By consistently participating in the market through both buys and sells, the bot captures value from market volatility while maintaining a desired exposure ratio.

### Disclaimer

**IMPORTANT:** Trading involves significant risk and can result in substantial financial losses:

- Users are solely responsible for any profits or losses incurred while using this bot
- The developer cannot be held accountable for any trading outcomes
- Actual results depend entirely on your specific configuration choices, market conditions, and other factors
- The default settings are provided as examples only and will likely result in losses if used without optimization for your specific market conditions
- Before using this bot with real funds, thoroughly test with small amounts and closely monitor performance
- Past performance is not indicative of future results

## Prerequisites

- Node.js environment (v24)
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
- `POOL_TYPE`: Type of Meteora pool to trade on (DLMM or DAMM)
- `METEORA_POOL`: token/sol pool to trade on.
- `MIN_INTERVAL_MS`: Minimum time between trades (default: 30000ms)
- `MAX_INTERVAL_MS`: Maximum time between trades (default: 120000ms)
- `RANDOM_FACTOR`: Price perturbation factor (default: 0.05 = ±5%) - creates noisy target to prevent exploitation while maintaining convergence
- `RANDOM_DECISION_THRESHOLD`: Probability of following ratio-based strategy (default: 0.8 = 80% follow ratio, 20% do opposite)
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
- Uses randomization to prevent predictable trading patterns
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
