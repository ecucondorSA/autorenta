import { chromium } from 'patchright';
import { ProdubancoPage, BANK_CODES } from './src/browser/produbanco-page.js';
import { BinancePage } from './src/browser/binance-page.js';
import { createServiceLogger } from './src/utils/logger.js';
import { sleep } from './src/utils/retry.js';
import { db } from './src/db/client.js';
import { exec } from 'child_process';

const logger = createServiceLogger('ecuador-daemon');

function playNotification() {
  exec('paplay /usr/share/sounds/freedesktop/stereo/phone-incoming-call.oga 2>/dev/null || echo -e "\\a"');
}

/**
 * Ecuador P2P Daemon
 *
 * Flow: BUY USDT with USD via Produbanco
 * 1. Monitor Binance for BUY orders with status "pending_payment" (we need to pay)
 * 2. Extract seller's bank details from Binance order
 * 3. Execute transfer via Produbanco
 * 4. Mark as "Paid" in Binance
 * 5. Wait for seller to release USDT
 *
 * NOTE: This daemon uses a SEPARATE browser profile from polling-sales.ts
 * to avoid conflicts. Produbanco sessions need their own persistent profile.
 */
async function main() {
  logger.info('='.repeat(60));
  logger.info('🇪🇨 P2P ECUADOR DAEMON STARTED (USD/Produbanco)');
  logger.info('   Watching for BUY orders needing payment...');
  logger.info('='.repeat(60));

  // Check DB connection
  const isDbUp = await db.healthCheck();
  if (!isDbUp) {
    logger.error('❌ Failed to connect to Supabase. Exiting.');
    process.exit(1);
  }
  logger.info('✅ Supabase connected.');

  // Use separate browser profile for Produbanco
  const browser = await chromium.launchPersistentContext(
    '/home/edu/.produbanco-browser-profile',
    {
      headless: false,
      viewport: null,
      args: ['--start-maximized']
    }
  );

  // Binance page for monitoring orders
  const binancePage = new BinancePage(await browser.newPage());

  // Produbanco page for transfers (lazy init - open when needed)
  let produbancoTab = await browser.newPage();
  const produbancoPage = new ProdubancoPage(produbancoTab);

  let isProcessing = false;

  try {
    // Verify Produbanco session first
    logger.info('Verifying Produbanco session...');
    const sessionOk = await produbancoPage.verifySession();
    if (!sessionOk) {
      logger.error('⚠️ Produbanco session not active. Please login manually.');
      logger.info('   URL: https://www.produbanco.com/produnet/?qsCanal=IN&qsBanca=E');
      logger.info('   Waiting 60s for manual login...');
      await sleep(60000);

      // Re-check
      const retrySession = await produbancoPage.verifySession();
      if (!retrySession) {
        logger.error('❌ Produbanco session still not active. Exiting.');
        await browser.close();
        process.exit(1);
      }
    }
    logger.info('✅ Produbanco session verified.');

    // Main Polling Loop
    while (true) {
      if (isProcessing) {
        await sleep(5000);
        continue;
      }

      try {
        // 1. Check Binance Orders
        const orders = await binancePage.extractOrders();

        // Log all buy orders for debugging
        const buyOrders = orders.filter(o => o.orderType === 'buy');
        if (buyOrders.length > 0) {
          logger.info(`Buy orders: ${buyOrders.map(o => `${o.orderNumber.slice(-6)}:${o.binanceStatus}`).join(', ')}`);
        }

        // Filter for BUY orders needing payment
        // Status could be: 'pending', 'pending_payment', 'waiting_payment'
        const pendingPaymentOrders = orders.filter(o =>
          o.orderType === 'buy' &&
          (o.binanceStatus === 'pending' ||
           o.binanceStatus === 'pending_payment' ||
           o.binanceStatus === 'waiting_payment' ||
           o.binanceStatus === 'buyer_pending')
        );

        if (pendingPaymentOrders.length > 0) {
          logger.info(`Found ${pendingPaymentOrders.length} orders needing payment.`);
        } else {
          process.stdout.write('.'); // Heartbeat
        }

        for (const order of pendingPaymentOrders) {
          const orderNumber = order.orderNumber;

          // CHECK DB: Has this order been processed?
          const existingOrder = await db.getOrderByNumber(orderNumber);

          if (existingOrder) {
            if (['completed', 'paid', 'released'].includes(existingOrder.status)) {
              continue; // Already done
            }
            if (existingOrder.status === 'failed' && existingOrder.retry_count >= 3) {
              logger.warn(`Skipping failed order ${orderNumber} (max retries)`);
              continue;
            }
          } else {
            // New order! Insert it.
            logger.info(`New BUY order detected: ${orderNumber}`);
            await db.insertOrder({
              order_number: orderNumber,
              status: 'detected',
              order_type: 'buy',
              amount_fiat: order.amountFiat,
              amount_crypto: order.amountCrypto,
              currency: order.currency || 'USD',
              counterparty_name: order.counterparty,
              detected_at: new Date().toISOString(),
              retry_count: 0,
              max_retries: 3
            });
          }

          logger.info(`\n\n🚨 PROCESSING BUY ORDER: ${orderNumber}`);
          logger.info(`   Seller: ${order.counterparty}`);
          logger.info(`   Amount: ${order.amountFiat} USD`);

          isProcessing = true;
          playNotification();

          // === START PAYMENT FLOW ===

          // 1. Get seller's payment details from Binance
          if (!order.href) {
            logger.error('Order has no link, skipping...');
            isProcessing = false;
            continue;
          }

          const paymentDetails = await binancePage.extractPaymentDetails(order.href);

          if (!paymentDetails) {
            logger.error('Could not extract payment details');
            await db.incrementRetry(orderNumber, 'Could not extract payment details');
            isProcessing = false;
            continue;
          }

          logger.info(`Payment details:`);
          logger.info(`   Bank: ${paymentDetails.bankName}`);
          logger.info(`   Account: ${paymentDetails.accountNumber}`);
          logger.info(`   Name: ${paymentDetails.accountName}`);

          // 2. Map bank name to code
          const bankCode = mapBankNameToCode(paymentDetails.bankName);
          if (!bankCode) {
            logger.error(`Unknown bank: ${paymentDetails.bankName}`);
            await db.incrementRetry(orderNumber, `Unknown bank: ${paymentDetails.bankName}`);
            isProcessing = false;
            continue;
          }

          // 3. Execute transfer via Produbanco
          await db.transitionStatus(orderNumber, 'transferring', 'ecuador-daemon');

          // Execute transfer via Produbanco
          // NOTE: For PRODUBANCO→PRODUBANCO transfers, only account number is needed
          // For other banks, additional fields (ID, name) may be required
          const isProdubanco = bankCode === BANK_CODES.PRODUBANCO;

          const transferResult = await produbancoPage.executeTransfer({
            bankCode: bankCode,
            accountNumber: paymentDetails.accountNumber,
            amount: order.amountFiat,
            description: `P2P Binance ${orderNumber.slice(-8)}`,
            // Only include extra fields for non-Produbanco transfers
            ...(isProdubanco ? {} : {
              accountType: detectAccountType(paymentDetails.accountNumber),
              idType: 'cedula' as const,
              idNumber: paymentDetails.idNumber || '',
              firstName: paymentDetails.firstName,
              lastName: paymentDetails.lastName,
              companyName: paymentDetails.companyName,
            })
          });

          if (transferResult.qrRequired) {
            // Manual intervention needed for 2FA
            logger.warn('⚠️ MANUAL 2FA REQUIRED');
            logger.warn('   Please complete Token de Identidad verification');
            logger.warn('   Then mark as paid in Binance manually');
            await db.transitionStatus(orderNumber, 'manual_2fa', 'ecuador-daemon');
            playNotification();
            playNotification();
          } else if (transferResult.success) {
            logger.info('✅ Transfer completed!');
            await db.transitionStatus(orderNumber, 'paid', 'ecuador-daemon');

            // 4. Mark as Paid in Binance
            const markPaidResult = await binancePage.markAsPaid(order.href);
            if (markPaidResult) {
              logger.info('✅ Marked as PAID in Binance. Waiting for seller to release...');
              await db.transitionStatus(orderNumber, 'awaiting_release', 'ecuador-daemon');
            }
          } else {
            logger.error(`❌ Transfer failed: ${transferResult.error}`);
            await db.incrementRetry(orderNumber, transferResult.error || 'Transfer failed');
          }

          isProcessing = false;
        }

      } catch (loopError) {
        logger.error(`Polling loop error: ${loopError}`);
        isProcessing = false;
      }

      // Sleep before next poll (longer interval for Ecuador - less volume)
      await sleep(45000); // Check every 45 seconds
    }

  } catch (fatalError) {
    console.error('Fatal daemon error:', fatalError);
  } finally {
    await browser.close();
  }
}

