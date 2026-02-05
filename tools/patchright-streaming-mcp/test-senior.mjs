import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();
await page.goto('http://localhost:4200/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);

const state = await page.evaluate(() => ({
  splash: !!document.querySelector('app-splash-screen .fixed.inset-0'),
  bookings: !!document.querySelector('app-bookings-hub')
}));

console.log('Splash:', state.splash, '| Bookings:', state.bookings);
console.log(state.splash === false && state.bookings ? '✅ SENIOR REFACTOR WORKS!' : '❌ FAILED');

await page.screenshot({ path: '/tmp/senior-test.jpg', quality: 85 });
await browser.close();
