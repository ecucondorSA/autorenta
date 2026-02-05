import { chromium } from 'patchright';

// Use a FRESH profile (no auth session)
const browser = await chromium.launchPersistentContext('/tmp/fresh-patchright-profile2', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

console.log('Navigating to /bookings (no auth)...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'networkidle', timeout: 60000 });

console.log('Waiting 5 seconds...');
await page.waitForTimeout(5000);

// Check final state
const state = await page.evaluate(() => ({
  splash: !!document.querySelector('app-splash-screen .fixed.inset-0'),
  bookings: !!document.querySelector('app-bookings-hub'),
  login: !!document.querySelector('[routerlink*="login"]') || document.body.innerText.includes('Iniciar') || document.body.innerText.includes('Login'),
  url: window.location.href
}));

console.log('\n--- Final state ---');
console.log('Splash visible:', state.splash);
console.log('Bookings visible:', state.bookings);
console.log('Login visible:', state.login);
console.log('URL:', state.url);

await page.screenshot({ path: '/tmp/fresh-bookings.jpg', quality: 85 });
console.log('Screenshot saved to /tmp/fresh-bookings.jpg');

await browser.close();