/**
 * Map bank names to Produbanco bank codes
 * VERIFIED 05-Dec-2025 from SELECT#cbxBanco dropdown
 */
function mapBankNameToCode(bankName: string): string | null {
  const name = bankName.toLowerCase();

  // Exact matches first (more specific)
  if (name.includes('produbanco')) return BANK_CODES.PRODUBANCO;      // 36
  if (name.includes('pichincha')) return BANK_CODES.PICHINCHA;        // 10
  if (name.includes('pacifico') || name.includes('pacífico')) return BANK_CODES.PACIFICO;  // 30
  if (name.includes('guayaquil')) return BANK_CODES.GUAYAQUIL;        // 17
  if (name.includes('bolivariano')) return BANK_CODES.BOLIVARIANO;    // 37
  if (name.includes('internacional')) return BANK_CODES.INTERNACIONAL; // 32
  if (name.includes('amazonas')) return BANK_CODES.AMAZONAS;          // 34

  logger.warn(`Unknown bank name: ${bankName}`);
  return null;
}

/**
 * Detect account type from account number pattern
 * Ecuador account numbers: typically 10 digits
 * - Starting with 2: Ahorros (savings)
 * - Starting with 1 or 3: Corriente (checking)
 */
function detectAccountType(accountNumber: string): 'ahorros' | 'corriente' {
  const firstDigit = accountNumber.charAt(0);
  if (firstDigit === '2') {
    return 'ahorros';
  }
  return 'corriente'; // Default to corriente
}

main();
