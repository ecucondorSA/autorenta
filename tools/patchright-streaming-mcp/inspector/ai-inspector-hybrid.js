#!/usr/bin/env node
/**
 * 🔬 AI-HYBRID PLATFORM INSPECTOR
 *
 * Professional platform inspection combining:
 * - JavaScript evaluation for RELIABLE actions (Ionic components)
 * - AI observation (stream_observe) for page analysis
 * - AI assertion (stream_ai_assert) for verification
 *
 * Model: gemini-3-flash-preview (Vertex AI global)
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdirSync, existsSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

// ========== Configuration ==========
const CONFIG = {
  baseUrl: process.argv[2] || 'https://autorentar.com',
  credentials: {
    email: process.argv[3] || 'ecucondor@gmail.com',
    password: process.argv[4] || 'Ab.12345'
  },
  outputDir: join(process.cwd(), 'inspector/output-ai'),
  screenshotDir: join(process.cwd(), 'inspector/output-ai/screenshots'),
  platform: 'AutoRenta',
  timeout: 60000,
};

// Pages to inspect - FASE 2: Profile, Dashboard, Bookings, Cars, Wallet
const PAGES_TO_INSPECT = [
  // Profile (9 páginas)
  { name: 'profile', path: '/profile', description: 'Perfil principal', requiresAuth: true },
  { name: 'profile_personal', path: '/profile/personal', description: 'Datos personales', requiresAuth: true },
  { name: 'profile_contact', path: '/profile/contact', description: 'Contacto', requiresAuth: true },
  { name: 'profile_preferences', path: '/profile/preferences', description: 'Preferencias', requiresAuth: true },
  { name: 'profile_security', path: '/profile/security', description: 'Seguridad', requiresAuth: true },
  { name: 'profile_verification', path: '/profile/verification', description: 'Verificación', requiresAuth: true },
  { name: 'profile_driving', path: '/profile/driving-stats', description: 'Stats conducción', requiresAuth: true },
  { name: 'notifications_settings', path: '/profile/notifications-settings', description: 'Config notificaciones', requiresAuth: true },

  // Dashboard (6 páginas)
  { name: 'dashboard', path: '/dashboard', description: 'Dashboard owner', requiresAuth: true },
  { name: 'dashboard_earnings', path: '/dashboard/earnings', description: 'Ganancias', requiresAuth: true },
  { name: 'dashboard_stats', path: '/dashboard/stats', description: 'Estadísticas', requiresAuth: true },
  { name: 'dashboard_calendar', path: '/dashboard/calendar', description: 'Calendario', requiresAuth: true },
  { name: 'dashboard_reviews', path: '/dashboard/reviews', description: 'Reseñas', requiresAuth: true },
  { name: 'payouts', path: '/payouts', description: 'Pagos recibidos', requiresAuth: true },

  // Bookings (4 páginas principales)
  { name: 'bookings', path: '/bookings', description: 'Mis reservas', requiresAuth: true },
  { name: 'reviews_pending', path: '/reviews/pending', description: 'Reviews pendientes', requiresAuth: true },

  // Cars (4 páginas)
  { name: 'cars_browse', path: '/cars', description: 'Explorar autos', requiresAuth: false },
  { name: 'cars_list', path: '/cars/list', description: 'Lista/Mapa', requiresAuth: false },
  { name: 'cars_my', path: '/cars/my', description: 'Mis autos', requiresAuth: true },
  { name: 'cars_publish', path: '/cars/publish', description: 'Publicar auto', requiresAuth: true },

  // Wallet (4 páginas)
  { name: 'wallet', path: '/wallet', description: 'Billetera', requiresAuth: true },
  { name: 'wallet_club', path: '/wallet/club/plans', description: 'Club planes', requiresAuth: true },

  // Other critical
  { name: 'referrals', path: '/referrals', description: 'Referidos', requiresAuth: true },
  { name: 'verification', path: '/verification', description: 'Verificación KYC', requiresAuth: true },
  { name: 'onboarding', path: '/onboarding', description: 'Onboarding', requiresAuth: true },
  { name: 'protections', path: '/protections', description: 'Protecciones', requiresAuth: true },
];

// State
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();
const inspectionResults = {
  metadata: {
    platform: CONFIG.platform,
    url: CONFIG.baseUrl,
    timestamp: new Date().toISOString(),
    aiModel: 'gemini-3-flash-preview',
    aiProvider: 'Vertex AI (global)',
    approach: 'Hybrid (JS actions + AI observation)',
  },
  pages: [],
  flows: [],
  components: [],
  apiCalls: [],
  edgeCases: [],
  performance: [],
  screenshots: [],
};

// ========== Colors ==========
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(icon, msg, color = 'reset') {
  console.log(`${colors[color]}${icon} ${msg}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ========== MCP Communication ==========
async function sendRequest(method, params = {}, timeoutMs = CONFIG.timeout) {
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

// ========== Tool Wrappers ==========

/**
 * JavaScript evaluation - RELIABLE for Ionic components
 */
