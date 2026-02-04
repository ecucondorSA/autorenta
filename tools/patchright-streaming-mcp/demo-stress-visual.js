#!/usr/bin/env node
/**
 * 🔥 AUTORENTA VISUAL STRESS TEST v2
 *
 * FIXED: Espera a que el splash screen desaparezca antes de capturar
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// ========== Configuration ==========
const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    email: 'ecucondor@gmail.com',
    password: 'Ab.12345'
  },
  outputDir: '/tmp/autorenta-stress-report',

  // Wait timings
  splashWaitMs: 500,      // Check interval for splash
  splashTimeoutMs: 15000, // Max wait for splash to disappear
  pageLoadWaitMs: 3000,   // Extra wait after navigation
};

// ========== Setup ==========
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();
const screenshots = [];
const testResults = [];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(icon, msg, color = 'reset') {
  console.log(`${colors[color]}${icon} ${msg}${colors.reset}`);
}

function banner(text, icon = '🔥') {
  const line = '═'.repeat(60);
  console.log(`\n${colors.red}${line}`);
  console.log(`  ${icon} ${text}`);
  console.log(`${line}${colors.reset}\n`);
}

function section(text) {
  console.log(`\n${colors.yellow}▶ ${text}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendRequest(method, params = {}, timeoutMs = 120000) {
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

async function callTool(name, args = {}) {
  const start = Date.now();
  try {
    const response = await sendRequest('tools/call', { name, arguments: args });
    const elapsed = Date.now() - start;
    if (response.error) {
      return { success: false, error: response.error, elapsed };
    }
    const content = response.result?.content || [];
    const text = content.find(c => c.type === 'text')?.text || '';
    const image = content.find(c => c.type === 'image');
    return { success: true, raw: text, image, elapsed };
  } catch (e) {
    return { success: false, error: e.message, elapsed: Date.now() - start };
  }
}

/**
 * Wait for splash screen to disappear and page to be ready
 */
async function waitForPageReady(description = 'page') {
  const start = Date.now();
  let attempts = 0;

  log('⏳', `Waiting for ${description} to load...`, 'blue');

  while (Date.now() - start < CONFIG.splashTimeoutMs) {
    attempts++;

    const check = await callTool('stream_evaluate', {
      script: `
        (function() {
          // Check for common splash/loading indicators
          const splashSelectors = [
            '.splash-screen',
            '.loading-screen',
            '.app-loading',
            'ion-loading',
            '.loading-overlay',
            '[class*="splash"]',
            '[class*="loading"]',
            '.spinner-container',
            'app-splash',
            'ion-spinner[name="crescent"]'
          ];

          // Check if any splash element is visible
          for (const sel of splashSelectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null && getComputedStyle(el).display !== 'none') {
              return { ready: false, reason: 'splash_visible: ' + sel };
            }
          }

          // Check if body is empty or minimal
          const bodyText = document.body?.innerText?.trim() || '';
          if (bodyText.length < 50) {
            return { ready: false, reason: 'body_empty' };
          }

          // Check for main content indicators
          const hasContent = document.querySelector('ion-content, main, [role="main"], .content, ion-list, ion-card');
          if (!hasContent) {
            return { ready: false, reason: 'no_main_content' };
          }

          // Check if any images are still loading
          const images = document.querySelectorAll('img');
          let loadingImages = 0;
          images.forEach(img => {
            if (!img.complete && img.src) loadingImages++;
          });

          return {
            ready: true,
            bodyLength: bodyText.length,
            hasContent: !!hasContent,
            loadingImages,
            url: location.href,
            title: document.title
          };
        })()
      `
    });

    if (check.success && check.raw) {
      try {
        // Parse the result - handle both JSON and string formats
        let result;
        const cleanRaw = check.raw.replace(/⏱️.*$/, '').trim();

        // Try to extract JSON from the response
        const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { ready: cleanRaw.includes('ready": true') || cleanRaw.includes('"ready":true') };
        }

        if (result.ready) {
          log('✅', `${description} ready (${Date.now() - start}ms, ${attempts} checks)`, 'green');
          return true;
        }

        // Not ready yet
        process.stdout.write(`${colors.yellow}.${colors.reset}`);
      } catch (e) {
        // If we can't parse, assume still loading
        process.stdout.write(`${colors.yellow}?${colors.reset}`);
      }
    } else {
      process.stdout.write(`${colors.red}x${colors.reset}`);
    }

    await sleep(CONFIG.splashWaitMs);
  }

  console.log('');
  log('⚠️', `${description} may not be fully loaded (timeout after ${CONFIG.splashTimeoutMs}ms)`, 'yellow');
  return false;
}

