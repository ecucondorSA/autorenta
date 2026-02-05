import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

// Capture ALL console logs
const allLogs = [];
page.on('console', msg => {
  allLogs.push({ type: msg.type(), text: msg.text() });
});

// Clear and navigate to bookings
await page.goto('about:blank');
console.log('Navigating to /bookings...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'domcontentloaded', timeout: 60000 });

// Wait for initialization
await page.waitForTimeout(3000);

// Check final state
const state = await page.evaluate(() => ({
  splash: !!document.querySelector('app-splash-screen .fixed.inset-0'),
  bookings: !!document.querySelector('app-bookings-hub'),
  url: window.location.href
}));

console.log('\n--- Final state on /bookings ---');
console.log('Splash visible:', state.splash);
console.log('Bookings visible:', state.bookings);
console.log('URL:', state.url);

console.log('\n--- Console logs (filtered for splash) ---');
allLogs.filter(l => l.text.includes('Splash') || l.text.includes('splash') || l.text.includes('[SplashService]')).forEach(l => console.log(`[${l.type}] ${l.text}`));

console.log('\n--- All console logs ---');
allLogs.forEach(l => console.log(`[${l.type}] ${l.text.substring(0, 200)}`));

await browser.close();