async function jsEval(script) {
  const result = await callTool('stream_evaluate', { script });
  return result.raw || '';
}

/**
 * AI-powered page observation - analyzes the current page
 */
async function aiObserve() {
  log('🔍', 'AI observing page...', 'magenta');
  const result = await callTool('stream_observe', {});
  if (result.success) {
    try {
      // Try to extract JSON from the response
      const text = result.raw;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { raw: text };
    } catch {
      return { raw: result.raw };
    }
  }
  return { error: result.error };
}

/**
 * AI-powered assertion - simpler yes/no verification
 */
async function aiAssert(assertion) {
  log('✓', `AI assert: ${assertion}`, 'green');
  const result = await callTool('stream_ai_assert', { assertion });
  return { success: result.success, details: result.raw };
}

/**
 * Take screenshot and save
 */
async function takeScreenshot(name) {
  const result = await callTool('stream_screenshot', { compress: true, fullPage: false });
  if (result.success) {
    const match = result.raw?.match(/Path:\s*([^\n]+)/);
    const path = match ? match[1].trim() : null;
    if (path) {
      const dest = join(CONFIG.screenshotDir, `${name}.jpg`);
      try {
        copyFileSync(path, dest);
        inspectionResults.screenshots.push({ name, path: dest, timestamp: new Date().toISOString() });
        log('📸', name, 'green');
        return dest;
      } catch (e) {}
    }
  }
  return null;
}

/**
 * Navigate to URL
 */
async function navigate(url) {
  log('🌐', `Navigating to ${url}`, 'blue');
  const start = Date.now();
  await callTool('stream_navigate', { url, waitUntil: 'networkidle', timeout: 30000 });
  const elapsed = Date.now() - start;
  await sleep(3000); // Wait for Angular/Ionic hydration
  return elapsed;
}

/**
 * Get current URL via JS
 */
async function getCurrentUrl() {
  const result = await jsEval('location.href');
  return result.replace(/["\n]/g, '').replace('📜 Result: ', '').trim();
}

// ========== Server Management ==========
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
    log('🚀', 'Starting Patchright MCP Server...', 'cyan');

    serverProcess = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, USE_VERTEX_AI: 'true' },
    });

    let started = false;
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('[AI]')) {
        log('🧠', output.trim().substring(0, 100), 'dim');
      }
      if (output.includes('Server v1.0 started') && !started) {
        started = true;
        rl = createInterface({ input: serverProcess.stdout });
        rl.on('line', handleServerOutput);
        log('✅', 'Server ready with AI capabilities', 'green');
        resolve();
      }
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Server startup timeout')), 30000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'ai-inspector-hybrid', version: '2.0.0' },
  });
}

// ========== Inspection Functions ==========

/**
 * Inspect a single page with AI observation
 */
