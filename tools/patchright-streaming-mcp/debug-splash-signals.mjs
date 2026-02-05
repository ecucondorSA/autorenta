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

await page.waitForTimeout(3000);

const state = await page.evaluate(() => {
  const body = document.body;
  return {
    appInit: body.getAttribute('data-app-init'),
    splashScheduled: body.getAttribute('data-splash-scheduled'),
    splashTimeoutFired: body.getAttribute('data-splash-timeout-fired'),
    fadeoutBefore: body.getAttribute('data-splash-fadeout-before'),
    fadeoutAfter: body.getAttribute('data-splash-fadeout-after'),
    visibleBefore: body.getAttribute('data-splash-visible-before'),
    visibleAfter: body.getAttribute('data-splash-visible-after'),
    splashDOMVisible: !!document.querySelector('app-splash-screen .fixed.inset-0'),
    splashHasOpacity0: document.querySelector('app-splash-screen .fixed.inset-0')?.classList.contains('opacity-0')
  };
});

console.log('\n--- Signal State ---');
console.log(JSON.stringify(state, null, 2));

await browser.close();