/**
 * Navigate and wait for the page to be ready
 */
async function navigateAndWait(url, description) {
  await callTool('stream_navigate', { url, waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000); // Brief initial wait
  await waitForPageReady(description);
  await sleep(500); // Extra settle time
}

async function takeScreenshot(name, description) {
  const r = await callTool('stream_screenshot', { compress: true, fullPage: false });

  if (r.success) {
    const match = r.raw?.match(/Path:\s*([^\n]+)/);
    const path = match ? match[1].trim() : null;

    const filename = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`;
    const filepath = `${CONFIG.outputDir}/${filename}`;

    if (path) {
      try {
        const { copyFileSync } = await import('fs');
        copyFileSync(path, filepath);
        log('📸', `Screenshot: ${name} -> ${filepath}`, 'green');
      } catch (e) {
        log('📸', `Screenshot: ${name} (path: ${path})`, 'green');
      }
    }

    screenshots.push({
      name,
      description,
      filename,
      filepath: path || filepath,
      timestamp: new Date().toISOString(),
      elapsed: r.elapsed,
    });

    return { success: true, path: path || filepath };
  }

  log('❌', `Screenshot failed: ${name}`, 'red');
  return { success: false };
}

function handleServerOutput(line) {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, timeout } = pendingRequests.get(msg.id);
      clearTimeout(timeout);
      pendingRequests.delete(msg.id);
      resolve(msg);
    }
  } catch (e) {}
}

async function startServer() {
  return new Promise((resolve, reject) => {
    log('🚀', 'Starting server...', 'cyan');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let started = false;
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server v1.0 started') && !started) {
        started = true;
        rl = createInterface({ input: serverProcess.stdout });
        rl.on('line', handleServerOutput);
        resolve();
      }
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Server timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'visual-stress-v2', version: '2.0.0' },
  });
}

// ========== Test Functions ==========

async function testLogin() {
  section('1. LOGIN TEST');
  const start = Date.now();

  // Navigate to login
  await navigateAndWait(`${CONFIG.baseUrl}/auth/login`, 'login page');
  await takeScreenshot('01_login_page', 'Login page loaded');

  // Fill email
  log('📧', 'Filling email...', 'blue');
  await callTool('stream_fill', { selector: 'input[type="email"]', text: CONFIG.credentials.email });
  await sleep(500);
  await takeScreenshot('02_email_filled', 'Email field filled');

  // Fill password
  log('🔑', 'Filling password...', 'blue');
  await callTool('stream_fill', { selector: 'input[type="password"]', text: CONFIG.credentials.password });
  await sleep(500);
  await takeScreenshot('03_password_filled', 'Password field filled');

  // Click login
  log('🚀', 'Clicking login...', 'blue');
  await callTool('stream_click', { selector: 'button[type="submit"]' });

  // Wait for login to complete
  await sleep(2000);
  await waitForPageReady('dashboard after login');
  await takeScreenshot('04_after_login', 'After login - should be dashboard or home');

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Login', elapsed, success: true });
  log('✅', `Login completed in ${elapsed}ms`, 'green');
}

async function testDashboard() {
  section('2. DASHBOARD TEST');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/dashboard`, 'dashboard');
  await takeScreenshot('05_dashboard', 'Dashboard main view');

  // Scroll down
  await callTool('stream_scroll', { direction: 'down', amount: 400 });
  await sleep(800);
  await takeScreenshot('06_dashboard_scrolled', 'Dashboard scrolled down');

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Dashboard', elapsed, success: true });
  log('✅', `Dashboard test in ${elapsed}ms`, 'green');
}

async function testMarketplace() {
  section('3. MARKETPLACE TEST');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/marketplace`, 'marketplace');
  await takeScreenshot('07_marketplace', 'Marketplace with car listings');

  // Scroll through listings
  await callTool('stream_scroll', { direction: 'down', amount: 600 });
  await sleep(1000);
  await takeScreenshot('08_marketplace_scroll1', 'Marketplace scrolled - more cars');

  await callTool('stream_scroll', { direction: 'down', amount: 600 });
  await sleep(1000);
  await takeScreenshot('09_marketplace_scroll2', 'Marketplace scrolled further');

  // Scroll back up
  await callTool('stream_scroll', { direction: 'top' });
  await sleep(500);

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Marketplace', elapsed, success: true });
  log('✅', `Marketplace test in ${elapsed}ms`, 'green');
}

async function testProfile() {
  section('4. PROFILE TEST');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/profile`, 'profile');
  await takeScreenshot('10_profile', 'User profile page');

  await callTool('stream_scroll', { direction: 'down', amount: 300 });
  await sleep(600);
  await takeScreenshot('11_profile_scrolled', 'Profile scrolled');

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Profile', elapsed, success: true });
  log('✅', `Profile test in ${elapsed}ms`, 'green');
}

