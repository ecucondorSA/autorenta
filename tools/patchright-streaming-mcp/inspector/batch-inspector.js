#!/usr/bin/env node
/**
 * 🔬 BATCH INSPECTOR - Fast page inspection
 *
 * Usage: node batch-inspector.js [module] [baseUrl]
 * Modules: admin, bookings, cars, profile, wallet, auth, static, other, all
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getPagesByModule } from './pages-config.js';

const MODULE = process.argv[2] || 'admin';
const BASE_URL = process.argv[3] || 'https://autorentar.com';
const OUTPUT_DIR = join(process.cwd(), `inspector/output-phase2/${MODULE}`);
const SCREENSHOT_DIR = join(OUTPUT_DIR, 'screenshots');

// Ensure directories exist
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PAGES = getPagesByModule(MODULE);
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();
const results = {
  module: MODULE,
  baseUrl: BASE_URL,
  timestamp: new Date().toISOString(),
  pages: [],
  errors: [],
  summary: { total: PAGES.length, success: 0, failed: 0, skipped: 0 }
};

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
  return new Promise((resolve, reject) => {
    const serverPath = join(process.cwd(), 'server.js');
    serverProcess = spawn('node', [serverPath], {
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

    serverProcess.on('error', reject);
    setTimeout(() => resolve(), 2000);
  });
}

async function inspectPage(page) {
  const url = `${BASE_URL}${page.path}`;
  const startTime = Date.now();

  try {
    // Navigate
    await sendRequest('tools/call', {
      name: 'stream_navigate',
      arguments: { url }
    });

    // Wait for load
    await new Promise(r => setTimeout(r, 2000));

    // Get title
    const titleResult = await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: { script: 'document.title' }
    });

    // Screenshot
    const screenshotResult = await sendRequest('tools/call', {
      name: 'stream_screenshot',
      arguments: { compress: true }
    });

    // Copy screenshot to output dir if successful
    const screenshotPath = join(SCREENSHOT_DIR, `${page.name}.jpg`);
    if (screenshotResult?.content?.[0]?.text) {
      try {
        const tempPath = screenshotResult.content[0].text.match(/path:\s*([^\s,]+)/)?.[1];
        if (tempPath && existsSync(tempPath)) {
          const fs = await import('fs');
          fs.copyFileSync(tempPath, screenshotPath);
        }
      } catch (e) { /* ignore copy errors */ }
    }

    // Get current URL (check for redirects)
    const currentUrl = await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: { script: 'window.location.href' }
    });

    const loadTime = Date.now() - startTime;
    const title = titleResult?.content?.[0]?.text || 'Unknown';
    const finalUrl = currentUrl?.content?.[0]?.text || url;

    // Check if redirected to login
    const redirectedToLogin = finalUrl.includes('/auth/login') || finalUrl.includes('login');
    const hasLoginModal = title.includes('Ingresar') || title.includes('Login');

    return {
      name: page.name,
      path: page.path,
      url,
      finalUrl,
      title,
      loadTime,
      screenshot: `${page.name}.jpg`,
      status: redirectedToLogin || hasLoginModal ? 'auth_required' : 'success',
      requiresAuth: page.requiresAuth,
      requiresAdmin: page.requiresAdmin || false
    };
  } catch (error) {
    return {
      name: page.name,
      path: page.path,
      url,
      error: error.message,
      status: 'error',
      loadTime: Date.now() - startTime
    };
  }
}

