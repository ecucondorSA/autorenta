#!/usr/bin/env node
/**
 * 🔧 AUTORENTA LOGIN - FIXED FLOW
 *
 * Correct login flow discovered via Claude in Chrome:
 * 1. Landing page → click "Ingresar" in header
 * 2. Modal "Tu auto, tu plan" → click green "Ingresar" button
 * 3. Login form → fill email/password → click "Ingresar"
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
  outputDir: '/tmp/autorenta-login-fixed',
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

async function aiWait(condition) {
  log('🤖', `Waiting: ${condition.substring(0, 60)}...`, 'magenta');
  const r = await callTool('stream_ai_wait', {
    condition,
    maxWaitMs: 15000,
    pollIntervalMs: 2000,
  });
  const ready = r.raw?.includes('"ready": true') || r.raw?.includes('"ready":true');
  if (ready) {
    log('✅', 'Ready', 'green');
  } else {
    log('⚠️', 'Timeout', 'yellow');
  }
  return ready;
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
    log('🚀', 'Starting server with Vertex AI...', 'cyan');

    const env = { ...process.env };
    delete env.GEMINI_API_KEY;
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
        log('✅', 'Server ready', 'green');
        resolve();
      }
      // Show AI activity
      output.split('\n').filter(l => l.includes('[AI]')).forEach(l => {
        console.log(`${colors.magenta}   ${l}${colors.reset}`);
      });
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'login-fixed', version: '1.0.0' },
  });
}

// ========== Main Test ==========

async function runTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔧 AUTORENTA LOGIN - FIXED FLOW');
  console.log('═'.repeat(60) + '\n');

  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  try {
    await startServer();
    await initProtocol();

    // Launch browser
    await callTool('stream_status', { launch: true });
    await sleep(2000);

    // STEP 1: Go to landing page
    log('📍', 'Step 1: Navigate to landing page', 'blue');
    await callTool('stream_navigate', { url: CONFIG.baseUrl, waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await aiWait('The landing page is loaded with "Comparte tu auto" text and an "Ingresar" button in the header');
    await takeScreenshot('01_landing');

    // STEP 2: Click "Ingresar" in header (top right)
    log('📍', 'Step 2: Click Ingresar in header', 'blue');
    // Use AI to click the header button (not center button if it exists)
    await callTool('stream_do', {
      instruction: 'Click the green "Ingresar" button in the top right corner of the header navigation bar',
      verify: false,
    });
    await sleep(3000);
    await aiWait('A modal appeared with "Tu auto, tu plan" title and two buttons: Ingresar and Crear cuenta');
    await takeScreenshot('02_modal');

    // STEP 3: Click green "Ingresar" button in modal
    log('📍', 'Step 3: Click Ingresar in modal', 'blue');
    await callTool('stream_do', {
      instruction: 'Click the green "Ingresar" button inside the modal (the one with a login icon)',
      verify: false,
    });
    await sleep(3000);
    await aiWait('A login form is visible with "Bienvenido de vuelta" title, email input field, password input field, and an Ingresar button');
    await takeScreenshot('03_login_form');

    // STEP 4: Fill email
    log('📍', 'Step 4: Fill email', 'blue');
    // Click on email field first
    await callTool('stream_click', { selector: 'input[type="email"], input[placeholder*="email"], input[formControlName="email"]' });
    await sleep(500);
    await callTool('stream_type', {
      selector: 'input[type="email"], input[placeholder*="email"], input[formControlName="email"]',
      text: CONFIG.credentials.email,
      clearFirst: true
    });
    await sleep(500);

    // STEP 5: Fill password
    log('📍', 'Step 5: Fill password', 'blue');
    await callTool('stream_click', { selector: 'input[type="password"], input[formControlName="password"]' });
    await sleep(500);
    await callTool('stream_type', {
      selector: 'input[type="password"], input[formControlName="password"]',
      text: CONFIG.credentials.password,
      clearFirst: true
    });
    await sleep(500);
    await takeScreenshot('04_form_filled');

    // STEP 6: Click login button
    log('📍', 'Step 6: Click Ingresar to login', 'blue');
    // The login button is inside the modal, look for button with "Ingresar" text
    await callTool('stream_do', {
      instruction: 'Click the green "Ingresar" button at the bottom of the login form to submit the login',
      verify: false,
    });
    await sleep(5000);

    // STEP 7: Verify login success
    log('📍', 'Step 7: Verify login', 'blue');
    await aiWait('The user is logged in. The page shows a map with car markers, or a list of cars, or a dashboard. The header shows user profile icon and notifications.');
    await takeScreenshot('05_logged_in');

    // STEP 8: Go to marketplace to confirm
    log('📍', 'Step 8: Navigate to marketplace', 'blue');
    await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/home/marketplace` });
    await sleep(3000);
    await aiWait('The marketplace page is visible with car listings');
    await takeScreenshot('06_marketplace');

    log('🎉', 'Login test completed successfully!', 'green');

  } catch (e) {
    log('❌', `Error: ${e.message}`, 'red');
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  Screenshots saved to: ${CONFIG.outputDir}`);
  console.log('═'.repeat(60) + '\n');

  // Cleanup
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
