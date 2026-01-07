import { chromium } from 'patchright';
import { MercadoPagoPage } from './src/browser/mercadopago-page.js';
import { BinancePage } from './src/browser/binance-page.js';
import { createServiceLogger } from './src/utils/logger.js';
import { sleep } from './src/utils/retry.js';
import { db } from './src/db/client.js';
import { exec } from 'child_process';

const logger = createServiceLogger('sales-daemon');

function playNotification() {
  exec('paplay /usr/share/sounds/freedesktop/stereo/phone-incoming-call.oga 2>/dev/null || echo -e "\\a"');
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('🤖 P2P AUTO-SALES DAEMON STARTED (SUPABASE CONNECTED)');
  logger.info('   Watching for "Paid" orders on Binance...');
  logger.info('='.repeat(60));

  // Check DB connection
  const isDbUp = await db.healthCheck();
  if (!isDbUp) {
      logger.error('❌ Failed to connect to Supabase. Exiting.');
      process.exit(1);
  }
  logger.info('✅ Supabase connected.');

  const browser = await chromium.launchPersistentContext(
    '/home/edu/.mercadopago-browser-profile', 
    {
      headless: false, 
      viewport: null,
      args: ['--start-maximized']
    }
  );

  const binancePage = new BinancePage(await browser.newPage());
  // We initialize MP page but won\'t open it until needed to save resources/focus
  const mpTab = await browser.newPage();
  const mpPage = new MercadoPagoPage(mpTab);

  let isProcessing = false;

  try {
    // Main Polling Loop
    while (true) {
      if (isProcessing) {
        await sleep(5000);
        continue;
      }

      try {
        // 1. Check Binance Orders
        // Navigate to "Pending" orders tab to save bandwidth
        const orders = await binancePage.extractOrders();

        // Log all sell orders with their status for debugging
        const sellOrders = orders.filter(o => o.orderType === 'sell');
        if (sellOrders.length > 0) {
            logger.info(`Sell orders: ${sellOrders.map(o => `${o.orderNumber.slice(-6)}:${o.binanceStatus}`).join(', ')}`);
        }

        // Filter for SALES that are marked as PAID by buyer (NOT completed - those are already released)
        const pendingReleaseOrders = orders.filter(o =>
            o.orderType === 'sell' &&
            o.binanceStatus === 'paid'
        );

        if (pendingReleaseOrders.length > 0) {
            logger.info(`Found ${pendingReleaseOrders.length} PAID orders to release.`);
        } else {
            process.stdout.write('.'); // Heartbeat
        }

        for (const order of pendingReleaseOrders) {
            const orderNumber = order.orderNumber;

            // CHECK DB: Has this order been processed?
            const existingOrder = await db.getOrderByNumber(orderNumber);
            
            if (existingOrder) {
                if (existingOrder.status === 'completed' || existingOrder.status === 'released') {
                    // Already done, skip silently
                    continue; 
                }
                if (existingOrder.status === 'failed' && existingOrder.retry_count >= 3) {
                    logger.warn(`Skipping failed order ${orderNumber} (max retries reached)`);
                    continue;
                }
            } else {
                // New order! Insert it.
                logger.info(`New order detected in Binance: ${orderNumber}`);
                await db.insertOrder({
                    order_number: orderNumber,
                    status: 'detected',
                    order_type: 'sell',
                    amount_fiat: order.amountFiat,
                    amount_crypto: order.amountCrypto,
                    currency: order.currency,
                    counterparty_name: order.counterparty,
                    detected_at: new Date().toISOString(),
                    retry_count: 0,
                    max_retries: 3
                });
            }

            logger.info(`\n\n🚨 PROCESSING PAID ORDER: ${orderNumber}`);
            logger.info(`   Buyer: ${order.counterparty}`);
            logger.info(`   Amount: ${order.amountFiat} ${order.currency}`);
            
            isProcessing = true;
            playNotification(); 

            // === START VERIFICATION FLOW ===
            
            // 1. Get full details (navigate to order page)
            if (!order.href) {
                logger.error('Order has no link, skipping...');
                isProcessing = false;
                continue;
            }

            // We need exact buyer name from detail page usually
            const paymentDetails = await binancePage.extractPaymentDetails(order.href);
            // Note: extractPaymentDetails gets YOUR payment details, we need BUYER name.
            // Using logic from sell-usdt.ts to get buyer name from page text
            const buyerName = await binancePage['page'].evaluate(() => {
                 const text = document.body.innerText;
                 const match = text.match(/Buyer's Name\s*\n\s*([A-Za-z\s]+)/i) ||
                               text.match(/Counterparty\s*\n\s*([A-Za-z\s]+)/i);
                 return match ? match[1].trim() : null;
            });

            if (!buyerName) {
                logger.error('Could not extract buyer real name. SKIPPING AUTO-RELEASE.');
                await db.incrementRetry(orderNumber, 'Could not extract buyer name');
                isProcessing = false;
                continue;
            }

            // 2. Verify in Mercado Pago
            const verification = await mpPage.verifyIncomingTransaction(order.amountFiat, buyerName);

            if (verification.verified) {
                logger.info(`✅ PAYMENT CONFIRMED! Releasing order...`);
                await db.transitionStatus(orderNumber, 'confirming', 'sales-daemon');
                
                // 3. Release
                const releaseResult = await binancePage.releaseOrder(order.href);
                
                if (releaseResult.success) {
                    logger.info(`🎉 ORDER ${orderNumber} RELEASED SUCCESSFULLY!`);
                    await db.transitionStatus(orderNumber, 'completed', 'sales-daemon');
                } else if (releaseResult.status === '2fa_timeout') {
                    logger.warn('⚠️ Manual 2FA required. Pausing automation for user input.');
                    // Don't mark as failed, just let user finish. 
                    // We can mark as 'manual_intervention' in DB if that status existed.
                } else {
                    logger.error('❌ Release failed in Binance.');
                    await db.incrementRetry(orderNumber, `Release failed: ${releaseResult.status}`);
                }
            } else {
                logger.error(`🛑 VERIFICATION FAILED: ${verification.error}`);
                logger.error('   User must investigate manually.');
                await db.incrementRetry(orderNumber, `Verification failed: ${verification.error}`);
                
                playNotification(); playNotification();
                await sleep(10000); 
            }
            
            isProcessing = false;
        }

      } catch (loopError) {
        logger.error(`Polling loop error: ${loopError}`);
        isProcessing = false;
      }

      // Sleep before next poll
      await sleep(30000); // Check every 30 seconds
    }

  } catch (fatalError) {
    console.error('Fatal daemon error:', fatalError);
  } finally {
    await browser.close();
  }
}

main();