async function testWallet() {
  section('5. WALLET TEST');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/wallet`, 'wallet');
  await takeScreenshot('12_wallet', 'Wallet page with balance');

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Wallet', elapsed, success: true });
  log('✅', `Wallet test in ${elapsed}ms`, 'green');
}

async function testBookings() {
  section('6. BOOKINGS TEST');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/bookings`, 'bookings');
  await takeScreenshot('13_bookings', 'Bookings list');

  await callTool('stream_scroll', { direction: 'down', amount: 300 });
  await sleep(600);
  await takeScreenshot('14_bookings_scrolled', 'Bookings scrolled');

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Bookings', elapsed, success: true });
  log('✅', `Bookings test in ${elapsed}ms`, 'green');
}

async function testCarDetail() {
  section('7. CAR DETAIL TEST');
  const start = Date.now();

  // First go to marketplace
  await navigateAndWait(`${CONFIG.baseUrl}/marketplace`, 'marketplace');

  // Try to click on first car card
  const clickResult = await callTool('stream_evaluate', {
    script: `
      const card = document.querySelector('ion-card, .car-card, [routerlink*="car"], a[href*="car"]');
      if (card) {
        card.click();
        'clicked';
      } else {
        'no_card';
      }
    `
  });

  if (clickResult.raw?.includes('clicked')) {
    await sleep(2000);
    await waitForPageReady('car detail');
    await takeScreenshot('15_car_detail', 'Car detail page');

    await callTool('stream_scroll', { direction: 'down', amount: 400 });
    await sleep(600);
    await takeScreenshot('16_car_detail_scrolled', 'Car detail scrolled');
  } else {
    log('⚠️', 'No car card found to click', 'yellow');
  }

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Car Detail', elapsed, success: true });
  log('✅', `Car detail test in ${elapsed}ms`, 'green');
}

