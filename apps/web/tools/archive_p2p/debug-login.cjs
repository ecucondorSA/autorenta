
const { chromium } = require('patchright');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting Patchright debug session for Login Loop...');
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Expose binding for logging
  await page.exposeFunction('logFromBrowser', (text) => console.log(`[BROWSER] ${text}`));

  // Capture Navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
        console.log(`[NAVIGATION] Navigated to: ${frame.url()}`);
    }
  });

  try {
    console.log('🌐 Navigating to http://localhost:4200/auth/login ...');
    await page.goto('http://localhost:4200/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'login-debug-initial.png' });

    // Check innerHTML of app-root
    const hasAppRoot = await page.$('app-root');
    if (hasAppRoot) {
        const innerHTML = await page.$eval('app-root', el => el.innerHTML.substring(0, 500));
        console.log(`📄 app-root HTML (first 500 chars): ${innerHTML}`);
    } else {
        console.log('⚠️ No app-root found');
    }

    const content = await page.content();
    fs.writeFileSync('debug-page.html', content);
    console.log('📄 Saved page content to debug-page.html');

    console.log('⏳ Waiting 5 seconds...');
    await page.waitForTimeout(5000);

    console.log('📸 Taking final screenshot...');
    await page.screenshot({ path: 'login-debug.png', fullPage: true });

  } catch (err) {
    console.error('❌ Error during navigation:', err);
  } finally {
    await browser.close();
    console.log('🏁 Debug session finished.');
  }
})();
