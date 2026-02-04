#!/usr/bin/env node
/**
 * 🎯 AUTORENTA LOGIN - COORDINATE-BASED
 *
 * Uses exact coordinates based on what worked in Claude in Chrome.
 * More reliable than AI-based clicking for known UI.
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdirSync, existsSync, copyFileSync } from 'fs';

const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    email: 'ecucondor@gmail.com',
    password: 'Ab.12345'
  },
  outputDir: '/tmp/autorenta-login-coords',
};

let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();

const colors = {
  reset: '\x1b[0m',
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
    return { success: true, raw: text, elapsed };
  } catch (e) {
    return { success: false, error: e.message, elapsed: Date.now() - start };
  }
}

async function takeScreenshot(name) {
  const r = await callTool('stream_screenshot', { compress: true, fullPage: false });
  if (r.success) {
    const match = r.raw?.match(/Path:\s*([^\n]+)/);
    const path = match ? match[1].trim() : null;
    if (path) {
      const dest = `${CONFIG.outputDir}/${name}.jpg`;
      try {
        copyFileSync(path, dest);
        log('📸', `${name}`, 'green');
        return dest;
      } catch (e) {}
    }
  }
  return null;
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
        log('✅', 'Server ready', 'green');
        resolve();
      }
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'login-coords', version: '1.0.0' },
  });
}

// ========== Main Test ==========

async function runTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🎯 AUTORENTA LOGIN - COORDINATE-BASED');
  console.log('═'.repeat(60) + '\n');

  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  try {
    await startServer();
    await initProtocol();

    // Launch browser with specific viewport
    log('🖥️', 'Launching browser (1280x720)', 'blue');
    await callTool('stream_status', { launch: true });
    await sleep(2000);

    // Set viewport
    await callTool('stream_evaluate', {
      script: `window.resizeTo(1280, 720)`
    });

    // STEP 1: Navigate to landing
    log('📍', 'Step 1: Navigate to landing', 'blue');
    await callTool('stream_navigate', { url: CONFIG.baseUrl, waitUntil: 'networkidle', timeout: 30000 });
    await sleep(4000); // Wait for Angular to load
    await takeScreenshot('01_landing');

    // STEP 2: Click "Ingresar" in header using selector
    log('📍', 'Step 2: Click Ingresar in header', 'blue');
    // Try multiple selectors for the header button
    const headerSelectors = [
      'header button:has-text("Ingresar")',
      'nav button:has-text("Ingresar")',
      'a:has-text("Ingresar")',
      '.header-actions button',
      '[routerlink*="login"]',
      'button.login-btn',
    ];

    let clicked = false;
    for (const sel of headerSelectors) {
      const r = await callTool('stream_click', { selector: sel });
      if (r.success && !r.raw?.includes('error') && !r.raw?.includes('not found')) {
        log('✅', `Clicked: ${sel}`, 'green');
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Fallback: try clicking by text content
      log('⚠️', 'Trying text-based click...', 'yellow');
      await callTool('stream_evaluate', {
        script: `
          const buttons = document.querySelectorAll('button, a');
          for (const btn of buttons) {
            if (btn.textContent.includes('Ingresar') && btn.offsetParent !== null) {
              btn.click();
              break;
            }
          }
        `
      });
    }

    await sleep(4000);
    await takeScreenshot('02_after_header_click');

    // STEP 3: Check if modal appeared, then click its Ingresar button
    log('📍', 'Step 3: Click Ingresar in modal (if present)', 'blue');
    const modalSelectors = [
      '.modal button:has-text("Ingresar")',
      'ion-modal button:has-text("Ingresar")',
      '.auth-modal button',
      '[class*="modal"] button:has-text("Ingresar")',
    ];

    for (const sel of modalSelectors) {
      const r = await callTool('stream_click', { selector: sel });
      if (r.success && !r.raw?.includes('error')) {
        log('✅', `Modal clicked: ${sel}`, 'green');
        break;
      }
    }

    // Also try clicking via JS
    await callTool('stream_evaluate', {
      script: `
        // Find modal or overlay with Ingresar button
        const modals = document.querySelectorAll('[class*="modal"], [class*="dialog"], [class*="overlay"], ion-modal');
        for (const modal of modals) {
          const btn = modal.querySelector('button');
          if (btn && btn.textContent.includes('Ingresar')) {
            btn.click();
            break;
          }
        }
        // Also try ion-button
        const ionBtns = document.querySelectorAll('ion-button');
        for (const btn of ionBtns) {
          if (btn.textContent.includes('Ingresar')) {
            btn.click();
            break;
          }
        }
      `
    });

    await sleep(4000);
    await takeScreenshot('03_after_modal_click');

    // STEP 4: Fill login form
    log('📍', 'Step 4: Fill email', 'blue');
    const emailSelectors = [
      'input[type="email"]',
      'input[formcontrolname="email"]',
      'input[placeholder*="email"]',
      'input[name="email"]',
      'ion-input[type="email"] input',
    ];

    for (const sel of emailSelectors) {
      await callTool('stream_click', { selector: sel });
      const r = await callTool('stream_type', { selector: sel, text: CONFIG.credentials.email, clearFirst: true });
      if (r.success && !r.raw?.includes('error')) {
        log('✅', `Email: ${sel}`, 'green');
        break;
      }
    }
    await sleep(500);

    log('📍', 'Step 5: Fill password', 'blue');
    const pwSelectors = [
      'input[type="password"]',
      'input[formcontrolname="password"]',
      'input[name="password"]',
      'ion-input[type="password"] input',
    ];

    for (const sel of pwSelectors) {
      await callTool('stream_click', { selector: sel });
      const r = await callTool('stream_type', { selector: sel, text: CONFIG.credentials.password, clearFirst: true });
      if (r.success && !r.raw?.includes('error')) {
        log('✅', `Password: ${sel}`, 'green');
        break;
      }
    }
    await sleep(500);
    await takeScreenshot('04_form_filled');

    // STEP 6: Submit login
    log('📍', 'Step 6: Submit login', 'blue');
    const submitSelectors = [
      'form button[type="submit"]',
      'button[type="submit"]',
      'ion-button[type="submit"]',
      '.login-form button',
    ];

    for (const sel of submitSelectors) {
      const r = await callTool('stream_click', { selector: sel });
      if (r.success && !r.raw?.includes('error')) {
        log('✅', `Submit: ${sel}`, 'green');
        break;
      }
    }

    await sleep(6000); // Wait for login to complete
    await takeScreenshot('05_after_login');

    // STEP 7: Check current URL
    log('📍', 'Step 7: Check login status', 'blue');
    const urlCheck = await callTool('stream_evaluate', {
      script: `({ url: location.href, title: document.title })`
    });
    console.log(`   URL: ${urlCheck.raw}`);

    // STEP 8: Try marketplace
    log('📍', 'Step 8: Navigate to marketplace', 'blue');
    await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/home/marketplace` });
    await sleep(4000);
    await takeScreenshot('06_marketplace');

    log('🎉', 'Test completed!', 'green');

  } catch (e) {
    log('❌', `Error: ${e.message}`, 'red');
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  Screenshots: ${CONFIG.outputDir}`);
  console.log('═'.repeat(60) + '\n');

  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess?.kill('SIGTERM');
  await sleep(2000);
  process.exit(0);
}

runTest().catch(error => {
  console.error('Error:', error);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
