import { chromium } from '@playwright/test';

const url = 'https://b7c2d053.autorenta-web.pages.dev';
console.log('Testing:', url);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
    console.log('ERROR:', msg.text());
  }
});

page.on('pageerror', error => {
  console.log('PAGE ERROR:', error.message);
  errors.push(error.message);
});

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/home/edu/autorenta/screenshot.png' });
  console.log('Screenshot saved');
  
  const hasEnv = await page.evaluate(() => typeof window.__env !== 'undefined');
  console.log('window.__env exists:', hasEnv);
  
  if (hasEnv) {
    const env = await page.evaluate(() => window.__env);
    console.log('Environment:', JSON.stringify(env, null, 2));
  }
  
  console.log('Total errors:', errors.length);
} catch (error) {
  console.error('Fatal error:', error.message);
}

await browser.close();
