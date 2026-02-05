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
  const text = msg.text();
  allLogs.push({ type: msg.type(), text });
  // Print immediately
  if (text.includes('AppComponent') || text.includes('SplashService') || text.includes('ngOnInit')) {
    console.log(`>>> [${msg.type()}] ${text}`);
  }
});

// Clear page completely
await page.goto('about:blank');
await page.waitForTimeout(500);

console.log('Navigating to /bookings...');
await page.goto('http://localhost:4200/bookings', { waitUntil: 'networkidle', timeout: 60000 });

console.log('Waiting 5 seconds...');
await page.waitForTimeout(5000);

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

console.log('\n--- ALL console logs ---');
allLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

await browser.close();
