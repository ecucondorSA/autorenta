#!/usr/bin/env node
import { chromium } from 'playwright';
import { resolve } from 'path';

const email = process.argv[2] || 'ecucondor@gmail.com';
const password = process.argv[3] || 'Ab.12345';
const targetUrl = process.argv[4] || 'http://localhost:4200/cars/publish';
const outputPath = process.argv[5] || './screenshots/authenticated-page.png';

async function main() {
  console.log(`🔐 Logging in as ${email}...`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 1200 }
  });

  try {
    // Navigate to login
    await page.goto('http://localhost:4200/auth/login', {
      waitUntil: 'load',
      timeout: 20000
    });
    await page.waitForTimeout(2000);

    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForTimeout(3000);

    // Navigate to target page
    console.log(`🚀 Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'load',
      timeout: 20000
    });
    await page.waitForTimeout(3000);

    // Scroll down to see the form
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);

    // Take screenshot
    const fullPath = resolve(outputPath);
    await page.screenshot({ path: fullPath, fullPage: true });

    console.log(`✅ Screenshot saved: ${fullPath}`);

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

main();
