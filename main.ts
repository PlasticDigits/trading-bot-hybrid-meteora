import tradeCycle from "./src/bot";
import config from "./src/config";

const { maxInterval, minInterval } = config;

const DEFAULT_RETRY_DELAY = 30000;

// Main loop: run indefinitely with random delays
async function main() {
  console.log("Bot initialized. Starting trading loop...");
  while (true) {
    try {
      await tradeCycle();
      // Random delay between min and max
      const delay = Math.random() * (maxInterval - minInterval) + minInterval;
      console.log(`Waiting ${Math.round(delay / 1000)}s until next trade.`);
      await new Promise((r) => setTimeout(r, delay));
    } catch (error) {
      console.error("Error in main trading loop:", error);
      // Wait a bit longer after an error before retrying
      const errorDelay = DEFAULT_RETRY_DELAY;
      console.log(
        `Error occurred. Waiting ${errorDelay / 1000}s before retrying...`
      );
      await new Promise((r) => setTimeout(r, errorDelay));
    }
  }
}

main();
