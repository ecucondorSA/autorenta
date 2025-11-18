#!/usr/bin/env node
import fs from 'fs';
import { chromium } from 'playwright';

async function main() {
  const ws = process.env.CDP_WS || process.env.PLAYWRIGHT_CDP_WS || 'http://127.0.0.1:9222';
  console.log('Connecting to CDP at', ws);

  const browser = await chromium.connectOverCDP(ws);
  try {
    const contexts = browser.contexts();
    let totalPages = 0;
    for (const ctx of contexts) {
      const pages = ctx.pages();
      totalPages += pages.length;
    }
    console.log('Existing contexts:', contexts.length, 'total pages:', totalPages);

    for (let i = 0; i < contexts.length; i++) {
      const pages = contexts[i].pages();
      for (let j = 0; j < pages.length; j++) {
        console.log(`- context[${i}] page[${j}]: ${pages[j].url()}`);
      }
    }

    // create new context/page and navigate to app
    const context = await browser.newContext();
    const page = await context.newPage();
    const targetUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
    console.log('Navigating to', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // evaluate user agent and title
    try {
      const ua = await page.evaluate(() => navigator.userAgent);
      const title = await page.title();
      console.log('Page title:', title);
      console.log('User agent:', ua);
    } catch (e) {
      console.warn('Could not evaluate page properties:', e.message || e);
    }

    // take screenshot
    const outDir = 'tmp';
    fs.mkdirSync(outDir, { recursive: true });
    const out = `${outDir}/cdp-screenshot.png`;
    await page.screenshot({ path: out, fullPage: true });
    console.log('Saved screenshot ->', out);

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error in cdp-info:', err);
  process.exit(1);
});
