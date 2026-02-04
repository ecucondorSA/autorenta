#!/usr/bin/env node
/**
 * 🔬 AI-POWERED PLATFORM INSPECTOR
 *
 * Professional platform inspection using Patchright MCP AI tools:
 * - stream_observe: AI page analysis
 * - stream_do: AI-powered actions
 * - stream_ai_wait: AI condition waiting
 * - stream_ai_assert: AI verification
 * - stream_ai_plan: AI action planning
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

// Pages to inspect
const PAGES_TO_INSPECT = [
  { name: 'landing', path: '/', description: 'Landing page pública', requiresAuth: false },
  { name: 'auth_login', path: '/auth/login', description: 'Flujo de autenticación', requiresAuth: false },
  { name: 'cars_list', path: '/cars/list', description: 'Lista de autos (mapa)', requiresAuth: true },
  { name: 'home_marketplace', path: '/home/marketplace', description: 'Marketplace', requiresAuth: true },
  { name: 'home_profile', path: '/home/profile', description: 'Perfil de usuario', requiresAuth: true },
  { name: 'home_bookings', path: '/home/bookings', description: 'Mis reservas', requiresAuth: true },
  { name: 'home_wallet', path: '/home/wallet', description: 'Billetera', requiresAuth: true },
  { name: 'home_cars', path: '/home/cars', description: 'Mis autos', requiresAuth: true },
  { name: 'home_notifications', path: '/home/notifications', description: 'Notificaciones', requiresAuth: true },
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

// ========== AI Tool Wrappers ==========

/**
 * AI-powered page observation - analyzes the current page
 */
async function aiObserve() {
  log('🔍', 'AI observing page...', 'magenta');
  const result = await callTool('stream_observe', {});
  if (result.success) {
    try {
      return JSON.parse(result.raw);
    } catch {
      return { raw: result.raw };
    }
  }
  return { error: result.error };
}

/**
 * AI-powered action execution
 */
async function aiDo(instruction) {
  log('🤖', `AI action: ${instruction}`, 'blue');
  const result = await callTool('stream_do', { instruction });
  return result;
}

/**
 * AI-powered wait for condition
 */
async function aiWait(condition, timeout = 30000) {
  log('⏳', `AI waiting: ${condition}`, 'yellow');
  const result = await callTool('stream_ai_wait', {
    condition,
    timeout,
    pollInterval: 2000
  });
  return result;
}

/**
 * AI-powered assertion
 */
async function aiAssert(assertion) {
  log('✓', `AI assert: ${assertion}`, 'green');
  const result = await callTool('stream_ai_assert', { assertion });
  return result;
}

/**
 * AI-powered planning
 */
async function aiPlan(goal) {
  log('📋', `AI planning: ${goal}`, 'cyan');
  const result = await callTool('stream_ai_plan', { goal });
  if (result.success) {
    try {
      return JSON.parse(result.raw);
    } catch {
      return { raw: result.raw };
    }
  }
  return { error: result.error };
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
      } catch (e) {
        log('⚠️', `Screenshot save failed: ${e.message}`, 'yellow');
      }
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
 * Get current URL
 */
async function getCurrentUrl() {
  const result = await callTool('stream_evaluate', { script: 'location.href' });
  return result.raw?.replace(/["\n]/g, '') || '';
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
        log('🧠', output.trim(), 'dim');
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
    clientInfo: { name: 'ai-inspector', version: '2.0.0' },
  });
}

// ========== Inspection Functions ==========

/**
 * Inspect a single page with AI
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
    interactions: [],
    assertions: [],
  };

  try {
    // Navigate
    pageResult.loadTime = await navigate(pageResult.url);
    log('⏱️', `Load time: ${pageResult.loadTime}ms`, 'dim');

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
    if (observation.suggestedActions) {
      log('💡', `Suggested actions: ${observation.suggestedActions.join(', ')}`, 'dim');
    }

    // Take screenshot
    await takeScreenshot(`${name}_01_initial`);

    // Performance data
    inspectionResults.performance.push({
      page: name,
      loadTime: pageResult.loadTime,
      timestamp: pageResult.timestamp,
    });

    // AI assertions for common checks
    const assertions = [
      'The page has loaded completely without errors',
      'The page has visible navigation elements',
      'The page content is readable and properly formatted',
    ];

    for (const assertion of assertions) {
      const assertResult = await aiAssert(assertion);
      pageResult.assertions.push({
        assertion,
        result: assertResult.success,
        details: assertResult.raw,
      });
    }

  } catch (e) {
    log('❌', `Error inspecting ${name}: ${e.message}`, 'red');
    pageResult.error = e.message;
  }

  inspectionResults.pages.push(pageResult);
  return pageResult;
}

/**
 * Perform AI-powered login
 */
