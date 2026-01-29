/**
 * Test Script: Mercado Pago Activity Scanner
 * Purpose: Verify that we can correctly read incoming transactions for security checks.
 */
import { chromium } from 'patchright';
import { createServiceLogger } from './src/utils/logger.js';
import { sleep } from './src/utils/retry.js';

const logger = createServiceLogger('test-scan');

async function main() {
  console.log('='.repeat(60));
  console.log('🕵️  MERCADO PAGO ACTIVITY SCANNER (TEST)');
  console.log('='.repeat(60));

  const browser = await chromium.launchPersistentContext(
    '/home/edu/.mercadopago-browser-profile',
    { headless: false, viewport: null }
  );

  try {
    const page = await browser.newPage();
    
    console.log('Navigating to Activities...');
    // Filter by money_in to match the production logic
    await page.goto('https://www.mercadopago.com.ar/activities?q=money_in', {
        waitUntil: 'domcontentloaded'
    });
    
    await sleep(5000); // Wait for list load

    console.log('Scanning DOM...');

    // Execute the exact same extraction logic as in mercadopago-page.ts
    const activities = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('div[class*="activity-row"]'));
        return rows.map(row => {
          const amountText = row.querySelector('[class*="amount"]')?.textContent || '';
          const title = row.querySelector('[class*="title"]')?.textContent || '';
          const subtitle = row.querySelector('[class*="subtitle"]')?.textContent || '';
          const status = row.querySelector('[class*="status"]')?.textContent || 'approved'; 
          
          return {
            rawAmount: amountText,
            title,
            subtitle,
            status: status.toLowerCase()
          };
        });
    });

    console.log(`\nFound ${activities.length} transactions.\n`);
    
    if (activities.length === 0) {
        console.error('❌ NO TRANSACTIONS FOUND!');
        console.error('   Possible causes:');
        console.error('   1. Selectors changed (class names like "activity-row")');
        console.error('   2. Page layout changed');
        console.error('   3. Not logged in');
    } else {
        console.log('✅ READ SUCCESS. Displaying top 5:');
        activities.slice(0, 5).forEach((tx, i) => {
            console.log(`[${i+1}] ${tx.title} | ${tx.rawAmount} | Status: ${tx.status}`);
            console.log(`    Subtitle: ${tx.subtitle}`);
            console.log('-'.repeat(40));
        });
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\nClosing in 5 seconds...');
    await sleep(5000);
    await browser.close();
  }
}

main();