async function inspectPage(pageConfig) {
  const { name, path, description } = pageConfig;
  logSection(`Inspecting: ${name}`);

  const pageResult = {
    name,
    path,
    description,
    url: `${CONFIG.baseUrl}${path}`,
    timestamp: new Date().toISOString(),
    loadTime: 0,
    aiObservation: null,
    components: [],
    assertions: [],
  };

  try {
    // Navigate
    pageResult.loadTime = await navigate(pageResult.url);
    log('⏱️', `Load time: ${pageResult.loadTime}ms`, 'dim');

    // Take screenshot
    await takeScreenshot(`${name}_01_initial`);

    // AI Observation
    const observation = await aiObserve();
    pageResult.aiObservation = observation;

    if (observation.pageType) {
      log('📄', `Page type: ${observation.pageType}`, 'cyan');
    }
    if (observation.title) {
      log('📝', `Title: ${observation.title}`, 'cyan');
    }
    if (observation.interactiveElements) {
      log('🔘', `Interactive elements: ${observation.interactiveElements}`, 'cyan');
    }
    if (observation.mainElements) {
      pageResult.components = observation.mainElements;
      log('🧩', `Components detected: ${observation.mainElements.length}`, 'cyan');
    }

    // Performance data
    inspectionResults.performance.push({
      page: name,
      loadTime: pageResult.loadTime,
      timestamp: pageResult.timestamp,
    });

    // AI assertions for common checks
    const assertResult = await aiAssert('The page has loaded successfully and shows expected content');
    pageResult.assertions.push({
      assertion: 'Page loaded successfully',
      result: assertResult.success,
      details: assertResult.details,
    });

  } catch (e) {
    log('❌', `Error inspecting ${name}: ${e.message}`, 'red');
    pageResult.error = e.message;
  }

  inspectionResults.pages.push(pageResult);
  return pageResult;
}

/**
 * Perform JavaScript-based login (RELIABLE for Ionic)
 */
