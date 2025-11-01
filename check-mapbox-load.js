const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log(`[${msg.type()}]`, text);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ PAGE ERROR:', error.message);
  });
  
  await page.goto('https://326e5eee.autorenta-web.pages.dev/cars/list', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });
  
  await page.waitForTimeout(5000);
  
  console.log('\n📋 RESUMEN:');
  console.log(`Total logs: ${logs.length}`);
  console.log(`Total errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORES:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  await browser.close();
})();
