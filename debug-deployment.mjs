#!/usr/bin/env node

import { chromium } from 'playwright';

const PAGES_URL = 'https://6ca12e54.autorenta-web.pages.dev'; // Testing deployment with runtime env.js config

async function debugDeployment() {
  console.log('🔍 Debugging AutoRenta Deployment\n');
  console.log(`URL: ${PAGES_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const logs = [];
  const errors = [];
  const warnings = [];
  const networkErrors = [];

  // Capture console messages
  page.on('console', msg => {
    const log = { type: msg.type(), text: msg.text() };
    logs.push(log);

    if (msg.type() === 'error') {
      errors.push(log.text);
      console.log(`❌ Console Error: ${log.text}`);
    } else if (msg.type() === 'warning') {
      warnings.push(log.text);
      console.log(`⚠️  Console Warning: ${log.text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`🚨 Page Error: ${error.message}`);
  });

  // Capture network failures
  page.on('requestfailed', request => {
    const failure = `${request.url()} - ${request.failure().errorText}`;
    networkErrors.push(failure);
    console.log(`🌐 Network Failed: ${failure}`);
  });

  try {
    console.log('📡 Loading page...\n');
    await page.goto(PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for Angular to potentially load
    await page.waitForTimeout(5000);

    console.log('\n📄 Analyzing page content...\n');

    // Get HTML
    const html = await page.content();
    console.log(`HTML Length: ${html.length} characters`);

    // Check for key elements
    const hasAppRoot = await page.locator('app-root').count();
    const hasScripts = await page.locator('script[src]').count();
    const hasStyles = await page.locator('link[rel="stylesheet"]').count();

    console.log(`app-root elements: ${hasAppRoot}`);
    console.log(`Script tags: ${hasScripts}`);
    console.log(`Stylesheet links: ${hasStyles}`);

    // Get loaded scripts
    console.log('\n📦 Loaded Scripts:');
    const scripts = await page.$$eval('script[src]', scripts =>
      scripts.map(s => s.src)
    );
    scripts.forEach(src => console.log(`  - ${src}`));

    // Get loaded stylesheets
    console.log('\n🎨 Loaded Stylesheets:');
    const styles = await page.$$eval('link[rel="stylesheet"]', links =>
      links.map(l => l.href)
    );
    styles.forEach(href => console.log(`  - ${href}`));

    // Check if Angular loaded
    const ngVersion = await page.evaluate(() => {
      const appRoot = document.querySelector('app-root');
      return appRoot ? appRoot.getAttribute('ng-version') : null;
    });

    console.log(`\nAngular Version: ${ngVersion || 'NOT DETECTED'}`);

    // Get base href
    const baseHref = await page.evaluate(() => {
      const base = document.querySelector('base');
      return base ? base.getAttribute('href') : null;
    });

    console.log(`Base HREF: ${baseHref || 'NOT SET'}`);

    // Screenshot for comparison
    await page.screenshot({
      path: '/home/edu/autorenta/debug-screenshot.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved: debug-screenshot.png');

    // Save HTML for inspection
    const fs = await import('fs');
    fs.writeFileSync('/home/edu/autorenta/debug-page.html', html);
    console.log('📄 HTML saved: debug-page.html');

  } catch (error) {
    console.error(`\n❌ Error during debugging: ${error.message}`);
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('DEBUGGING SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nConsole Errors: ${errors.length}`);
  console.log(`Console Warnings: ${warnings.length}`);
  console.log(`Network Errors: ${networkErrors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  if (networkErrors.length > 0) {
    console.log('\n🌐 NETWORK FAILURES:');
    networkErrors.forEach(e => console.log(`  - ${e}`));
  }

  return { errors, warnings, networkErrors, logs };
}

debugDeployment().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
