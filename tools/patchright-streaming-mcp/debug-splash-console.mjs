import { chromium } from 'patchright';

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();

// Collect console logs
const consoleLogs = [];
page.on('console', msg => {
  consoleLogs.push({ type: msg.type(), text: msg.text() });
});

// Navigate
await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded', timeout: 60000 });

// Wait for app to initialize
await page.waitForTimeout(3000);

console.log('--- Console logs ---');
consoleLogs.forEach(log => {
  if (log.type === 'error' || log.text.includes('splash') || log.text.includes('Splash') || log.text.includes('ERROR')) {
    console.log(`[${log.type}]`, log.text);
  }
});

// Check final state
const state = await page.evaluate(() => ({
  splash: !!document.querySelector('app-splash-screen .fixed.inset-0'),
  appRoot: !!document.querySelector('app-root'),
  url: window.location.href
}));

console.log('\n--- Final state ---');
console.log('Splash visible:', state.splash);
console.log('App root:', state.appRoot);
console.log('URL:', state.url);

// Check if there are any errors in the console about signals or injection
console.log('\n--- All errors ---');
consoleLogs.filter(l => l.type === 'error').forEach(l => console.log(l.text));

await browser.close();
