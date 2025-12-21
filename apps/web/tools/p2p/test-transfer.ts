/**
 * Test script for MercadoPago transfer with PATCHRIGHT (CDP bypass)
 * Usage: npx tsx test-transfer.ts
 */
import { chromium } from 'patchright';
import { MercadoPagoPage } from './src/browser/mercadopago-page.js';

async function testTransfer() {
  const destination = process.argv[2] || 'eduardomarques0';
  const amount = parseFloat(process.argv[3]) || 20.98;  // With decimals - MercadoPago accepts , or .
  const expectedName = 'Eduardo Marques Da Rosa';

  console.log('='.repeat(50));
  console.log('TEST: MercadoPago Transfer with PATCHRIGHT');
  console.log('='.repeat(50));
  console.log(`Destination: ${destination}`);
  console.log(`Amount: $${amount}`);
  console.log(`Expected Name: ${expectedName}`);
  console.log('CDP Bypass: PATCHRIGHT + Google Chrome');
  console.log('='.repeat(50));

  // Launch browser with existing profile using PATCHRIGHT (CDP bypass)
  // Using Chromium with persistent profile (where MP session is saved)
  const browser = await chromium.launchPersistentContext(
    '/home/edu/.mercadopago-browser-profile',
    {
      headless: false,
      viewport: null,  // Don't set custom viewport (more natural)
      // Do NOT add custom browser headers or userAgent (recommended by patchright)
    }
  );

  const page = await browser.newPage();
  const mpPage = new MercadoPagoPage(page);

  try {
    // Verify session
    console.log('\n[1/2] Verifying session...');
    const sessionValid = await mpPage.verifySession();
    if (!sessionValid) {
      console.error('ERROR: Session invalid. Please login manually first.');
      return;
    }
    console.log('Session is valid!');

    // Execute transfer
    console.log('\n[2/2] Executing transfer...');
    const result = await mpPage.executeTransfer(destination, amount, expectedName);

    console.log('\n' + '='.repeat(50));
    console.log('RESULT:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(50));

    if (result.success) {
      console.log('✅ Transfer completed successfully!');
    } else if (result.qrRequired) {
      console.log('⚠️ QR verification required - please scan with MercadoPago app');
    } else {
      console.log(`❌ Transfer failed: ${result.error}`);
    }

    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 30s for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/tmp/test_transfer_error.png' });
  } finally {
    await browser.close();
  }
}

testTransfer().catch(console.error);
