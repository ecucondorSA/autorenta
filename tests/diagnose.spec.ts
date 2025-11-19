import { test, expect, Page } from '@playwright/test';

test.describe('Diagnostic Report', () => {
  let consoleMessages: any[] = [];
  let networkErrors: any[] = [];
  let pageErrors: any[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    networkErrors = [];
    pageErrors = [];

    // Track console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Track network errors
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Track page errors
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });
  });

  test('Load homepage and capture diagnostics', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });

    // Wait for initial load
    await page.waitForTimeout(3000);

    // Print console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      errors.forEach(e => {
        console.log(`  [${e.type}] ${e.text}`);
      });
    } else {
      console.log('✅ No console errors');
    }

    // Print console warnings
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    if (warnings.length > 0) {
      console.log(`\n⚠️  CONSOLE WARNINGS (${warnings.length}):`);
      warnings.slice(0, 5).forEach(w => {
        console.log(`  - ${w.text}`);
      });
      if (warnings.length > 5) {
        console.log(`  ... and ${warnings.length - 5} more`);
      }
    }

    // Print network errors
    if (networkErrors.length > 0) {
      console.log(`\n❌ NETWORK ERRORS (${networkErrors.length}):`);
      networkErrors.forEach(e => {
        console.log(`  [${e.status}] ${e.statusText}`);
        console.log(`    ${e.url}`);
      });
    } else {
      console.log('✅ All network requests successful');
    }

    // Print page errors
    if (pageErrors.length > 0) {
      console.log(`\n❌ PAGE RUNTIME ERRORS (${pageErrors.length}):`);
      pageErrors.forEach(e => {
        console.log(`  - ${e.message}`);
      });
    } else {
      console.log('✅ No page runtime errors');
    }

    expect(errors.length).toBe(0);
    expect(pageErrors.length).toBe(0);
  });
});
