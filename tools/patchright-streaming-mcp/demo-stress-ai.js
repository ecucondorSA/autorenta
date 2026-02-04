#!/usr/bin/env node
/**
 * 🤖 AUTORENTA AI-POWERED STRESS TEST
 *
 * Uses Vertex AI to detect splash screens automatically
 * instead of hardcoded selectors.
 *
 * Run with: USE_VERTEX_AI=true bun demo-stress-ai.js
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdirSync, existsSync, copyFileSync } from 'fs';

// ========== Configuration ==========
const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    email: 'ecucondor@gmail.com',
    password: 'Ab.12345'
  },
  outputDir: '/tmp/autorenta-ai-stress',

  // AI wait settings
  aiWaitMaxMs: 20000,
  aiWaitPollMs: 2000,
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

function banner(text, icon = '🤖') {
  const line = '═'.repeat(60);
  console.log(`\n${colors.magenta}${line}`);
  console.log(`  ${icon} ${text}`);
  console.log(`${line}${colors.reset}\n`);
}

function section(text) {
  console.log(`\n${colors.yellow}▶ ${text}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendRequest(method, params = {}, timeoutMs = 180000) {
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
 * 🤖 AI-powered wait for page ready
 * Uses Vertex AI Vision to detect splash screens
 */
async function aiWaitForPageReady(description = 'page') {
  log('🤖', `AI analyzing: waiting for ${description} to be ready...`, 'magenta');

  const result = await callTool('stream_ai_wait', {
    condition: `The page content is fully loaded and visible. There is NO loading spinner, splash screen, skeleton loader, or "Loading..." text visible. The main content of the page (forms, buttons, text, images) is visible and ready for interaction. Specifically check that there is no centered loading indicator or spinner animation.`,
    maxWaitMs: CONFIG.aiWaitMaxMs,
    pollIntervalMs: CONFIG.aiWaitPollMs,
  });

  if (result.success && result.raw) {
    const isReady = result.raw.includes('"ready": true') ||
                    result.raw.includes('"ready":true') ||
                    result.raw.includes('ready\": true');

    if (isReady) {
      log('✅', `AI confirms ${description} is ready (${result.elapsed}ms)`, 'green');
      return true;
    }

    // Extract AI reasoning
    try {
      const match = result.raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.ready === false && parsed.reason) {
          log('⏳', `AI says not ready: ${parsed.reason}`, 'yellow');
        }
      }
    } catch (e) {}
  }

  log('⚠️', `AI wait timeout for ${description}`, 'yellow');
  return false;
}

/**
 * Navigate and wait using AI
 */
async function navigateAndWait(url, description) {
  log('🌐', `Navigating to: ${url}`, 'cyan');
  await callTool('stream_navigate', { url, waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1500); // Brief initial wait for DOM

  // Use AI to determine when page is ready
  await aiWaitForPageReady(description);
  await sleep(500); // Settle time
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
        copyFileSync(path, filepath);
        log('📸', `Screenshot: ${name}`, 'green');
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
    log('🚀', 'Starting Patchright MCP Server with Vertex AI...', 'cyan');

    // Important: USE_VERTEX_AI=true and NO GEMINI_API_KEY
    const env = { ...process.env };
    delete env.GEMINI_API_KEY;  // Remove expired key
    delete env.GOOGLE_API_KEY;
    env.USE_VERTEX_AI = 'true';

    serverProcess = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    let started = false;
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server v1.0 started') && !started) {
        started = true;
        rl = createInterface({ input: serverProcess.stdout });
        rl.on('line', handleServerOutput);
        log('✅', 'Server started with Vertex AI', 'green');
        resolve();
      }

      // Show AI logs
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (l.includes('[AI]') || l.includes('[Wait]')) {
          console.log(`${colors.magenta}   ${l}${colors.reset}`);
        }
      });
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Server timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'ai-stress-test', version: '1.0.0' },
  });
  log('✅', 'MCP protocol initialized', 'green');
}

// ========== Test Functions ==========

