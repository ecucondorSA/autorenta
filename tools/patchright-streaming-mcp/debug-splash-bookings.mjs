import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

// First clear the page
await page.goto('about:blank');
await page.waitForTimeout(500);

// Now navigate directly to bookings (like the test does)
console.log('Navigating directly to /bookings...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });

console.log('--- Checking splash state over time on /bookings ---');

for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const fixedDiv = document.querySelector('app-splash-screen .fixed.inset-0');
    return {
      hasFixedDiv: !!fixedDiv,
      fadeOut: fixedDiv ? fixedDiv.classList.contains('opacity-0') : null,
      url: window.location.href
    };
  });

  console.log(`[${(i+1)*500}ms]`, JSON.stringify(state));
}

await browser.close();
