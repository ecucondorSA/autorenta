#!/usr/bin/env node

/**
 * Binance P2P Order Polling Daemon
 *
 * Monitors Binance P2P orders page and inserts new orders into Supabase.
 * Uses persistent browser context to maintain Binance session.
 *
 * Usage:
 *   node polling-daemon.mjs              # Start polling (30s interval)
 *   node polling-daemon.mjs --once       # Single check, then exit
 *   node polling-daemon.mjs --interval 60000  # Custom interval (ms)
 */

import { chromium } from 'playwright';
import pg from 'pg';

const { Pool } = pg;

// Configuration
const CONFIG = {
  userDataDir: '/home/edu/.binance-browser-profile',
  ordersUrl: 'https://p2p.binance.com/en/fiatOrder?tab=1',
  pollInterval: 30000, // 30 seconds
  headless: false
};

// Parse CLI arguments
const args = process.argv.slice(2);
const runOnce = args.includes('--once');
const intervalIndex = args.indexOf('--interval');
if (intervalIndex !== -1 && args[intervalIndex + 1]) {
  CONFIG.pollInterval = parseInt(args[intervalIndex + 1]);
}

// PostgreSQL pool
const pool = new Pool({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.buxockxdcgnzfegplcut',
  password: 'Ab.12345',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

let browser = null;
let page = null;

async function initBrowser() {
  console.log('[INIT] Launching persistent browser...');

  browser = await chromium.launchPersistentContext(CONFIG.userDataDir, {
    headless: CONFIG.headless,
    viewport: { width: 1280, height: 720 },
    args: ['--start-maximized']
  });

  page = await browser.newPage();
  console.log('[INIT] Browser ready');
}

async function extractOrders() {
  console.log('[POLL] Navigating to orders page...');
  await page.goto(CONFIG.ordersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for page to fully render
  await page.waitForTimeout(5000);

  // Extract order data from the page
  const orders = await page.evaluate(() => {
    const results = [];

    // Find all order rows in the table
    const rows = document.querySelectorAll('table tbody tr, [class*="order-row"], [class*="OrderItem"]');

    for (const row of rows) {
      const text = row.textContent || '';

      // Extract order number (pattern: 22829...)
      const orderMatch = text.match(/(\d{19,20})/);
      if (!orderMatch) continue;

      const order = {
        order_number: orderMatch[1],
        order_type: text.toLowerCase().includes('buy') ? 'buy' : 'sell',
        binance_status: 'unknown'
      };

      // Detect status
      if (text.includes('Completed')) order.binance_status = 'completed';
      else if (text.includes('Cancelled')) order.binance_status = 'cancelled';
      else if (text.includes('To Pay') || text.includes('Pending')) order.binance_status = 'pending';
      else if (text.includes('Paid')) order.binance_status = 'paid';
      else if (text.includes('Appeal')) order.binance_status = 'appeal';

      // Extract amounts (pattern: 34,001.7 ARS)
      const arsMatch = text.match(/([\d,]+\.?\d*)\s*ARS/);
      if (arsMatch) {
        order.amount_fiat = parseFloat(arsMatch[1].replace(/,/g, ''));
        order.currency = 'ARS';
      }

      // Extract USDT amount
      const usdtMatch = text.match(/([\d,]+\.?\d*)\s*USDT/);
      if (usdtMatch) {
        order.amount_crypto = parseFloat(usdtMatch[1].replace(/,/g, ''));
        order.crypto = 'USDT';
      }

      // Extract price
      const priceMatch = text.match(/1[,.]?[45]\d{2}\.?\d*\s*ARS/);
      if (priceMatch) {
        order.price = parseFloat(priceMatch[0].replace(/[,ARS\s]/g, ''));
      }

      // Extract counterparty name
      const nameElements = row.querySelectorAll('[class*="name"], [class*="user"], a');
      for (const el of nameElements) {
        const name = el.textContent?.trim();
        if (name && name.length > 3 && name.length < 30 && !name.includes('USDT')) {
          order.counterparty = name;
          break;
        }
      }

      results.push(order);
    }

    return results;
  });

  console.log(`[POLL] Found ${orders.length} orders on page`);
  return orders;
}

async function syncToSupabase(orders) {
  if (orders.length === 0) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const order of orders) {
    try {
      // Check if order already exists
      const checkResult = await pool.query(
        'SELECT id FROM p2p_orders WHERE order_number = $1',
        [order.order_number]
      );

      if (checkResult.rows.length > 0) {
        // Update status if changed
        await pool.query(
          'UPDATE p2p_orders SET binance_status = $1 WHERE order_number = $2 AND binance_status != $1',
          [order.binance_status, order.order_number]
        );
        skipped++;
        continue;
      }

      // Insert new order
      await pool.query(`
        INSERT INTO p2p_orders (
          order_number, order_type, amount_fiat, currency,
          amount_crypto, crypto, price, counterparty, binance_status, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        order.order_number,
        order.order_type,
        order.amount_fiat || null,
        order.currency || 'ARS',
        order.amount_crypto || null,
        order.crypto || 'USDT',
        order.price || null,
        order.counterparty || null,
        order.binance_status,
        order.binance_status === 'pending' ? 'pending' : 'synced'
      ]);

      inserted++;
      console.log(`[DB] Inserted order ${order.order_number} (${order.binance_status})`);

      // If pending order, trigger notification
      if (order.binance_status === 'pending') {
        await notifyNewOrder(order);
      }

    } catch (err) {
      if (err.code === '23505') { // Unique violation
        skipped++;
      } else {
        console.error(`[DB] Error inserting order ${order.order_number}:`, err.message);
      }
    }
  }

  return { inserted, skipped };
}

async function notifyNewOrder(order) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔔 NEW PENDING ORDER DETECTED!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Order: ${order.order_number}`);
  console.log(`   Type: ${order.order_type.toUpperCase()}`);
  console.log(`   Amount: ${order.amount_fiat} ${order.currency} → ${order.amount_crypto} ${order.crypto}`);
  console.log(`   Counterparty: ${order.counterparty || 'Unknown'}`);
  console.log(`   Status: ${order.binance_status}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // TODO: Add Telegram notification here
  // const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
}

async function pollOnce() {
  try {
    const orders = await extractOrders();
    const { inserted, skipped } = await syncToSupabase(orders);
    console.log(`[SYNC] Inserted: ${inserted}, Skipped: ${skipped}`);
    return { success: true, orders: orders.length, inserted };
  } catch (err) {
    console.error('[ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

async function startPolling() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       BINANCE P2P ORDER POLLING DAEMON                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Interval: ${CONFIG.pollInterval / 1000}s                                           ║`);
  console.log(`║  Orders URL: ${CONFIG.ordersUrl.substring(0, 40)}...  ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  await initBrowser();

  if (runOnce) {
    const result = await pollOnce();
    await cleanup();
    process.exit(result.success ? 0 : 1);
  }

  // Initial poll
  await pollOnce();

  // Start interval
  setInterval(async () => {
    console.log(`\n[${new Date().toISOString()}] Polling...`);
    await pollOnce();
  }, CONFIG.pollInterval);

  // Keep process alive
  console.log('[DAEMON] Running... Press Ctrl+C to stop');
}

async function cleanup() {
  console.log('\n[CLEANUP] Shutting down...');
  if (browser) await browser.close();
  await pool.end();
  console.log('[CLEANUP] Done');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

// Start
startPolling().catch(async (err) => {
  console.error('[FATAL]', err);
  await cleanup();
  process.exit(1);
});
