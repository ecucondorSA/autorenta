import { chromium } from 'patchright';
import { writeFileSync, mkdirSync } from 'fs';

const PAGES = [
  { name: 'profile', path: '/profile', waitFor: '.flex.items-center.gap-3', delay: 3000 },
  { name: 'profile_personal', path: '/profile/personal', waitFor: 'form', delay: 3000 },
  { name: 'profile_contact', path: '/profile/contact', waitFor: 'input', delay: 3000 },
  { name: 'profile_preferences', path: '/profile/preferences', waitFor: 'h1', delay: 3000 },
  { name: 'profile_security', path: '/profile/security', waitFor: 'h1', delay: 3000 },
  { name: 'dashboard', path: '/dashboard', waitFor: '[class*="widget"], [class*="card"], [class*="stat"]', delay: 8000 },
  { name: 'dashboard_calendar', path: '/dashboard/calendar', waitFor: '[class*="calendar"]', delay: 5000 },
  { name: 'cars', path: '/cars', waitFor: '[class*="hero"], [class*="search"]', delay: 3000 },
  { name: 'cars_my', path: '/cars/my', waitFor: 'h1', delay: 4000 },
  { name: 'cars_publish', path: '/cars/publish', waitFor: 'h1, form', delay: 5000 },
  { name: 'bookings', path: '/bookings', waitFor: '[class*="booking"], [class*="empty"], h1', delay: 8000 },
  { name: 'wallet', path: '/wallet', waitFor: '[class*="saldo"], [class*="balance"]', delay: 4000 },
  { name: 'payouts', path: '/payouts', waitFor: 'h1', delay: 4000 },
  { name: 'messages', path: '/messages', waitFor: '[class*="message"], [class*="empty"]', delay: 4000 },
  { name: 'notifications', path: '/notifications', waitFor: 'h1', delay: 3000 },
  { name: 'favorites', path: '/favorites', waitFor: '[class*="favorite"], [class*="empty"]', delay: 3000 },
  { name: 'referrals', path: '/referrals', waitFor: 'h1', delay: 3000 },
  { name: 'verification', path: '/verification', waitFor: 'h1', delay: 3000 },
];

const OUTPUT_DIR = '/tmp/autorenta-inspection';
mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launchPersistentContext('/home/edu/.patchright-profile', {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1280, height: 800 }
});

const page = browser.pages()[0] || await browser.newPage();
const results = [];

console.log('\n🔍 Inspecting ' + PAGES.length + ' pages (with extended waits)...\n');

for (const pg of PAGES) {
  try {
    const start = Date.now();
    await page.goto('http://localhost:4200' + pg.path, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for splash screen to disappear
    try {
      await page.waitForSelector('app-splash-screen', { state: 'hidden', timeout: 15000 });
    } catch (e) {
      // Splash might not exist
    }

    // Wait for loading indicators to disappear
    try {
      await page.waitForSelector('[class*="loading"], [class*="spinner"], [class*="skeleton"]', { state: 'hidden', timeout: 10000 });
    } catch (e) {
      // No loading indicator
    }

    // Wait for main content
    try {
      await page.waitForSelector(pg.waitFor, { state: 'visible', timeout: 15000 });
    } catch (e) {
      console.log('⚠️  ' + pg.name + ' - selector timeout');
    }

    // Custom delay per page
    await page.waitForTimeout(pg.delay);

    const loadTime = Date.now() - start;
    await page.screenshot({ path: OUTPUT_DIR + '/' + pg.name + '.jpg', quality: 85, fullPage: false });

    results.push({ name: pg.name, path: pg.path, loadTime, status: 'ok' });
    console.log('✅ ' + pg.name + ' - ' + loadTime + 'ms');

  } catch (e) {
    results.push({ name: pg.name, path: pg.path, loadTime: 0, status: 'failed', error: e.message });
    console.log('❌ ' + pg.name + ' - FAILED: ' + e.message.substring(0, 60));
  }
}

// Generate report
let report = '# AutoRenta Visual Inspection Report\n\n';
report += 'Generated: ' + new Date().toISOString() + '\n\n';
report += '## Summary\n';
report += '- Pages inspected: ' + results.length + '\n';
report += '- Passed: ' + results.filter(r => r.status === 'ok').length + '\n';
report += '- Failed: ' + results.filter(r => r.status === 'failed').length + '\n\n';
report += '## Results\n\n';
report += '| Page | Path | Load Time | Status |\n';
report += '|------|------|-----------|--------|\n';
for (const r of results) {
  report += '| ' + r.name + ' | ' + r.path + ' | ' + r.loadTime + 'ms | ' + r.status + ' |\n';
}

writeFileSync(OUTPUT_DIR + '/REPORT.md', report);
console.log('\n📊 Report saved to ' + OUTPUT_DIR + '/REPORT.md');

await browser.close();
