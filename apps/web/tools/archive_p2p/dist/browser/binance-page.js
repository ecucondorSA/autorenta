import { createServiceLogger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
const logger = createServiceLogger('binance-page');
export class BinancePage {
    page;
    constructor(page) {
        this.page = page;
    }
    /**
     * Verify Binance session is active
     */
    async verifySession() {
        try {
            await this.page.goto('https://p2p.binance.com/en/myOrder?tab=1', {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await sleep(3000);
            // Check if logged in (should see orders table or user menu)
            const loggedIn = await this.page.$('[class*="orders"]') ||
                await this.page.$('text=All Orders') ||
                await this.page.$('[class*="UserCenter"]');
            if (loggedIn) {
                logger.info('Binance session is active');
                return true;
            }
            // Check if redirected to login
            const url = this.page.url();
            if (url.includes('login') || url.includes('accounts')) {
                logger.warn('Binance session expired - needs login');
                return false;
            }
            return true; // Assume logged in if not redirected
        }
        catch (error) {
            logger.error(`Session verification failed: ${error}`);
            return false;
        }
    }
    /**
     * Extract orders from Binance P2P orders page
     */
    async extractOrders() {
        logger.info('Extracting orders from Binance...');
        try {
            // Navigate to orders page
            await this.page.goto('https://p2p.binance.com/en/fiatOrder?tab=1', {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await sleep(3000);
            // Extract orders from DOM
            const orders = await this.page.evaluate(() => {
                const results = [];
                const rows = document.querySelectorAll('table tbody tr');
                for (const row of rows) {
                    const text = row.textContent || '';
                    // Extract order number (19-20 digits)
                    const orderMatch = text.match(/(\d{19,20})/);
                    if (!orderMatch)
                        continue;
                    // Get link to order detail
                    const link = row.querySelector('a[href*="fiatOrderDetail"]');
                    const order = {
                        orderNumber: orderMatch[1],
                        href: link?.href || null,
                    };
                    // Determine order type
                    if (text.toLowerCase().includes('buy')) {
                        order.orderType = 'buy';
                    }
                    else if (text.toLowerCase().includes('sell')) {
                        order.orderType = 'sell';
                    }
                    else {
                        order.orderType = 'unknown';
                    }
                    // Extract status
                    if (text.includes('To Pay') || text.includes('Pending')) {
                        order.binanceStatus = 'pending';
                    }
                    else if (text.includes('Paid')) {
                        order.binanceStatus = 'paid';
                    }
                    else if (text.includes('Completed')) {
                        order.binanceStatus = 'completed';
                    }
                    else if (text.includes('Cancelled')) {
                        order.binanceStatus = 'cancelled';
                    }
                    else {
                        order.binanceStatus = 'unknown';
                    }
                    // Extract amount (ARS)
                    const arsMatch = text.match(/([\d,]+\.?\d*)\s*ARS/i);
                    if (arsMatch) {
                        order.amountFiat = parseFloat(arsMatch[1].replace(/,/g, ''));
                        order.currency = 'ARS';
                    }
                    // Extract crypto amount (USDT)
                    const usdtMatch = text.match(/([\d,]+\.?\d*)\s*USDT/i);
                    if (usdtMatch) {
                        order.amountCrypto = parseFloat(usdtMatch[1].replace(/,/g, ''));
                    }
                    // Extract counterparty (usually in a specific cell)
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 4) {
                        order.counterparty = cells[4]?.textContent?.trim();
                    }
                    results.push(order);
                }
                return results;
            });
            logger.info(`Extracted ${orders.length} orders from Binance`);
            return orders;
        }
        catch (error) {
            logger.error(`Failed to extract orders: ${error}`);
            return [];
        }
    }
    /**
     * Extract payment details from order detail page
     */
    async extractPaymentDetails(orderHref) {
        logger.info(`Extracting payment details from: ${orderHref}`);
        try {
            await this.page.goto(orderHref, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await sleep(2000);
            const details = await this.page.evaluate(() => {
                const text = document.body.innerText;
                // CVU: 22 digits
                const cvuMatch = text.match(/\b(\d{22})\b/);
                // Alias: word.word.word pattern (common in Argentina)
                const aliasMatch = text.match(/([a-zA-Z0-9]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+)/);
                // Holder name (look for common patterns)
                const holderMatch = text.match(/(?:Titular|Nombre|Name)[:\s]+([A-Za-z\s]+?)(?:\n|$)/i);
                return {
                    cvu: cvuMatch?.[1] || undefined,
                    alias: aliasMatch?.[1] || undefined,
                    holder: holderMatch?.[1]?.trim() || undefined,
                };
            });
            if (details.cvu || details.alias) {
                logger.info(`Found payment details - CVU: ${details.cvu || 'N/A'}, Alias: ${details.alias || 'N/A'}`);
                return details;
            }
            logger.warn('No payment details found in order');
            return null;
        }
        catch (error) {
            logger.error(`Failed to extract payment details: ${error}`);
            return null;
        }
    }
    /**
     * Mark order as paid in Binance
     */
    async markAsPaid(orderHref) {
        logger.info(`Marking order as paid: ${orderHref}`);
        try {
            await this.page.goto(orderHref, {
                waitUntil: 'domcontentloaded',
                timeout: 30000,
            });
            await sleep(2000);
            // Look for "Transferred, notify seller" or similar button
            const markPaidBtn = await this.page.$('button:has-text("Transferred")') ||
                await this.page.$('button:has-text("I\'ve Paid")') ||
                await this.page.$('button:has-text("Paid")');
            if (markPaidBtn) {
                await markPaidBtn.click();
                logger.info('Clicked mark as paid button');
                // Wait for confirmation dialog
                await sleep(1000);
                // Confirm if dialog appears
                const confirmBtn = await this.page.$('button:has-text("Confirm")') ||
                    await this.page.$('button:has-text("Yes")');
                if (confirmBtn) {
                    await confirmBtn.click();
                    logger.info('Confirmed payment');
                }
                await sleep(2000);
                // Verify status changed
                const paidStatus = await this.page.$('text=Paid') ||
                    await this.page.$('text=Payment Completed');
                if (paidStatus) {
                    logger.info('Order marked as paid successfully');
                    return true;
                }
            }
            logger.warn('Could not find mark as paid button');
            return false;
        }
        catch (error) {
            logger.error(`Failed to mark as paid: ${error}`);
            return false;
        }
    }
}
export default BinancePage;
//# sourceMappingURL=binance-page.js.map