async function performLogin() {
  logSection('AI-Powered Login Flow');

  const loginFlow = {
    name: 'authentication',
    steps: [],
    success: false,
  };

  try {
    // Navigate to login
    await navigate(`${CONFIG.baseUrl}/auth/login`);
    await sleep(4000);
    await takeScreenshot('login_01_initial');

    // AI Plan for login
    const plan = await aiPlan('Login to the application using email and password');
    loginFlow.plan = plan;
    log('📋', `Plan created with ${plan.steps?.length || 0} steps`, 'cyan');

    // Step 1: Click Ingresar in modal
    log('📍', 'Step 1: Handle auth selector modal', 'blue');
    let stepResult = await aiDo('Click the green "Ingresar" button in the modal to access the login form');
    loginFlow.steps.push({ step: 1, action: 'click_ingresar_modal', result: stepResult });
    await sleep(3000);
    await takeScreenshot('login_02_after_modal');

    // Verify login form appeared
    const formCheck = await aiAssert('A login form with email and password fields is now visible');
    loginFlow.steps.push({ step: 'verify', action: 'form_visible', result: formCheck });

    // Step 2: Fill email
    log('📍', 'Step 2: Fill email', 'blue');
    stepResult = await aiDo(`Type "${CONFIG.credentials.email}" into the email input field`);
    loginFlow.steps.push({ step: 2, action: 'fill_email', result: stepResult });
    await sleep(500);

    // Step 3: Fill password
    log('📍', 'Step 3: Fill password', 'blue');
    stepResult = await aiDo(`Type "${CONFIG.credentials.password}" into the password input field`);
    loginFlow.steps.push({ step: 3, action: 'fill_password', result: stepResult });
    await sleep(500);
    await takeScreenshot('login_03_form_filled');

    // Step 4: Submit
    log('📍', 'Step 4: Submit login', 'blue');
    stepResult = await aiDo('Click the submit or login button to complete the login');
    loginFlow.steps.push({ step: 4, action: 'submit', result: stepResult });

    // Wait for navigation
    log('📍', 'Step 5: Wait for login completion', 'blue');
    const waitResult = await aiWait('The page has navigated away from the login page to a dashboard or home page', 15000);
    loginFlow.steps.push({ step: 5, action: 'wait_navigation', result: waitResult });

    await sleep(3000);
    await takeScreenshot('login_04_after_submit');

    // Verify success
    const currentUrl = await getCurrentUrl();
    loginFlow.finalUrl = currentUrl;
    loginFlow.success = !currentUrl.includes('/auth/login');

    if (loginFlow.success) {
      log('✅', `Login successful! Redirected to: ${currentUrl}`, 'green');
    } else {
      log('⚠️', `Login may have failed. Still at: ${currentUrl}`, 'yellow');
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
  const readme = `# 🔬 AI-Powered Platform Inspection - ${CONFIG.platform}

> Generated by Patchright MCP AI Inspector
> Model: ${inspectionResults.metadata.aiModel}
> Provider: ${inspectionResults.metadata.aiProvider}
> Timestamp: ${inspectionResults.metadata.timestamp}

## Documents

| Document | Description |
|----------|-------------|
| [01-FLOWS.md](./01-FLOWS.md) | User flows with AI analysis |
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
`;

  writeFileSync(join(CONFIG.outputDir, 'README.md'), readme);
  log('📄', 'README.md', 'green');

  // 01-FLOWS.md
  const flows = `# 🔄 User Flows - ${CONFIG.platform}

> AI-powered flow analysis using ${inspectionResults.metadata.aiModel}

## Login Flow

${inspectionResults.flows.map(flow => `
### ${flow.name}

**Status**: ${flow.success ? '✅ Success' : '❌ Failed'}
**Final URL**: ${flow.finalUrl || 'N/A'}

#### Steps

| Step | Action | Result |
|------|--------|--------|
${flow.steps?.map(s => `| ${s.step} | ${s.action} | ${s.result?.success ? '✅' : '❌'} |`).join('\n') || 'No steps recorded'}

${flow.error ? `**Error**: ${flow.error}` : ''}
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

### Detected Components

${page.aiObservation?.mainElements?.map(el => `
- **${el.type}**: ${el.text || 'No text'} (${el.position || 'unknown position'})
`).join('') || 'No components detected'}

### Interactive Elements

Count: ${page.aiObservation?.interactiveElements || 0}

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
- **Suggested Actions**: ${page.aiObservation?.suggestedActions?.join(', ') || 'None'}

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

*Network interception data would be captured here during a full inspection*

## Authentication

- Login endpoint used during flow inspection
- Token management observed
`;

  writeFileSync(join(CONFIG.outputDir, '04-API-CALLS.md'), apiCalls);
  log('📄', '04-API-CALLS.md', 'green');

  // 05-EDGE-CASES.md
  const edgeCases = `# ⚠️ Edge Cases - ${CONFIG.platform}

> Potential issues identified by AI

## Login Flow Issues

${inspectionResults.flows.filter(f => !f.success || f.error).map(f => `
### ${f.name}

- **Error**: ${f.error || 'Flow did not complete successfully'}
- **Last URL**: ${f.finalUrl}
`).join('\n') || 'No issues detected'}

## Page Load Issues

${inspectionResults.pages.filter(p => p.error || p.aiObservation?.hasErrors).map(p => `
### ${p.name}

- **Error**: ${p.error || p.aiObservation?.errorMessage}
`).join('\n') || 'No page errors detected'}

## Recommendations

1. Monitor login flow reliability
2. Check for slow-loading components
3. Verify error handling on all pages
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

- **Average Load Time**: ${Math.round(inspectionResults.performance.reduce((a, b) => a + b.loadTime, 0) / inspectionResults.performance.length)}ms
- **Fastest Page**: ${inspectionResults.performance.sort((a, b) => a.loadTime - b.loadTime)[0]?.page || 'N/A'}
- **Slowest Page**: ${inspectionResults.performance.sort((a, b) => b.loadTime - a.loadTime)[0]?.page || 'N/A'}

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
  logSection(`🔬 AI-POWERED PLATFORM INSPECTOR`);
  console.log(`   Platform: ${CONFIG.platform}`);
  console.log(`   URL: ${CONFIG.baseUrl}`);
  console.log(`   AI Model: gemini-3-flash-preview`);
  console.log(`   Provider: Vertex AI (global region)`);

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

    // Perform login
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