async function doLogin() {
  log('🔐', 'Performing login...', 'cyan');

  try {
    // Navigate to login
    await sendRequest('tools/call', {
      name: 'stream_navigate',
      arguments: { url: `${BASE_URL}/auth/login` }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Click Ingresar button using JS
    await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: {
        expression: `
          const btn = Array.from(document.querySelectorAll('button, ion-button, a'))
            .find(el => el.textContent?.includes('Ingresar'));
          if (btn) { btn.click(); return true; }
          return false;
        `
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // Fill email
    await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: {
        expression: `
          const email = document.querySelector('input[type="email"], input[name="email"], input[formcontrolname="email"]');
          if (email) { email.value = 'ecucondor@gmail.com'; email.dispatchEvent(new Event('input', {bubbles:true})); return true; }
          return false;
        `
      }
    });

    // Fill password
    await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: {
        expression: `
          const pwd = document.querySelector('input[type="password"]');
          if (pwd) { pwd.value = 'Ab.12345'; pwd.dispatchEvent(new Event('input', {bubbles:true})); return true; }
          return false;
        `
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Submit
    await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: {
        expression: `
          const form = document.querySelector('form');
          const submit = document.querySelector('button[type="submit"], ion-button[type="submit"]');
          if (submit) { submit.click(); return 'button'; }
          if (form) { form.submit(); return 'form'; }
          return false;
        `
      }
    });

    // Wait for redirect
    await new Promise(r => setTimeout(r, 3000));

    const url = await sendRequest('tools/call', {
      name: 'stream_evaluate',
      arguments: { expression: 'window.location.href' }
    });

    const isLoggedIn = !url?.content?.[0]?.text?.includes('/auth/login');
    log(isLoggedIn ? '✅' : '❌', `Login ${isLoggedIn ? 'successful' : 'failed'}`, isLoggedIn ? 'green' : 'red');
    return isLoggedIn;
  } catch (error) {
    log('❌', `Login error: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  🔬 BATCH INSPECTOR - Module: ${MODULE.toUpperCase()}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Pages to inspect: ${PAGES.length}`);
  console.log(`  Output: ${OUTPUT_DIR}\n`);

  try {
    log('🚀', 'Starting MCP server...', 'cyan');
    await startServer();
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'batch-inspector', version: '1.0.0' }
    });
    log('✅', 'Server ready', 'green');

    // Launch browser
    log('🌐', 'Launching browser...', 'cyan');
    await sendRequest('tools/call', {
      name: 'stream_launch',
      arguments: { headless: false }
    });

    // Login first if needed
    const needsAuth = PAGES.some(p => p.requiresAuth);
    if (needsAuth) {
      await doLogin();
    }

    // Inspect each page
    for (let i = 0; i < PAGES.length; i++) {
      const page = PAGES[i];
      log('📄', `[${i + 1}/${PAGES.length}] ${page.name}: ${page.path}`, 'blue');

      const result = await inspectPage(page);
      results.pages.push(result);

      if (result.status === 'success') {
        results.summary.success++;
        log('✅', `${result.title} (${result.loadTime}ms)`, 'green');
      } else if (result.status === 'auth_required') {
        results.summary.skipped++;
        log('🔒', `Auth required - ${result.finalUrl}`, 'yellow');
      } else {
        results.summary.failed++;
        results.errors.push({ page: page.name, error: result.error });
        log('❌', `Error: ${result.error}`, 'red');
      }
    }

    // Generate report
    const reportPath = join(OUTPUT_DIR, 'report.json');
    writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Generate markdown summary
    const mdReport = generateMarkdownReport(results);
    writeFileSync(join(OUTPUT_DIR, 'README.md'), mdReport);

    console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  Summary${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
    console.log(`  ✅ Success: ${results.summary.success}`);
    console.log(`  🔒 Auth required: ${results.summary.skipped}`);
    console.log(`  ❌ Failed: ${results.summary.failed}`);
    console.log(`\n  📁 Report: ${reportPath}`);

  } catch (error) {
    log('❌', `Fatal error: ${error.message}`, 'red');
    results.errors.push({ fatal: error.message });
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

function generateMarkdownReport(results) {
  let md = `# 🔬 Batch Inspection Report - ${results.module.toUpperCase()}\n\n`;
  md += `> Generated: ${results.timestamp}\n`;
  md += `> Base URL: ${results.baseUrl}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Pages | ${results.summary.total} |\n`;
  md += `| Success | ${results.summary.success} |\n`;
  md += `| Auth Required | ${results.summary.skipped} |\n`;
  md += `| Failed | ${results.summary.failed} |\n\n`;

  md += `## Pages\n\n`;
  md += `| Page | Path | Status | Load Time | Title |\n`;
  md += `|------|------|--------|-----------|-------|\n`;

  for (const page of results.pages) {
    const status = page.status === 'success' ? '✅' : page.status === 'auth_required' ? '🔒' : '❌';
    const loadTime = page.loadTime ? `${page.loadTime}ms` : '-';
    const title = page.title || page.error || '-';
    md += `| ${page.name} | ${page.path} | ${status} | ${loadTime} | ${title.substring(0, 40)} |\n`;
  }

  if (results.errors.length > 0) {
    md += `\n## Errors\n\n`;
    for (const err of results.errors) {
      md += `- **${err.page || 'Fatal'}**: ${err.error || err.fatal}\n`;
    }
  }

  md += `\n## Screenshots\n\n`;
  md += `Screenshots saved in \`./screenshots/\` directory.\n`;

  return md;
}

main().catch(console.error);