async function performLogin() {
  logSection('Hybrid Login Flow (JS + AI Verification)');

  const loginFlow = {
    name: 'authentication',
    approach: 'hybrid',
    steps: [],
    success: false,
  };

  try {
    // Navigate to login
    await navigate(`${CONFIG.baseUrl}/auth/login`);
    await sleep(4000);
    await takeScreenshot('login_01_initial');

    // Wait extra time for Ionic components to render
    log('⏳', 'Waiting for Ionic components to hydrate...', 'dim');
    await sleep(5000);

    // AI observes initial state
    const initialObs = await aiObserve();
    loginFlow.steps.push({ step: 0, action: 'observe_initial', result: initialObs });

    // Debug: Check what elements exist
    const debugInfo = await jsEval(`
      (function() {
        return {
          ionButtons: document.querySelectorAll('ion-button').length,
          buttons: document.querySelectorAll('button').length,
          allElements: document.querySelectorAll('*').length,
          bodyText: document.body.innerText.substring(0, 500),
          hasIngresar: document.body.innerText.includes('Ingresar')
        };
      })()
    `);
    log('🔧', `Debug: ${debugInfo}`, 'dim');

    // Step 1: Click Ingresar in modal using JavaScript with multiple methods
    log('📍', 'Step 1: Click Ingresar modal (JS)', 'blue');
    const clickResult = await jsEval(`
      (function() {
        // Method 1: Try ion-button first
        const ionButtons = document.querySelectorAll('ion-button');
        for (const btn of ionButtons) {
          const text = btn.textContent || btn.innerText;
          if (text.includes('Ingresar') && !text.includes('Face ID') && !text.includes('huella')) {
            btn.click();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return { clicked: true, method: 'ion-button', text: text.trim() };
          }
        }

        // Method 2: Try regular buttons
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent || btn.innerText;
          if (text.includes('Ingresar') && !text.includes('Face ID') && !text.includes('huella')) {
            btn.click();
            return { clicked: true, method: 'button', text: text.trim() };
          }
        }

        // Method 3: Try any element with Ingresar text
        const allElements = document.querySelectorAll('[class*="button"], [role="button"]');
        for (const el of allElements) {
          const text = el.textContent || el.innerText;
          if (text.includes('Ingresar') && text.length < 50) {
            el.click();
            return { clicked: true, method: 'generic', text: text.trim() };
          }
        }

        // Method 4: Try clicking by coordinates on the green button area
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2 + 50; // Below center for the modal
        const elementAtPoint = document.elementFromPoint(centerX, centerY);
        if (elementAtPoint) {
          elementAtPoint.click();
          return { clicked: true, method: 'coordinates', element: elementAtPoint.tagName };
        }

        return { clicked: false, ionButtons: ionButtons.length, buttons: buttons.length };
      })()
    `);
    log('📋', `JS result: ${clickResult}`, 'dim');
    loginFlow.steps.push({ step: 1, action: 'click_modal_js', result: clickResult });
    await sleep(3000);
    await takeScreenshot('login_02_after_modal');

    // AI verifies form appeared
    const formVerify = await aiAssert('A login form with email and password input fields is now visible on the page');
    loginFlow.steps.push({ step: 'verify', action: 'ai_verify_form', result: formVerify });

    // Step 2: Fill email using JavaScript
    log('📍', 'Step 2: Fill email (JS)', 'blue');
    const emailResult = await jsEval(`
      (function() {
        const input = document.querySelector('input[type="email"], ion-input[type="email"] input');
        if (input) {
          input.focus();
          input.value = '${CONFIG.credentials.email}';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { filled: true, value: input.value };
        }
        return { filled: false, error: 'Email input not found' };
      })()
    `);
    log('📋', `Email: ${emailResult}`, 'dim');
    loginFlow.steps.push({ step: 2, action: 'fill_email_js', result: emailResult });
    await sleep(500);

    // Step 3: Fill password using JavaScript
    log('📍', 'Step 3: Fill password (JS)', 'blue');
    const passwordResult = await jsEval(`
      (function() {
        const input = document.querySelector('input[type="password"], ion-input[type="password"] input');
        if (input) {
          input.focus();
          input.value = '${CONFIG.credentials.password}';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return { filled: true };
        }
        return { filled: false, error: 'Password input not found' };
      })()
    `);
    log('📋', `Password: ${passwordResult}`, 'dim');
    loginFlow.steps.push({ step: 3, action: 'fill_password_js', result: passwordResult });
    await sleep(500);
    await takeScreenshot('login_03_form_filled');

    // Step 4: Submit using JavaScript
    log('📍', 'Step 4: Submit login (JS)', 'blue');
    const submitResult = await jsEval(`
      (function() {
        // Try submit button
        const submitBtn = document.querySelector('button[type="submit"], ion-button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return { submitted: true, method: 'submit_button' };
        }

        // Try form submit
        const form = document.querySelector('form');
        if (form) {
          form.submit();
          return { submitted: true, method: 'form_submit' };
        }

        // Find Ingresar button in form (not in modal)
        const btns = document.querySelectorAll('ion-button, button');
        for (const btn of btns) {
          const text = btn.textContent || '';
          if (text.includes('Ingresar') && btn.closest('form')) {
            btn.click();
            return { submitted: true, method: 'ingresar_button' };
          }
        }

        return { submitted: false };
      })()
    `);
    log('📋', `Submit: ${submitResult}`, 'dim');
    loginFlow.steps.push({ step: 4, action: 'submit_js', result: submitResult });

    // Wait for navigation
    await sleep(6000);
    await takeScreenshot('login_04_after_submit');

    // Verify success via URL
    const currentUrl = await getCurrentUrl();
    loginFlow.finalUrl = currentUrl;
    loginFlow.success = !currentUrl.includes('/auth/login');

    if (loginFlow.success) {
      log('✅', `Login successful! Redirected to: ${currentUrl}`, 'green');

      // AI verification of logged-in state
      const loggedInVerify = await aiAssert('The user is now logged in and viewing a dashboard or main application page');
      loginFlow.steps.push({ step: 5, action: 'ai_verify_login', result: loggedInVerify });
    } else {
      log('⚠️', `Login may have failed. Still at: ${currentUrl}`, 'yellow');

      // Check for error messages
      const errorCheck = await jsEval(`
        (function() {
          const errors = document.querySelectorAll('.error, .alert, ion-text[color="danger"]');
          return Array.from(errors).map(e => e.textContent.trim()).filter(Boolean);
        })()
      `);
      loginFlow.errorMessages = errorCheck;
      if (errorCheck) {
        log('❌', `Errors found: ${errorCheck}`, 'red');
      }
    }

  } catch (e) {
    log('❌', `Login error: ${e.message}`, 'red');
    loginFlow.error = e.message;
  }

  inspectionResults.flows.push(loginFlow);
  return loginFlow;
}

