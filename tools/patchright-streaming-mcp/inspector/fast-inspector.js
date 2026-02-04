#!/usr/bin/env node
/**
 * 🚀 FAST INSPECTOR - Quick navigation + screenshots
 * No AI verification, just captures pages rapidly
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.argv[2] || 'https://autorentar.com';
const OUTPUT_DIR = join(process.cwd(), 'inspector/output-fast');
const SCREENSHOT_DIR = join(OUTPUT_DIR, 'screenshots');

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// All authenticated pages to inspect
const PAGES = [
  // Profile
  { name: 'profile', path: '/profile' },
  { name: 'profile_personal', path: '/profile/personal' },
  { name: 'profile_contact', path: '/profile/contact' },
  { name: 'profile_preferences', path: '/profile/preferences' },
  { name: 'profile_security', path: '/profile/security' },
  { name: 'profile_verification', path: '/profile/verification' },
  { name: 'profile_driving', path: '/profile/driving-stats' },
  { name: 'notifications_settings', path: '/profile/notifications-settings' },

  // Dashboard
  { name: 'dashboard', path: '/dashboard' },
  { name: 'dashboard_earnings', path: '/dashboard/earnings' },
  { name: 'dashboard_stats', path: '/dashboard/stats' },
  { name: 'dashboard_calendar', path: '/dashboard/calendar' },
  { name: 'dashboard_reviews', path: '/dashboard/reviews' },
  { name: 'payouts', path: '/payouts' },

  // Bookings
  { name: 'bookings', path: '/bookings' },
  { name: 'reviews_pending', path: '/reviews/pending' },

  // Cars
  { name: 'cars_browse', path: '/cars' },
  { name: 'cars_list', path: '/cars/list' },
  { name: 'cars_my', path: '/cars/my' },
  { name: 'cars_publish', path: '/cars/publish' },
  { name: 'cars_compare', path: '/cars/compare' },

  // Wallet
  { name: 'wallet', path: '/wallet' },
  { name: 'wallet_club', path: '/wallet/club/plans' },

  // Other
  { name: 'referrals', path: '/referrals' },
  { name: 'verification', path: '/verification' },
  { name: 'onboarding', path: '/onboarding' },
  { name: 'protections', path: '/protections' },
  { name: 'favorites', path: '/favorites' },
  { name: 'messages', path: '/messages' },
  { name: 'notifications', path: '/notifications' },
];

const colors = { reset: '\x1b[0m', green: '\x1b[32m', blue: '\x1b[34m', cyan: '\x1b[36m', red: '\x1b[31m', yellow: '\x1b[33m', dim: '\x1b[2m' };
let messageId = 0, serverProcess = null, rl = null;
const pendingRequests = new Map();
const results = { pages: [], errors: [], performance: [] };

function log(icon, msg, color = 'reset') {
  console.log(`${colors[color]}${icon} ${msg}${colors.reset}`);
}

async function sendRequest(method, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const msg = { jsonrpc: '2.0', id: ++messageId, method, params };
    const timeout = setTimeout(() => {
      pendingRequests.delete(msg.id);
      reject(new Error(`Timeout: ${method}`));
    }, timeoutMs);
    pendingRequests.set(msg.id, { resolve, reject, timeout });
    serverProcess.stdin.write(JSON.stringify(msg) + '\n');
  });
}

async function startServer() {
  return new Promise((resolve) => {
    serverProcess = spawn('node', [join(process.cwd(), 'server.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    rl = createInterface({ input: serverProcess.stdout });
    rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        if (response.id && pendingRequests.has(response.id)) {
          const { resolve, reject, timeout } = pendingRequests.get(response.id);
          clearTimeout(timeout);
          pendingRequests.delete(response.id);
          if (response.error) reject(new Error(response.error.message));
          else resolve(response.result);
        }
      } catch (e) {}
    });
    setTimeout(resolve, 2000);
  });
}

async function evaluate(script) {
  const result = await sendRequest('tools/call', { name: 'stream_evaluate', arguments: { script } });
  return result?.content?.[0]?.text || '';
}

async function navigate(url) {
  await sendRequest('tools/call', { name: 'stream_navigate', arguments: { url } });
}

async function screenshot(name) {
  const result = await sendRequest('tools/call', { name: 'stream_screenshot', arguments: { compress: true } });
  const text = result?.content?.[0]?.text || '';
  const match = text.match(/path:\s*([^\s,\n]+)/);
  if (match && existsSync(match[1])) {
    copyFileSync(match[1], join(SCREENSHOT_DIR, `${name}.jpg`));
    return true;
  }
  return false;
}

async function doLogin() {
  log('🔐', 'Logging in...', 'cyan');
  await navigate(`${BASE_URL}/auth/login`);
  await new Promise(r => setTimeout(r, 2000));

  // Click Ingresar
  await evaluate(`
    const btn = Array.from(document.querySelectorAll('button, ion-button, a'))
      .find(el => el.textContent?.trim() === 'Ingresar');
    if (btn) btn.click();
  `);
  await new Promise(r => setTimeout(r, 1500));

  // Fill form
  await evaluate(`
    const email = document.querySelector('input[type="email"], input[formcontrolname="email"]');
    const pwd = document.querySelector('input[type="password"]');
    if (email) { email.value = 'ecucondor@gmail.com'; email.dispatchEvent(new Event('input', {bubbles:true})); }
    if (pwd) { pwd.value = 'Ab.12345'; pwd.dispatchEvent(new Event('input', {bubbles:true})); }
  `);
  await new Promise(r => setTimeout(r, 500));

  // Submit
  await evaluate(`
    const submit = document.querySelector('button[type="submit"], ion-button[type="submit"]');
    if (submit) submit.click();
  `);
  await new Promise(r => setTimeout(r, 3000));

  const url = await evaluate('window.location.href');
  const success = !url.includes('/auth/login');
  log(success ? '✅' : '❌', success ? 'Login OK' : 'Login failed', success ? 'green' : 'red');
  return success;
}

async function inspectPage(page, index, total) {
  const url = `${BASE_URL}${page.path}`;
  const start = Date.now();

  try {
    await navigate(url);
    await new Promise(r => setTimeout(r, 1500)); // Wait for page load

    const [title, currentUrl] = await Promise.all([
      evaluate('document.title'),
      evaluate('window.location.href')
    ]);

    const loadTime = Date.now() - start;
    const redirectedToLogin = currentUrl.includes('/auth/login');

    await screenshot(page.name);

    const status = redirectedToLogin ? '🔒' : '✅';
    const statusText = redirectedToLogin ? 'auth' : `${loadTime}ms`;
    log(status, `[${index}/${total}] ${page.name} - ${statusText}`, redirectedToLogin ? 'yellow' : 'green');

    return { name: page.name, path: page.path, loadTime, title: title.replace(/📜.*?"([^"]+)".*/, '$1'), redirectedToLogin, success: !redirectedToLogin };
  } catch (error) {
    log('❌', `[${index}/${total}] ${page.name} - ${error.message}`, 'red');
    return { name: page.name, path: page.path, error: error.message, success: false };
  }
}

