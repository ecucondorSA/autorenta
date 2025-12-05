/**
 * P2P Sell Automation Script
 * Flow: Get Order -> Verify Payment in MP (Amount+Name) -> Release USDT
 * Usage: npx tsx sell-usdt.ts <BINANCE_ORDER_URL>
 */
import { chromium } from 'patchright';
import { MercadoPagoPage } from './src/browser/mercadopago-page.js';
import { BinancePage } from './src/browser/binance-page.js';

async function main() {
  const orderUrl = process.argv[2];

  if (!orderUrl) {
    console.error('Usage: npx tsx sell-usdt.ts <BINANCE_ORDER_URL>');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🤖 P2P SELL AUTOMATION - SECURITY MODE');
  console.log('='.repeat(60));

  // 1. Launch Shared Browser Context
  // We use the same profile for both MP and Binance to maintain sessions
  const browser = await chromium.launchPersistentContext(
    '/home/edu/.mercadopago-browser-profile', // Reuse existing profile
    {
      headless: false,
      viewport: null,
      args: ['--start-maximized'] // Easier for manual 2FA
    }
  );

  try {
    const binancePage = new BinancePage(await browser.newPage());
    const mpPage = new MercadoPagoPage(await browser.newPage());

    // 2. BINANCE: Get Order Details
    console.log('\n[1/4] 🔍 Fetching Order Details from Binance...');
    
    // TODO: Extract logic needs to be robust for single order page
    // For now, we extract from the page assuming we are on it
    await binancePage['page'].goto(orderUrl); // Direct access
    
    // Extract Order Info (Amount, Buyer Name)
    // This is a simplified extraction for the specific order page
    const orderDetails = await binancePage['page'].evaluate(() => {
        const text = document.body.innerText;
        
        // Extract Amount (e.g. 25,000.00 ARS)
        const amountMatch = text.match(/Total Amount\s*([\d,.]+)\s*ARS/i) ||
                            text.match(/You will receive\s*([\d,.]+)\s*ARS/i);
        
        // Extract Buyer Name (Real Name)
        // Usually found in the chat header or order details "Buyer's Name"
        const nameMatch = text.match(/Buyer's Name\s*\n\s*([A-Za-z\s]+)/i) ||
                          text.match(/Counterparty\s*\n\s*([A-Za-z\s]+)/i);
                          
        return {
            amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0,
            buyerName: nameMatch ? nameMatch[1].trim() : null
        };
    });

    if (!orderDetails.amount || !orderDetails.buyerName) {
        console.error('❌ Failed to extract order details. Please verify manually.');
        console.log('Detected:', orderDetails);
        return;
    }

    console.log(`\n📋 ORDER DETAILS:`);
    console.log(`   Amount: $${orderDetails.amount} ARS`);
    console.log(`   Buyer:  ${orderDetails.buyerName}`);
    
    // 3. MERCADOPAGO: Verify Payment
    console.log('\n[2/4] 🛡️ Verifying Payment in Mercado Pago...');
    const verification = await mpPage.verifyIncomingTransaction(
        orderDetails.amount, 
        orderDetails.buyerName
    );

    if (!verification.verified) {
        console.error('\n🛑 SECURITY ALERT: Payment verification failed!');
        console.error(`   Reason: ${verification.error}`);
        console.error('   ACTION: DO NOT RELEASE. Check manual proof.');
        return;
    }

    console.log('\n✅ PAYMENT VERIFIED SECURELY');
    console.log(`   Sender: ${verification.details?.sender}`);
    console.log(`   Status: ${verification.details?.status}`);

    // 4. BINANCE: Release
    console.log('\n[3/4] 🔓 Releasing USDT...');
    const release = await binancePage.releaseOrder(orderUrl);

    if (release.success) {
        console.log('\n✅ ORDER COMPLETED SUCCESSFULLY');
    } else if (release.status === '2fa_timeout') {
        console.log('\n⚠️  Timed out waiting for 2FA. Please finish manually.');
    } else {
        console.error(`\n❌ Release failed: ${release.status}`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    // Don't close immediately so user can see result
    console.log('\nBrowser remaining open for 60s...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  }
}

main().catch(console.error);
