import { BrowserManager } from '../browser/manager.js';
import { BinancePage } from '../browser/binance-page.js';
import { db } from '../db/client.js';
import { config } from '../utils/config.js';
import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
const logger = createServiceLogger('detector');
export class DetectorService {
    browser;
    binancePage = null;
    isRunning = false;
    constructor() {
        this.browser = new BrowserManager('binance');
    }
    async start() {
        logger.info('========================================');
        logger.info('P2P DETECTOR SERVICE STARTING');
        logger.info('========================================');
        try {
            // Launch browser
            const page = await this.browser.launch();
            this.binancePage = new BinancePage(page);
            // Verify session
            const sessionValid = await this.binancePage.verifySession();
            if (!sessionValid) {
                logger.error('Binance session invalid - please login manually in the browser');
                logger.info('Waiting for manual login...');
                // Wait for manual login (check every 30 seconds)
                while (!await this.binancePage.verifySession()) {
                    await sleep(30000);
                }
                logger.info('Login detected!');
            }
            this.isRunning = true;
            logger.info(`Starting polling loop (interval: ${config.pollIntervalMs}ms)`);
            // Main polling loop
            while (this.isRunning) {
                try {
                    await this.pollOnce();
                }
                catch (error) {
                    logger.error(`Polling error: ${error}`);
                    // Don't crash, continue polling
                }
                await sleep(config.pollIntervalMs);
            }
        }
        catch (error) {
            logger.error(`Fatal error: ${error}`);
            throw error;
        }
        finally {
            await this.stop();
        }
    }
    async pollOnce() {
        if (!this.binancePage)
            return;
        logger.debug('Polling Binance for orders...');
        // Extract all orders
        const orders = await this.binancePage.extractOrders();
        // Filter for pending BUY orders (we need to pay)
        const pendingOrders = orders.filter(o => o.binanceStatus === 'pending' && o.orderType === 'buy');
        if (pendingOrders.length === 0) {
            logger.debug('No pending orders');
            return;
        }
        logger.info(`Found ${pendingOrders.length} pending order(s)`);
        // Process each pending order
        for (const order of pendingOrders) {
            await this.processOrder(order);
        }
    }
    async processOrder(order) {
        // Check if already in database
        const existing = await db.getOrderByNumber(order.orderNumber);
        if (existing) {
            logger.debug(`Order ${order.orderNumber} already exists (status: ${existing.status})`);
            return;
        }
        logger.info('========================================');
        logger.info(`NEW ORDER DETECTED: ${order.orderNumber}`);
        logger.info(`  Type: ${order.orderType}`);
        logger.info(`  Amount: ${order.amountFiat} ${order.currency || 'ARS'}`);
        logger.info(`  Crypto: ${order.amountCrypto} USDT`);
        logger.info(`  Counterparty: ${order.counterparty || 'Unknown'}`);
        logger.info('========================================');
        // Insert order
        await db.insertOrder({
            order_number: order.orderNumber,
            order_type: order.orderType,
            amount_fiat: order.amountFiat,
            currency: order.currency || 'ARS',
            amount_crypto: order.amountCrypto,
            counterparty_name: order.counterparty,
            status: 'detected',
        });
        // Extract payment details
        if (order.href) {
            await this.extractPaymentDetails(order);
        }
        else {
            logger.warn('No order href - cannot extract payment details');
        }
    }
    async extractPaymentDetails(order) {
        if (!this.binancePage || !order.href)
            return;
        try {
            // Transition to extracting
            await db.transitionStatus(order.orderNumber, 'extracting', 'detector');
            // Extract details
            const details = await this.binancePage.extractPaymentDetails(order.href);
            if (details && (details.cvu || details.alias)) {
                // Save payment details
                await db.updatePaymentDetails(order.orderNumber, details);
                // Transition to pending_transfer
                await db.transitionStatus(order.orderNumber, 'pending_transfer', 'detector', {
                    paymentDetails: details,
                });
                logger.info(`Payment details extracted for ${order.orderNumber}:`);
                logger.info(`  CVU: ${details.cvu || 'N/A'}`);
                logger.info(`  Alias: ${details.alias || 'N/A'}`);
                logger.info(`  Holder: ${details.holder || 'N/A'}`);
            }
            else {
                logger.warn(`No payment details found for ${order.orderNumber}`);
                await db.transitionStatus(order.orderNumber, 'manual_review', 'detector', undefined, 'Could not extract payment details');
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to extract payment details: ${errorMsg}`);
            await db.incrementRetry(order.orderNumber, errorMsg);
        }
    }
    async stop() {
        this.isRunning = false;
        await this.browser.close();
        logger.info('Detector service stopped');
    }
}
// Run as standalone service
if (import.meta.url === `file://${process.argv[1]}`) {
    const detector = new DetectorService();
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT');
        await detector.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM');
        await detector.stop();
        process.exit(0);
    });
    detector.start().catch(error => {
        logger.error(`Detector failed: ${error}`);
        process.exit(1);
    });
}
export default DetectorService;
//# sourceMappingURL=detector.js.map