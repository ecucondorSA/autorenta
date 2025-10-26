import { chromium } from '@playwright/test';

async function checkHyundaiPrice() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console log capture
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CarCard') || text.includes('RPC') || text.includes('price')) {
      logs.push(`[${msg.type()}] ${text}`);
    }
  });
  
  try {
    await page.goto('http://localhost:4200/cars/e8644fdd-e8a3-4565-8c50-ebb779cf6ba3', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    // Extract all visible prices
    const prices = await page.evaluate(() => {
      const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.match(/\$\s*[\d,]+|\d+[.,]\d+/) && el.children.length === 0;
      });
      
      return priceElements.map(el => ({
        text: el.textContent?.trim(),
        className: el.className,
        tagName: el.tagName
      })).slice(0, 10);
    });
    
    console.log('\n📊 Precios visibles en la página:');
    console.log('='.repeat(60));
    prices.forEach((p, i) => {
      console.log(`${i + 1}. [${p.tagName}.${p.className}] ${p.text}`);
    });
    console.log('='.repeat(60));
    
    console.log('\n🔊 Logs de consola capturados:');
    console.log('='.repeat(60));
    if (logs.length > 0) {
      logs.forEach(log => console.log(log));
    } else {
      console.log('⚠️  No se capturaron logs de CarCard/RPC');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

checkHyundaiPrice().catch(console.error);