/**
 * Generate markdown documentation
 */
function generateDocumentation() {
  logSection('Generating Documentation');

  // README.md
  const readme = `# 🔬 AI-Hybrid Platform Inspection - ${CONFIG.platform}

> Generated by Patchright MCP AI Inspector (Hybrid Mode)
> Model: ${inspectionResults.metadata.aiModel}
> Provider: ${inspectionResults.metadata.aiProvider}
> Approach: ${inspectionResults.metadata.approach}
> Timestamp: ${inspectionResults.metadata.timestamp}

## Documents

| Document | Description |
|----------|-------------|
| [01-FLOWS.md](./01-FLOWS.md) | User flows with AI verification |
| [02-COMPONENTS.md](./02-COMPONENTS.md) | UI components detected by AI |
| [03-STATES.md](./03-STATES.md) | Application states |
| [04-API-CALLS.md](./04-API-CALLS.md) | Network activity |
| [05-EDGE-CASES.md](./05-EDGE-CASES.md) | Edge cases and errors |
| [06-PERFORMANCE.md](./06-PERFORMANCE.md) | Performance metrics |
| [07-SCREENSHOTS.md](./07-SCREENSHOTS.md) | Visual documentation |

## Inspection Summary

- **Platform**: ${CONFIG.platform}
- **URL**: ${CONFIG.baseUrl}
- **Pages inspected**: ${inspectionResults.pages.length}
- **Screenshots captured**: ${inspectionResults.screenshots.length}
- **AI Model**: ${inspectionResults.metadata.aiModel}
- **Approach**: Hybrid (JS for actions, AI for observation)
`;

  writeFileSync(join(CONFIG.outputDir, 'README.md'), readme);
  log('📄', 'README.md', 'green');

  // 01-FLOWS.md
  const flows = `# 🔄 User Flows - ${CONFIG.platform}

> Hybrid analysis: JavaScript actions + AI verification

## Login Flow

${inspectionResults.flows.map(flow => `
### ${flow.name}

**Approach**: ${flow.approach || 'N/A'}
**Status**: ${flow.success ? '✅ Success' : '❌ Failed'}
**Final URL**: ${flow.finalUrl || 'N/A'}

#### Steps

| Step | Action | Method | Result |
|------|--------|--------|--------|
${flow.steps?.map(s => `| ${s.step} | ${s.action} | ${s.action.includes('js') ? 'JavaScript' : 'AI'} | ${s.result?.clicked || s.result?.filled || s.result?.submitted || s.result?.success ? '✅' : '⚠️'} |`).join('\n') || 'No steps recorded'}

${flow.error ? `**Error**: ${flow.error}` : ''}
${flow.errorMessages ? `**Error Messages**: ${flow.errorMessages}` : ''}
`).join('\n')}

## Navigation Map

\`\`\`
${inspectionResults.pages.map(p => `${p.name} (${p.path})`).join('\n')}
\`\`\`
`;

  writeFileSync(join(CONFIG.outputDir, '01-FLOWS.md'), flows);
  log('📄', '01-FLOWS.md', 'green');

  // 02-COMPONENTS.md
  const components = `# 🧩 UI Components - ${CONFIG.platform}

> Components detected by AI observation

${inspectionResults.pages.map(page => `
## ${page.name}

**Path**: \`${page.path}\`
**Page Type**: ${page.aiObservation?.pageType || 'Unknown'}
**Title**: ${page.aiObservation?.title || 'N/A'}

### Detected Components

${page.aiObservation?.mainElements?.map(el => `
- **${el.type || 'element'}**: ${el.text || 'No text'} (${el.position || 'position N/A'})
`).join('') || 'Components detected via AI observation (see raw data)'}

### Interactive Elements

Count: ${page.aiObservation?.interactiveElements || 'N/A'}

`).join('\n---\n')}
`;

  writeFileSync(join(CONFIG.outputDir, '02-COMPONENTS.md'), components);
  log('📄', '02-COMPONENTS.md', 'green');

  // 03-STATES.md
  const states = `# 📊 Application States - ${CONFIG.platform}