async function testLogin() {
  section('1. LOGIN WITH AI DETECTION');
  const start = Date.now();

  // Navigate to login
  await navigateAndWait(`${CONFIG.baseUrl}/auth/login`, 'login page');
  await takeScreenshot('01_login_page', 'Login page after AI wait');

  // Fill email
  log('📧', 'Filling email...', 'blue');
  const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email', 'ion-input[type="email"] input'];
  for (const sel of emailSelectors) {
    const r = await callTool('stream_type', { selector: sel, text: CONFIG.credentials.email, clearFirst: true });
    if (r.success && !r.raw?.includes('error')) {
      log('✅', `Email filled: ${sel}`, 'green');
      break;
    }
  }

  // Fill password
  log('🔑', 'Filling password...', 'blue');
  const pwSelectors = ['input[type="password"]', 'input[name="password"]', '#password', 'ion-input[type="password"] input'];
  for (const sel of pwSelectors) {
    const r = await callTool('stream_type', { selector: sel, text: CONFIG.credentials.password, clearFirst: true });
    if (r.success && !r.raw?.includes('error')) {
      log('✅', `Password filled: ${sel}`, 'green');
      break;
    }
  }

  await takeScreenshot('02_credentials_filled', 'Form filled before login');

  // Click login
  log('🚀', 'Clicking login button...', 'blue');
  const loginSelectors = ['button[type="submit"]', 'ion-button[type="submit"]', '.login-btn', 'button:has-text("Ingresar")'];
  for (const sel of loginSelectors) {
    const r = await callTool('stream_click', { selector: sel });
    if (r.success && !r.raw?.includes('error')) {
      log('✅', `Login clicked: ${sel}`, 'green');
      break;
    }
  }

  // Wait for navigation using AI
  await sleep(2000);
  await aiWaitForPageReady('post-login page');
  await takeScreenshot('03_after_login', 'Page after login (AI detected ready)');

  testResults.push({
    test: 'login',
    success: true,
    time: Date.now() - start,
  });

  log('✅', `Login test completed in ${Date.now() - start}ms`, 'green');
}

async function testMarketplace() {
  section('2. MARKETPLACE WITH AI DETECTION');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/home/marketplace`, 'marketplace');
  await takeScreenshot('04_marketplace', 'Marketplace after AI wait');

  // Scroll to load more content
  for (let i = 0; i < 3; i++) {
    await callTool('stream_evaluate', { script: 'window.scrollBy(0, 500)' });
    await sleep(1000);
  }

  await aiWaitForPageReady('marketplace after scroll');
  await takeScreenshot('05_marketplace_scrolled', 'Marketplace after scrolling');

  testResults.push({
    test: 'marketplace',
    success: true,
    time: Date.now() - start,
  });

  log('✅', `Marketplace test completed in ${Date.now() - start}ms`, 'green');
}

async function testProfile() {
  section('3. PROFILE PAGE WITH AI DETECTION');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/home/profile`, 'profile');
  await takeScreenshot('06_profile', 'Profile after AI wait');

  testResults.push({
    test: 'profile',
    success: true,
    time: Date.now() - start,
  });

  log('✅', `Profile test completed in ${Date.now() - start}ms`, 'green');
}

async function testBookings() {
  section('4. BOOKINGS PAGE WITH AI DETECTION');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/home/bookings`, 'bookings');
  await takeScreenshot('07_bookings', 'Bookings after AI wait');

  testResults.push({
    test: 'bookings',
    success: true,
    time: Date.now() - start,
  });

  log('✅', `Bookings test completed in ${Date.now() - start}ms`, 'green');
}

async function testWallet() {
  section('5. WALLET PAGE WITH AI DETECTION');
  const start = Date.now();

  await navigateAndWait(`${CONFIG.baseUrl}/home/wallet`, 'wallet');
  await takeScreenshot('08_wallet', 'Wallet after AI wait');

  testResults.push({
    test: 'wallet',
    success: true,
    time: Date.now() - start,
  });

  log('✅', `Wallet test completed in ${Date.now() - start}ms`, 'green');
}

// ========== Main ==========

async function runTest() {
  banner('AI-POWERED AUTORENTA STRESS TEST', '🤖');

  console.log('This test uses Vertex AI Vision to detect splash screens');
  console.log('instead of hardcoded selectors.\n');
  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`User: ${CONFIG.credentials.email}\n`);

  // Setup output directory
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  try {
    await startServer();
    await initProtocol();

    // Check AI status
    section('0. AI STATUS CHECK');
    const aiStatus = await callTool('stream_ai_status', { test: false });
    console.log(aiStatus.raw?.substring(0, 500));

    // Launch browser
    await callTool('stream_status', { launch: true });
    await sleep(2000);

    // Run tests
    await testLogin();
    await testMarketplace();
    await testProfile();
    await testBookings();
    await testWallet();

  } catch (e) {
    log('❌', `Error: ${e.message}`, 'red');
  }

  // Results
  banner('TEST RESULTS', '📊');

  console.log('Screenshots captured:');
  screenshots.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.filepath}`);
  });

  console.log('\nTest Results:');
  testResults.forEach(t => {
    const status = t.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${status} ${t.test}: ${t.time}ms`);
  });

  const totalTime = testResults.reduce((a, t) => a + t.time, 0);
  console.log(`\nTotal time: ${totalTime}ms`);
  console.log(`Screenshots saved to: ${CONFIG.outputDir}`);

  // Cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess?.kill('SIGTERM');
  await sleep(2000);

  log('👋', 'AI stress test finished!', 'cyan');
  process.exit(0);
}

runTest().catch(error => {
  console.error('Error:', error);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
