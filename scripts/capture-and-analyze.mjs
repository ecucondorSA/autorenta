#!/usr/bin/env node
import { chromium } from 'playwright';
import { resolve } from 'path';

const url = process.argv[2] || 'http://localhost:4200';
const outputPath = process.argv[3] || './screenshots/ui-analysis.png';

async function main() {
  console.log(`🚀 Capturing: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  try {
    // Navigate with shorter timeout, don't wait for networkidle
    await page.goto(url, {
      waitUntil: 'load',
      timeout: 20000
    });

    // Wait for main content to appear
    await page.waitForTimeout(2000);

    // Take screenshot
    const fullPath = resolve(outputPath);
    await page.screenshot({ path: fullPath });

    console.log(`✅ Screenshot saved: ${fullPath}`);

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

main();
