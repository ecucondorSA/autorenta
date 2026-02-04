#!/usr/bin/env node
/**
 * 🔷 AUTORENTA LOGIN - IONIC COMPONENTS
 *
 * Uses JavaScript to click Ionic components directly.
 * Ionic buttons (ion-button) need special handling.
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
  outputDir: '/tmp/autorenta-login-ionic',
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

async function jsEval(script) {
  const r = await callTool('stream_evaluate', { script });
  return r.raw || '';
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
    clientInfo: { name: 'login-ionic', version: '1.0.0' },
  });
}

// ========== Main Test ==========

async function runTest() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔷 AUTORENTA LOGIN - IONIC COMPONENTS');
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

    // STEP 1: Navigate to landing
    log('📍', 'Step 1: Navigate to auth/login directly', 'blue');
    await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/auth/login`, waitUntil: 'networkidle', timeout: 30000 });
    await sleep(5000); // Wait for Angular + Ionic
    await takeScreenshot('01_initial');

    // STEP 2: Click the green Ingresar button in the modal using JS
    log('📍', 'Step 2: Click Ingresar in modal via JS', 'blue');

    // Find and click the ion-button with "Ingresar" text
    const clickResult = await jsEval(`
      (function() {
        // Method 1: Find ion-button with Ingresar text
        const ionButtons = document.querySelectorAll('ion-button');
        for (const btn of ionButtons) {
          const text = btn.textContent || btn.innerText;
          if (text.includes('Ingresar') && !text.includes('Face ID')) {
            console.log('Found Ingresar ion-button, clicking...');
            btn.click();
            return { clicked: true, method: 'ion-button', text };
          }
        }

        // Method 2: Find any button with Ingresar
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.includes('Ingresar')) {
            btn.click();
            return { clicked: true, method: 'button', text: btn.textContent };
          }
        }

        // Method 3: Click by class
        const greenBtn = document.querySelector('.auth-selector ion-button, .login-selector ion-button');
        if (greenBtn) {
          greenBtn.click();
          return { clicked: true, method: 'class' };
        }

        return { clicked: false, buttons: ionButtons.length };
      })()
    `);
    console.log(`   JS click result: ${clickResult}`);

    await sleep(4000);
    await takeScreenshot('02_after_modal_click');

    // Check if login form appeared
    const hasLoginForm = await jsEval(`
      (function() {
        const emailInput = document.querySelector('input[type="email"]');
        const pwInput = document.querySelector('input[type="password"]');
        const title = document.body.innerText;
        return {
          hasEmail: !!emailInput,
          hasPassword: !!pwInput,
          hasBienvenido: title.includes('Bienvenido'),
          url: location.href
        };
      })()
    `);
    console.log(`   Login form check: ${hasLoginForm}`);

    // If no login form, try clicking again with dispatchEvent
    if (!hasLoginForm.includes('hasEmail": true')) {
      log('⚠️', 'Login form not found, trying dispatchEvent...', 'yellow');

      await jsEval(`
        (function() {
          const ionButtons = document.querySelectorAll('ion-button');
          for (const btn of ionButtons) {
            const text = btn.textContent || '';
            if (text.includes('Ingresar') && !text.includes('Face ID') && !text.includes('huella')) {
              // Try multiple click methods
              btn.click();
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

              // Also try clicking the inner button if exists
              const innerBtn = btn.querySelector('button');
              if (innerBtn) innerBtn.click();

              // Try touch events for mobile
              btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
              btn.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));

              return 'clicked with multiple methods';
            }
          }
          return 'no button found';
        })()
      `);

      await sleep(4000);
      await takeScreenshot('02b_retry_click');
    }

    // STEP 3: Fill email
    log('📍', 'Step 3: Fill email', 'blue');
    await jsEval(`
      (function() {
        const input = document.querySelector('input[type="email"], ion-input[type="email"] input');
        if (input) {
          input.focus();
          input.value = '${CONFIG.credentials.email}';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return 'email filled';
        }
        return 'email input not found';
      })()
    `);
    await sleep(500);

    // STEP 4: Fill password
    log('📍', 'Step 4: Fill password', 'blue');
    await jsEval(`
      (function() {
        const input = document.querySelector('input[type="password"], ion-input[type="password"] input');
        if (input) {
          input.focus();
          input.value = '${CONFIG.credentials.password}';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return 'password filled';
        }
        return 'password input not found';
      })()
    `);
    await sleep(500);
    await takeScreenshot('03_form_filled');

    // STEP 5: Submit
    log('📍', 'Step 5: Submit login', 'blue');
    await jsEval(`
      (function() {
        // Find submit button
        const submitBtn = document.querySelector('button[type="submit"], ion-button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return 'submit clicked';
        }

        // Try form submit
        const form = document.querySelector('form');
        if (form) {
          form.submit();
          return 'form submitted';
        }

        // Find any Ingresar button that's not in the selector modal
        const btns = document.querySelectorAll('ion-button, button');
        for (const btn of btns) {
          if (btn.textContent.includes('Ingresar') && !btn.closest('.auth-selector')) {
            btn.click();
            return 'ingresar button clicked';
          }
        }

        return 'no submit found';
      })()
    `);

    await sleep(6000);
    await takeScreenshot('04_after_submit');

    // STEP 6: Check result
    log('📍', 'Step 6: Check login result', 'blue');
    const result = await jsEval(`
      ({ url: location.href, title: document.title })
    `);
    console.log(`   Result: ${result}`);

    // STEP 7: Navigate to marketplace
    log('📍', 'Step 7: Try marketplace', 'blue');
    await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/home/marketplace` });
    await sleep(4000);
    await takeScreenshot('05_marketplace');

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