async function testStressScroll() {
  section('8. STRESS SCROLL TEST');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/marketplace`, 'marketplace for stress');

  // Rapid scrolling stress
  log('🔄', 'Stress scrolling...', 'blue');
  for (let i = 0; i < 10; i++) {
    await callTool('stream_scroll', { direction: 'down', amount: 800 });
    await sleep(200);
    process.stdout.write(`${colors.green}↓${colors.reset}`);
  }
  console.log('');

  await takeScreenshot('17_stress_scroll_bottom', 'After stress scrolling down');

  // Rapid scroll back up
  for (let i = 0; i < 5; i++) {
    await callTool('stream_scroll', { direction: 'up', amount: 1000 });
    await sleep(200);
    process.stdout.write(`${colors.green}↑${colors.reset}`);
  }
  console.log('');

  await callTool('stream_scroll', { direction: 'top' });
  await sleep(500);
  await takeScreenshot('18_stress_scroll_top', 'Back to top after stress');

  const elapsed = Date.now() - start;
  testResults.push({ name: 'Stress Scroll', elapsed, success: true });
  log('✅', `Stress scroll in ${elapsed}ms`, 'green');
}

async function testFinalState() {
  section('9. FINAL STATE');

  // Collect final metrics
  const metrics = await callTool('stream_evaluate', {
    script: `({
      url: location.href,
      title: document.title,
      domElements: document.querySelectorAll('*').length,
      bodyText: document.body?.innerText?.length || 0,
      images: document.images.length
    })`
  });

  log('📊', `Final state: ${metrics.raw}`, 'cyan');
  await takeScreenshot('19_final_state', 'Final state of the application');

  testResults.push({ name: 'Final State', elapsed: 0, success: true });
}

function generateReport() {
  section('GENERATING HTML REPORT');

  const totalTime = testResults.reduce((a, t) => a + t.elapsed, 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>AutoRenta Stress Test Report</title>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #ff6b6b; text-align: center; margin-bottom: 5px; }
    .subtitle { text-align: center; color: #aaa; margin-bottom: 30px; }
    h2 { color: #4ecdc4; border-bottom: 2px solid #4ecdc4; padding-bottom: 10px; margin-top: 40px; }
    .summary { background: #16213e; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .summary h3 { margin-top: 0; color: #feca57; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .metric { background: #0f3460; padding: 15px; border-radius: 8px; text-align: center; }
    .metric .value { font-size: 2em; font-weight: bold; color: #4ecdc4; }
    .metric .label { color: #aaa; font-size: 0.9em; }
    .tests { margin: 20px 0; }
    .test { background: #16213e; padding: 15px; border-radius: 8px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; }
    .test.success { border-left: 4px solid #4ecdc4; }
    .test .name { font-weight: bold; }
    .test .time { color: #aaa; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin: 20px 0; }
    .screenshot { background: #16213e; border-radius: 10px; overflow: hidden; }
    .screenshot img { width: 100%; height: auto; display: block; }
    .screenshot .info { padding: 15px; }
    .screenshot .title { font-weight: bold; color: #feca57; font-size: 1.1em; }
    .screenshot .desc { color: #aaa; font-size: 0.9em; margin-top: 5px; }
    .screenshot .time { color: #666; font-size: 0.8em; margin-top: 5px; }
    .footer { text-align: center; padding: 40px; color: #666; border-top: 1px solid #333; margin-top: 40px; }
  </style>
</head>
<body>
  <h1>🔥 AutoRenta Stress Test Report</h1>
  <p class="subtitle">Generated: ${new Date().toLocaleString()} | Target: ${CONFIG.baseUrl}</p>

  <div class="summary">
    <h3>📊 Summary</h3>
    <div class="metrics">
      <div class="metric">
        <div class="value">${testResults.length}</div>
        <div class="label">Tests Run</div>
      </div>
      <div class="metric">
        <div class="value">${testResults.filter(t => t.success).length}</div>
        <div class="label">Passed</div>
      </div>
      <div class="metric">
        <div class="value">${screenshots.length}</div>
        <div class="label">Screenshots</div>
      </div>
      <div class="metric">
        <div class="value">${Math.round(totalTime / 1000)}s</div>
        <div class="label">Total Time</div>
      </div>
    </div>
  </div>

  <h2>✅ Test Results</h2>
  <div class="tests">
    ${testResults.map(t => `
      <div class="test ${t.success ? 'success' : 'failed'}">
        <span class="name">${t.success ? '✓' : '✗'} ${t.name}</span>
        <span class="time">${t.elapsed}ms</span>
      </div>
    `).join('')}
  </div>

  <h2>📸 Screenshots (${screenshots.length})</h2>
  <div class="screenshots">
    ${screenshots.map(s => `
      <div class="screenshot">
        <img src="${s.filepath}" alt="${s.name}" loading="lazy"/>
        <div class="info">
          <div class="title">${s.name}</div>
          <div class="desc">${s.description}</div>
          <div class="time">⏱️ ${s.elapsed}ms</div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>🚀 Patchright Streaming MCP v2 - Visual Stress Test</p>
    <p>All screenshots captured after verifying splash screen disappeared</p>
  </div>
</body>
</html>`;

  writeFileSync(`${CONFIG.outputDir}/report.html`, html);
  log('📄', `Report: ${CONFIG.outputDir}/report.html`, 'green');
}

// ========== Main ==========

async function runTest() {
  banner('AUTORENTA VISUAL STRESS TEST v2', '🔥');

  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`Output: ${CONFIG.outputDir}`);
  console.log('');
  console.log('✨ This version waits for splash screen to disappear');
  console.log('');

  // Create output directory
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  await startServer();
  await initProtocol();

  log('🚀', 'Launching browser...', 'cyan');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  try {
    await testLogin();
    await testDashboard();
    await testMarketplace();
    await testProfile();
    await testWallet();
    await testBookings();
    await testCarDetail();
    await testStressScroll();
    await testFinalState();
  } catch (e) {
    log('❌', `Error: ${e.message}`, 'red');
    console.error(e);
  }

  generateReport();

  banner('TEST COMPLETE', '🏁');

  console.log(`📸 Screenshots: ${screenshots.length}`);
  console.log(`✅ Tests passed: ${testResults.filter(t => t.success).length}/${testResults.length}`);
  console.log(`⏱️  Total time: ${Math.round(testResults.reduce((a, t) => a + t.elapsed, 0) / 1000)}s`);
  console.log('');
  console.log(`📂 Report: file://${CONFIG.outputDir}/report.html`);
  console.log('');
  log('💡', 'Opening report...', 'cyan');

  // Try to open the report
  try {
    const { exec } = await import('child_process');
    exec(`xdg-open ${CONFIG.outputDir}/report.html`);
  } catch (e) {}

  // Cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess.kill('SIGTERM');
  await sleep(2000);

  process.exit(0);
}

runTest().catch(error => {
  console.error('Fatal:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
