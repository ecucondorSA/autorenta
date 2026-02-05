import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

await page.goto('about:blank');
await page.waitForTimeout(500);

console.log('Navigating to /bookings...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'networkidle', timeout: 60000 });

// Check markers over time
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const body = document.body;
    return {
      appInit: body.getAttribute('data-app-init'),
      splashScheduled: body.getAttribute('data-splash-scheduled'),
      splashTimeoutFired: body.getAttribute('data-splash-timeout-fired'),
      splashVisible: !!document.querySelector('app-splash-screen .fixed.inset-0')
    };
  });

  console.log(`[${(i+1)*500}ms]`, JSON.stringify(state));
}

await browser.close();
