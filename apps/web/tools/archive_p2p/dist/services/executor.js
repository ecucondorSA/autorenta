import { BrowserManager } from '../browser/manager.js';
import { MercadoPagoPage } from '../browser/mercadopago-page.js';
import { db } from '../db/client.js';
import { config } from '../utils/config.js';
import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
const logger = createServiceLogger('executor');
export class ExecutorService {
    browser;
    mpPage = null;
    isRunning = false;
    constructor() {
        this.browser = new BrowserManager('mercadopago');
    }
    async start() {
        logger.info('========================================');
        logger.info('P2P EXECUTOR SERVICE STARTING');
        logger.info('========================================');
        try {
            // Launch browser
            const page = await this.browser.launch();
            this.mpPage = new MercadoPagoPage(page);
            // Verify session
            const sessionValid = await this.mpPage.verifySession();
            if (!sessionValid) {
                logger.error('MercadoPago session invalid - please login manually in the browser');
                logger.info('Waiting for manual login...');
                // Wait for manual login
                while (!await this.mpPage.verifySession()) {
                    await sleep(30000);
                }
                logger.info('Login detected!');
            }
            this.isRunning = true;
            logger.info('Starting execution loop (checking every 5s)');
            // Main execution loop
            while (this.isRunning) {
                try {
                    await this.processNextOrder();
                }
                catch (error) {
                    logger.error(`Execution error: ${error}`);
                    // Don't crash, continue processing
                }
                await sleep(5000); // Check for new orders every 5 seconds
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
    async processNextOrder() {
        // Get next pending order (with lock)
        const order = await db.getNextPendingOrder('executor');
        if (!order) {
            return; // No pending orders
        }
        logger.info('========================================');
        logger.info(`PROCESSING ORDER: ${order.order_number}`);
        logger.info(`  Amount: ${order.amount_fiat} ARS`);
        logger.info(`  Destination: ${order.payment_alias || order.payment_cvu || 'UNKNOWN'}`);
        logger.info('========================================');
        try {
            await this.executeOrder(order);
        }
        finally {
            // Always release lock
            await db.releaseLock(order.order_number, 'executor');
        }
    }
    async executeOrder(order) {
        if (!this.mpPage)
            return;
        // Determine destination
        const destination = order.payment_alias || order.payment_cvu;
        if (!destination) {
            logger.error('No payment destination - moving to manual review');
            await db.transitionStatus(order.order_number, 'manual_review', 'executor', undefined, 'No payment destination (CVU/Alias)');
            return;
        }
        // Transition to transferring
        await db.transitionStatus(order.order_number, 'transferring', 'executor');
        // Get expected recipient name (from payment details or counterparty)
        const expectedName = order.payment_holder || order.counterparty_name;
        if (expectedName) {
            logger.info(`Expected recipient name: ${expectedName}`);
        }
        else {
            logger.warn('WARNING: No expected recipient name available - name validation will be skipped!');
        }
        // Execute transfer with name validation
        const result = await this.mpPage.executeTransfer(destination, order.amount_fiat, expectedName);
        if (result.success) {
            // Transfer completed successfully
            await db.updateTransferResult(order.order_number, {
                mp_transfer_id: result.transferId,
                mp_transfer_status: 'completed',
                mp_transferred_at: new Date(),
            });
            await db.transitionStatus(order.order_number, 'confirming', 'executor', {
                transferId: result.transferId,
            });
            logger.info(`Transfer successful! ID: ${result.transferId}`);
            // TODO: Mark as paid in Binance (requires separate service or coordination)
            await db.transitionStatus(order.order_number, 'marking_paid', 'executor');
        }
        else if (result.qrRequired) {
            // QR verification required
            await this.handleQrVerification(order);
        }
        else {
            // Transfer failed
            logger.error(`Transfer failed: ${result.error}`);
            await db.incrementRetry(order.order_number, result.error || 'Transfer failed');
        }
    }
    async handleQrVerification(order) {
        if (!this.mpPage)
            return;
        logger.warn('========================================');
        logger.warn('QR VERIFICATION REQUIRED');
        logger.warn('Open MercadoPago app and scan QR NOW!');
        logger.warn(`Timeout: ${config.qrTimeoutMs / 1000} seconds`);
        logger.warn('========================================');
        // Transition to awaiting_qr
        await db.transitionStatus(order.order_number, 'awaiting_qr', 'executor');
        // Wait for QR scan
        const qrScanned = await this.mpPage.waitForQrScan(config.qrTimeoutMs);
        if (qrScanned) {
            // QR scanned, transfer complete
            const checkResult = await this.mpPage.checkTransferResult();
            if (checkResult.success) {
                await db.updateTransferResult(order.order_number, {
                    mp_transfer_id: checkResult.transferId,
                    mp_transfer_status: 'completed',
                    mp_transferred_at: new Date(),
                });
                await db.transitionStatus(order.order_number, 'confirming', 'executor', {
                    transferId: checkResult.transferId,
                });
                logger.info(`QR scanned, transfer complete! ID: ${checkResult.transferId}`);
            }
        }
        else {
            // QR timeout - will retry later
            logger.warn('QR verification timeout - order will retry later');
            await db.transitionStatus(order.order_number, 'pending_transfer', 'executor', undefined, 'QR verification timeout');
        }
    }
    async stop() {
        this.isRunning = false;
        await this.browser.close();
        logger.info('Executor service stopped');
    }
}
// Run as standalone service
if (import.meta.url === `file://${process.argv[1]}`) {
    const executor = new ExecutorService();
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT');
        await executor.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM');
        await executor.stop();
        process.exit(0);
    });
    executor.start().catch(error => {
        logger.error(`Executor failed: ${error}`);
        process.exit(1);
    });
}
export default ExecutorService;
//# sourceMappingURL=executor.js.map