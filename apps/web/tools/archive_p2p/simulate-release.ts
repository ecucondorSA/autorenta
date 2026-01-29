/**
 * Simulation Script: Test Release Flow (Mocking Verification)
 */
import { chromium } from 'patchright';
import { BinancePage } from './src/browser/binance-page.js';
import { sleep } from './src/utils/retry.js';

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 SIMULATION: P2P RELEASE FLOW');
  console.log('='.repeat(60));

  const browser = await chromium.launchPersistentContext(
    '/home/edu/.mercadopago-browser-profile',
    { headless: false, viewport: null }
  );

  try {
    const page = await browser.newPage();
    const binancePage = new BinancePage(page);

    console.log('\n[1/3] 🛡️ Mocking Mercado Pago Verification...');
    await sleep(1000);
    console.log('✅ PAYMENT VERIFIED (SIMULATED)');
    console.log('   Sender: Eduardo Marques (Mock)');
    console.log('   Amount: $25,351.00 ARS');

    console.log('\n[2/3] 🔓 Navigating to Binance Order (Demo)...');
    // We navigate to Google to demonstrate the browser is active
    // In real life, this would be the order URL
    await page.goto('https://p2p.binance.com/en/myAdsOrder'); 
    
    console.log('\n[3/3] 🤖 Attempting to Release (Will fail on demo page)...');
    
    // This will fail because button doesn't exist on generic page
    const release = await binancePage.releaseOrder('https://p2p.binance.com/en/myAdsOrder');

    if (release.success) {
        console.log('✅ RELEASED!');
    } else {
        console.log(`ℹ️ Simulation stopped as expected: ${release.status} (No button on demo page)`);
    }

  } catch (error) {
    console.error('Simulation error:', error);
  } finally {
    console.log('\nClosing browser in 10s...');
    await sleep(10000);
    await browser.close();
  }
}

main();
