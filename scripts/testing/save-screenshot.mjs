#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const url = process.argv[2] || 'http://localhost:4200';
const outputPath = process.argv[3] || './screenshots/screenshot.png';
const fullPage = process.argv[4] === 'true';

async function captureScreenshot() {
  console.log(`Capturing screenshot of ${url}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait a bit for any animations
  await page.waitForTimeout(1000);

  const screenshot = await page.screenshot({
    path: resolve(outputPath),
    fullPage
  });

  console.log(`Screenshot saved to: ${resolve(outputPath)}`);

  await browser.close();
  return resolve(outputPath);
}

captureScreenshot().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