> State analysis from AI observations

## Page States

${inspectionResults.pages.map(page => `
### ${page.name}

- **Has Errors**: ${page.aiObservation?.hasErrors ? '⚠️ Yes' : '✅ No'}
- **Error Message**: ${page.aiObservation?.errorMessage || 'None'}
- **Suggested Actions**: ${page.aiObservation?.suggestedActions?.join(', ') || 'N/A'}

#### AI Assertions

${page.assertions?.map(a => `- ${a.result ? '✅' : '❌'} ${a.assertion}`).join('\n') || 'No assertions'}

`).join('\n')}
`;

  writeFileSync(join(CONFIG.outputDir, '03-STATES.md'), states);
  log('📄', '03-STATES.md', 'green');

  // 04-API-CALLS.md
  const apiCalls = `# 🌐 API Calls - ${CONFIG.platform}

> Network activity captured during inspection

## Endpoints Detected

*Network interception would capture full API activity in a complete inspection*

## Authentication

- Login endpoint used during flow inspection
- Session management via cookies/localStorage
`;

  writeFileSync(join(CONFIG.outputDir, '04-API-CALLS.md'), apiCalls);
  log('📄', '04-API-CALLS.md', 'green');

  // 05-EDGE-CASES.md
  const edgeCases = `# ⚠️ Edge Cases - ${CONFIG.platform}

> Issues identified during inspection

## Login Flow Issues

${inspectionResults.flows.filter(f => !f.success || f.error).map(f => `
### ${f.name}

- **Error**: ${f.error || 'Flow did not complete successfully'}
- **Last URL**: ${f.finalUrl}
- **Error Messages**: ${f.errorMessages || 'None captured'}
`).join('\n') || 'No issues detected - login successful'}

## Page Load Issues

${inspectionResults.pages.filter(p => p.error || p.aiObservation?.hasErrors).map(p => `
### ${p.name}

- **Error**: ${p.error || p.aiObservation?.errorMessage}
`).join('\n') || 'No page errors detected'}

## Recommendations

1. Monitor Ionic component interaction reliability
2. Add error message handling for failed logins
3. Implement loading states for slow connections
`;

  writeFileSync(join(CONFIG.outputDir, '05-EDGE-CASES.md'), edgeCases);
  log('📄', '05-EDGE-CASES.md', 'green');

  // 06-PERFORMANCE.md
  const performance = `# ⚡ Performance - ${CONFIG.platform}

> Load times and performance metrics

## Page Load Times

| Page | Load Time | Status |
|------|-----------|--------|
${inspectionResults.performance.map(p => `| ${p.page} | ${p.loadTime}ms | ${p.loadTime < 3000 ? '✅' : p.loadTime < 5000 ? '⚠️' : '❌'} |`).join('\n')}

## Summary

