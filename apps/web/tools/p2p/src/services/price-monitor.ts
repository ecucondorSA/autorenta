import { BinancePage } from '../browser/binance-page.js';
import { db } from '../db/client.js';
import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
import type { P2PConfig, MarketPrice } from '../types/index.js';

const logger = createServiceLogger('price-monitor');

export class PriceMonitorService {
  private binancePage: BinancePage;
  private isRunning: boolean = false;

  constructor(binancePage: BinancePage) {
    this.binancePage = binancePage;
  }

  /**
   * Start the price monitoring loop
   * Fetches prices for all active countries at configured intervals
   */
  async start(): Promise<void> {
    logger.info('Starting Price Monitor Service...');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Get active country configurations
        const configs = await db.getActiveConfigs();

        if (configs.length === 0) {
          logger.warn('No active country configs found. Waiting...');
          await sleep(60000);
          continue;
        }

        // For each country, fetch and record prices
        for (const config of configs) {
          if (!this.isRunning) break;

          try {
            await this.fetchPricesForCountry(config);
          } catch (error) {
            logger.error(`Error fetching prices for ${config.countryCode}: ${error}`);
          }

          // Small delay between countries to avoid rate limiting
          await sleep(5000);
        }

        // Wait for the configured interval (use the minimum from all configs)
        const intervalMinutes = Math.min(...configs.map(c => c.priceUpdateIntervalMinutes || 15));
        const intervalMs = intervalMinutes * 60 * 1000;

        logger.info(`Next price update in ${intervalMinutes} minutes...`);
        await sleep(intervalMs);

      } catch (error) {
        logger.error(`Price monitor loop error: ${error}`);
        await sleep(30000); // Wait 30s on error
      }
    }

    logger.info('Price Monitor Service stopped.');
  }

  /**
   * Stop the monitoring loop
   */
  stop(): void {
    logger.info('Stopping Price Monitor Service...');
    this.isRunning = false;
  }

  /**
   * Fetch and record prices for a specific country
   */
  private async fetchPricesForCountry(config: P2PConfig): Promise<void> {
    logger.info(`Fetching prices for ${config.countryName} (${config.fiatCurrency})...`);

    // Fetch BUY prices (when user wants to buy USDT)
    const buyPrices = await this.binancePage.scrapeMarketPrices(config.fiatCurrency, 'buy', 10);

    // Fetch SELL prices (when user wants to sell USDT)
    const sellPrices = await this.binancePage.scrapeMarketPrices(config.fiatCurrency, 'sell', 10);

    // Record prices to database
    if (buyPrices.length > 0) {
      await db.recordMarketPrices(buyPrices);
    }

    if (sellPrices.length > 0) {
      await db.recordMarketPrices(sellPrices);
    }

    // Log summary
    const bestBuy = buyPrices[0]?.pricePerUnit || 'N/A';
    const bestSell = sellPrices[0]?.pricePerUnit || 'N/A';
    const spread = (typeof bestBuy === 'number' && typeof bestSell === 'number')
      ? ((bestSell - bestBuy) / bestBuy * 100).toFixed(2)
      : 'N/A';

    logger.info(`${config.fiatCurrency} - Best Buy: ${bestBuy}, Best Sell: ${bestSell}, Spread: ${spread}%`);
  }

  /**
   * Run a single price check (for testing)
   */
  async runOnce(fiatCurrency: string): Promise<{ buyPrices: MarketPrice[]; sellPrices: MarketPrice[] }> {
    logger.info(`Running single price check for ${fiatCurrency}...`);

    const buyPrices = await this.binancePage.scrapeMarketPrices(fiatCurrency, 'buy', 10);
    const sellPrices = await this.binancePage.scrapeMarketPrices(fiatCurrency, 'sell', 10);

    // Record to database
    await db.recordMarketPrices(buyPrices);
    await db.recordMarketPrices(sellPrices);

    return { buyPrices, sellPrices };
  }
}

export default PriceMonitorService;