async function main() {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  🚀 FAST INSPECTOR${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  Pages: ${PAGES.length}`);
  console.log(`  Output: ${OUTPUT_DIR}\n`);

  try {
    log('🚀', 'Starting server...', 'cyan');
    await startServer();
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'fast-inspector', version: '1.0.0' }
    });
    log('✅', 'Server ready', 'green');

    log('🌐', 'Launching browser...', 'cyan');
    await sendRequest('tools/call', { name: 'stream_launch', arguments: { headless: false } });

    await doLogin();

    console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  Inspecting ${PAGES.length} pages${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);

    for (let i = 0; i < PAGES.length; i++) {
      const result = await inspectPage(PAGES[i], i + 1, PAGES.length);
      results.pages.push(result);
      if (result.loadTime) results.performance.push({ name: result.name, loadTime: result.loadTime });
    }

    // Generate report
    const successful = results.pages.filter(p => p.success).length;
    const authRequired = results.pages.filter(p => p.redirectedToLogin).length;
    const failed = results.pages.filter(p => p.error).length;

    const avgLoadTime = results.performance.length > 0
      ? Math.round(results.performance.reduce((a, b) => a + b.loadTime, 0) / results.performance.length)
      : 0;

    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      summary: { total: PAGES.length, successful, authRequired, failed, avgLoadTime },
      pages: results.pages,
      performance: results.performance.sort((a, b) => b.loadTime - a.loadTime)
    };

    writeFileSync(join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

    // Markdown report
    let md = `# 🚀 Fast Inspection Report\n\n`;
    md += `> ${new Date().toISOString()}\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total | ${PAGES.length} |\n`;
    md += `| Success | ${successful} |\n`;
    md += `| Auth Required | ${authRequired} |\n`;
    md += `| Failed | ${failed} |\n`;
    md += `| Avg Load Time | ${avgLoadTime}ms |\n\n`;

    md += `## Performance\n\n`;
    md += `| Page | Load Time | Status |\n|------|-----------|--------|\n`;
    for (const p of results.pages) {
      const status = p.success ? '✅' : p.redirectedToLogin ? '🔒' : '❌';
      const time = p.loadTime ? `${p.loadTime}ms` : '-';
      md += `| ${p.name} | ${time} | ${status} |\n`;
    }

    writeFileSync(join(OUTPUT_DIR, 'README.md'), md);

    console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  Summary${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
    console.log(`  ✅ Success: ${successful}`);
    console.log(`  🔒 Auth required: ${authRequired}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏱️  Avg load: ${avgLoadTime}ms`);
    console.log(`\n  📁 ${OUTPUT_DIR}`);

  } catch (error) {
    log('❌', `Fatal: ${error.message}`, 'red');
  } finally {
    if (serverProcess) serverProcess.kill();
  }
}

main().catch(console.error);