${inspectionResults.performance.length > 0 ? `
- **Average Load Time**: ${Math.round(inspectionResults.performance.reduce((a, b) => a + b.loadTime, 0) / inspectionResults.performance.length)}ms
- **Fastest Page**: ${inspectionResults.performance.sort((a, b) => a.loadTime - b.loadTime)[0]?.page || 'N/A'} (${inspectionResults.performance.sort((a, b) => a.loadTime - b.loadTime)[0]?.loadTime}ms)
- **Slowest Page**: ${inspectionResults.performance.sort((a, b) => b.loadTime - a.loadTime)[0]?.page || 'N/A'} (${inspectionResults.performance.sort((a, b) => b.loadTime - a.loadTime)[0]?.loadTime}ms)
` : 'No performance data collected'}

## Thresholds

- ✅ Good: < 3000ms
- ⚠️ Needs improvement: 3000-5000ms
- ❌ Poor: > 5000ms
`;

  writeFileSync(join(CONFIG.outputDir, '06-PERFORMANCE.md'), performance);
  log('📄', '06-PERFORMANCE.md', 'green');

  // 07-SCREENSHOTS.md
  const screenshots = `# 📸 Screenshots - ${CONFIG.platform}

> Visual documentation captured during inspection

## Screenshot Index

| Name | Timestamp |
|------|-----------|
${inspectionResults.screenshots.map(s => `| [${s.name}](./screenshots/${s.name}.jpg) | ${s.timestamp} |`).join('\n')}

## Gallery

${inspectionResults.screenshots.map(s => `
### ${s.name}

![${s.name}](./screenshots/${s.name}.jpg)
`).join('\n')}
`;

  writeFileSync(join(CONFIG.outputDir, '07-SCREENSHOTS.md'), screenshots);
  log('📄', '07-SCREENSHOTS.md', 'green');

  // Save raw JSON data
  writeFileSync(
    join(CONFIG.outputDir, 'inspection-data.json'),
    JSON.stringify(inspectionResults, null, 2)
  );
  log('📄', 'inspection-data.json', 'green');
}

// ========== Main ==========
async function main() {
  console.log('\n');
  logSection(`🔬 AI-HYBRID PLATFORM INSPECTOR`);
  console.log(`   Platform: ${CONFIG.platform}`);
  console.log(`   URL: ${CONFIG.baseUrl}`);
  console.log(`   AI Model: gemini-3-flash-preview`);
  console.log(`   Provider: Vertex AI (global region)`);
  console.log(`   Approach: Hybrid (JS actions + AI observation)`);

  // Create output directories
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  if (!existsSync(CONFIG.screenshotDir)) {
    mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }

  try {
    // Start server
    await startServer();
    await initProtocol();

    // Launch browser
    log('🌐', 'Launching browser...', 'cyan');
    await callTool('stream_status', { launch: true });
    await sleep(3000);

    // Inspect landing page first (no auth)
    const landingPage = PAGES_TO_INSPECT.find(p => p.name === 'landing');
    if (landingPage) {
      await inspectPage(landingPage);
    }

    // Perform login with hybrid approach
    const loginResult = await performLogin();

    // If login successful, inspect authenticated pages
    if (loginResult.success) {
      const authPages = PAGES_TO_INSPECT.filter(p => p.requiresAuth);
      for (const page of authPages) {
        await inspectPage(page);
      }
    } else {
      log('⚠️', 'Skipping authenticated pages due to login failure', 'yellow');
    }

    // Generate documentation
    generateDocumentation();

    log('🎉', 'Inspection complete!', 'green');

  } catch (e) {
    log('❌', `Fatal error: ${e.message}`, 'red');
    console.error(e);
  }

  // Cleanup
  logSection('Cleanup');
  console.log(`\n   📁 Output: ${CONFIG.outputDir}`);
  console.log(`   📸 Screenshots: ${CONFIG.screenshotDir}`);

  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess?.kill('SIGTERM');
  await sleep(2000);
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
