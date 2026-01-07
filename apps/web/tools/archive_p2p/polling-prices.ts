import { chromium } from 'patchright';
import { BinancePage } from './src/browser/binance-page.js';
import { PriceMonitorService } from './src/services/price-monitor.js';
import { createServiceLogger } from './src/utils/logger.js';
import { db } from './src/db/client.js';

const logger = createServiceLogger('prices-daemon');

async function main() {
  logger.info('='.repeat(60));
  logger.info('📊 P2P PRICE MONITOR DAEMON STARTED');
  logger.info('   Monitoring market prices on Binance P2P...');
  logger.info('='.repeat(60));

  // Check DB connection
  const isDbUp = await db.healthCheck();
  if (!isDbUp) {
    logger.error('❌ Failed to connect to database. Exiting.');
    process.exit(1);
  }
  logger.info('✅ Database connected.');

  // Launch browser with Binance profile
  const browser = await chromium.launchPersistentContext(
    '/home/edu/.binance-browser-profile',
    {
      headless: false,
      viewport: null,
      args: ['--start-maximized']
    }
  );

  const page = await browser.newPage();
  const binancePage = new BinancePage(page);

  // Verify Binance session
  const sessionValid = await binancePage.verifySession();
  if (!sessionValid) {
    logger.error('❌ Binance session not valid. Please login manually.');
    logger.info('   Waiting for manual login...');
    // Keep browser open for manual login
  }

  // Create price monitor service
  const priceMonitor = new PriceMonitorService(binancePage);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    priceMonitor.stop();
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    priceMonitor.stop();
  });

  try {
    // Run a single test first to verify scraping works
    logger.info('Running initial price check...');
    const testResult = await priceMonitor.runOnce('ARS');

    if (testResult.buyPrices.length === 0 && testResult.sellPrices.length === 0) {
      logger.warn('⚠️ No prices extracted. Scraping selectors may need adjustment.');
      logger.info('   Will continue monitoring with current selectors...');
    } else {
      logger.info(`✅ Initial check: ${testResult.buyPrices.length} buy, ${testResult.sellPrices.length} sell prices`);

      // Display best prices
      if (testResult.buyPrices[0]) {
        logger.info(`   Best BUY price: ${testResult.buyPrices[0].pricePerUnit} ARS/USDT`);
      }
      if (testResult.sellPrices[0]) {
        logger.info(`   Best SELL price: ${testResult.sellPrices[0].pricePerUnit} ARS/USDT`);
      }
    }

    // Start continuous monitoring
    logger.info('Starting continuous price monitoring...');
    await priceMonitor.start();

  } catch (error) {
    logger.error(`Fatal error: ${error}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
