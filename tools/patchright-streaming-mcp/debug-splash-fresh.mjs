import { chromium } from 'patchright';

// Use a FRESH profile
const browser = await chromium.launchPersistentContext('/tmp/fresh-patchright-profile', {
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
  console.log(`>>> [${msg.type()}] ${text}`);
});

console.log('Navigating to / ...');
await page.goto('http://localhost:4200/', { waitUntil: 'networkidle', timeout: 60000 });

console.log('Waiting 5 seconds...');
await page.waitForTimeout(5000);

// Check final state
const state = await page.evaluate(() => ({
  splash: !!document.querySelector('app-splash-screen .fixed.inset-0'),
  url: window.location.href
}));

console.log('\n--- Final state ---');
console.log('Splash visible:', state.splash);
console.log('URL:', state.url);

await browser.close();
