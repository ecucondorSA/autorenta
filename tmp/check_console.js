const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('--- Navigating to http://localhost:3000 ---');

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));
  page.on('requestfailed', request => {
    console.log('NETWORK ERROR:', request.url(), request.failure().errorText);
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    // Wait a bit more to ensure everything loads
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error('Navigation failed:', e);
  }

  console.log('--- Check complete ---');
  await browser.close();
})();
