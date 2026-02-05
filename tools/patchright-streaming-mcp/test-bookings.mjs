import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

console.log('Navigating to bookings...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'networkidle', timeout: 60000 });

console.log('Waiting 5s...');
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/bookings-5s.jpg', quality: 85 });

console.log('Waiting 10s...');
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/bookings-10s.jpg', quality: 85 });

console.log('Waiting 15s...');
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/bookings-15s.jpg', quality: 85 });

console.log('Done!');
await browser.close();
