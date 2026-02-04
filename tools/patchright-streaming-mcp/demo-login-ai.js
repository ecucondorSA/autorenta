#!/usr/bin/env node
/**
 * 🤖 AI-POWERED LOGIN TEST
 *
 * Uses natural language commands (stream_do) to handle the login flow
 * instead of hardcoded selectors.
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
  outputDir: '/tmp/autorenta-login-ai',
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
  log('🔧', `${name}`, 'yellow');
  if (args.instruction) {
    console.log(`   ${colors.cyan}→ "${args.instruction}"${colors.reset}`);
  }

  try {
    const response = await sendRequest('tools/call', { name, arguments: args });
    const elapsed = Date.now() - start;
    if (response.error) {
      log('❌', `Error: ${JSON.stringify(response.error)}`, 'red');
      return { success: false, error: response.error, elapsed };
    }
    const content = response.result?.content || [];
    const text = content.find(c => c.type === 'text')?.text || '';
    log('✅', `Done (${elapsed}ms)`, 'green');
    return { success: true, raw: text, elapsed };
  } catch (e) {
    log('❌', `Error: ${e.message}`, 'red');
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
        log('📸', `Screenshot: ${dest}`, 'green');
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
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (l.includes('[AI]') || l.includes('[Do]') || l.includes('[Wait]')) {
          console.log(`${colors.magenta}   ${l}${colors.reset}`);
        }
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
    clientInfo: { name: 'login-ai', version: '1.0.0' },
  });
}

// ========== Main Test ==========

async function runTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🤖 AI-POWERED LOGIN TEST');
  console.log('═'.repeat(60) + '\n');

  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`User: ${CONFIG.credentials.email}\n`);

  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  try {
    await startServer();
    await initProtocol();

    // Launch browser
    await callTool('stream_status', { launch: true });
    await sleep(2000);

    // Step 1: Navigate to landing page
    log('📍', 'Step 1: Navigate to AutoRenta', 'blue');
    await callTool('stream_navigate', { url: CONFIG.baseUrl, waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Wait for page ready using AI
    await callTool('stream_ai_wait', {
      condition: 'The page is fully loaded with visible content. There is no loading spinner or splash screen.',
      maxWaitMs: 15000,
      pollIntervalMs: 2000,
    });
    await takeScreenshot('01_landing');

    // Step 2: Click on "Ingresar" button using AI
    log('📍', 'Step 2: Click on Ingresar button (AI)', 'blue');
    await callTool('stream_do', {
      instruction: 'Click on the green "Ingresar" button in the center of the page (the one that says "Ingresar" with a login icon, not the one in the header)',
      verify: false,
    });
    await sleep(3000);

    // Wait for login form
    await callTool('stream_ai_wait', {
      condition: 'A login form is visible with email and password input fields',
      maxWaitMs: 15000,
      pollIntervalMs: 2000,
    });
    await takeScreenshot('02_login_form');

    // Step 3: Fill email using AI
    log('📍', 'Step 3: Fill email (AI)', 'blue');
    await callTool('stream_do', {
      instruction: `Type the email "${CONFIG.credentials.email}" in the email input field`,
      verify: false,
    });
    await sleep(1000);

    // Step 4: Fill password using AI
    log('📍', 'Step 4: Fill password (AI)', 'blue');
    await callTool('stream_do', {
      instruction: `Type the password "${CONFIG.credentials.password}" in the password input field`,
      verify: false,
    });
    await sleep(1000);
    await takeScreenshot('03_form_filled');

    // Step 5: Click login button using AI
    log('📍', 'Step 5: Submit login (AI)', 'blue');
    await callTool('stream_do', {
      instruction: 'Click the submit or login button to complete the login',
      verify: false,
    });
    await sleep(3000);

    // Wait for post-login page
    await callTool('stream_ai_wait', {
      condition: 'The user is logged in. The page shows a dashboard, marketplace, or user menu - NOT a login form.',
      maxWaitMs: 20000,
      pollIntervalMs: 2000,
    });
    await takeScreenshot('04_logged_in');

    // Step 6: Navigate to marketplace to verify login
    log('📍', 'Step 6: Verify by going to marketplace', 'blue');
    await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/home/marketplace` });
    await sleep(2000);
    await callTool('stream_ai_wait', {
      condition: 'The marketplace page is visible with car listings or content',
      maxWaitMs: 15000,
      pollIntervalMs: 2000,
    });
    await takeScreenshot('05_marketplace');

    log('🎉', 'Login test completed!', 'green');

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
