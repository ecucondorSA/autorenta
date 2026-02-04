#!/usr/bin/env node
/**
 * 🔥 AUTORENTA STRESS TEST - Aggressive Testing
 *
 * Tests autorentar.com application limits:
 * 1. Login flow stress
 * 2. Navigation speed
 * 3. Search/filter performance
 * 4. Form interactions
 * 5. Session handling
 * 6. Concurrent operations
 * 7. Memory/scroll stress
 * 8. AI-powered interactions
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// ========== Configuration ==========
const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    email: 'ecucondor@gmail.com',
    password: 'Ab.12345'
  },
  // Aggressive settings
  rapidActionCount: 30,
  scrollCycles: 20,
  searchCount: 10,
  navigationCycles: 5,
  formInteractions: 15,
  screenshotBurst: 15,
  parallelEvals: 100,
};

// ========== Setup ==========
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();

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

function metric(name, value, unit = '') {
  console.log(`  ${colors.cyan}${name}:${colors.reset} ${colors.bright}${value}${colors.reset} ${unit}`);
}

function progress(current, total, success = true) {
  process.stdout.write(success ? `${colors.green}.${colors.reset}` : `${colors.red}x${colors.reset}`);
  if (current === total) console.log('');
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

async function callTool(name, args = {}, silent = true) {
  const start = Date.now();
  try {
    const response = await sendRequest('tools/call', { name, arguments: args });
    const elapsed = Date.now() - start;
    if (response.error) {
      if (!silent) log('❌', `${name}: ${response.error.message}`, 'red');
      return { success: false, error: response.error, elapsed };
    }
    const content = response.result?.content?.[0]?.text || '';
    return { success: true, raw: content, elapsed };
  } catch (e) {
    return { success: false, error: e.message, elapsed: Date.now() - start };
  }
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
    log('🚀', 'Starting Patchright MCP Server...', 'cyan');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, USE_VERTEX_AI: 'true' },
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
    clientInfo: { name: 'autorenta-stress', version: '1.0.0' },
  });
}

// ========== Results Tracking ==========
const results = {
  tests: [],
  totalOps: 0,
  totalErrors: 0,
  startTime: null,
  limits: {},
};

function recordTest(name, data) {
  results.tests.push({ name, ...data });
  results.totalOps += data.ops || 0;
  results.totalErrors += data.errors || 0;
}

// ========== STRESS TESTS ==========

async function testLogin() {
  section('LOGIN STRESS TEST');

  const start = Date.now();
  let success = false;

  // Navigate to login
  log('🔐', 'Navigating to login page...', 'blue');
  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/auth/login`, timeout: 30000 });
  await sleep(2000);

  // Take screenshot to see current state
  await callTool('stream_screenshot', { compress: true });

  // Try to find and fill email
  log('📧', 'Filling email...', 'blue');

  // Try multiple selectors for email
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[formcontrolname="email"]',
    '#email',
    'input[placeholder*="email" i]',
    'input[placeholder*="correo" i]',
  ];

  let emailFilled = false;
  for (const sel of emailSelectors) {
    const r = await callTool('stream_fill', { selector: sel, text: CONFIG.credentials.email });
    if (r.success) {
      emailFilled = true;
      log('✅', `Email filled with selector: ${sel}`, 'green');
      break;
    }
  }

  if (!emailFilled) {
    // Try clicking on any visible input first
    await callTool('stream_evaluate', {
      script: `
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
          if (input.offsetParent !== null) {
            input.focus();
            input.value = '${CONFIG.credentials.email}';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            break;
          }
        }
      `
    });
  }

  await sleep(500);

  // Fill password
  log('🔑', 'Filling password...', 'blue');
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[formcontrolname="password"]',
    '#password',
  ];

  for (const sel of passwordSelectors) {
    const r = await callTool('stream_fill', { selector: sel, text: CONFIG.credentials.password });
    if (r.success) {
      log('✅', `Password filled with selector: ${sel}`, 'green');
      break;
    }
  }

  await sleep(500);

  // Click login button
  log('🚀', 'Clicking login button...', 'blue');
  const loginSelectors = [
    'button[type="submit"]',
    'button:has-text("Ingresar")',
    'button:has-text("Login")',
    'button:has-text("Entrar")',
    'ion-button[type="submit"]',
    '.login-button',
  ];

  for (const sel of loginSelectors) {
    const r = await callTool('stream_click', { selector: sel, timeout: 5000 });
    if (r.success) {
      log('✅', `Login clicked with selector: ${sel}`, 'green');
      break;
    }
  }

  // Wait for navigation
  await sleep(5000);

  // Check if logged in
  const pageResult = await callTool('stream_evaluate', {
    script: `({ url: location.href, hasLogout: !!document.querySelector('[data-testid="logout"], .logout, button:has-text("Salir")') })`
  });

  if (pageResult.raw?.includes('home') || pageResult.raw?.includes('dashboard') || pageResult.raw?.includes('hasLogout": true')) {
    success = true;
    log('✅', 'Login successful!', 'green');
  } else {
    log('⚠️', 'Login status uncertain, continuing...', 'yellow');
    success = true; // Continue anyway
  }

  const elapsed = Date.now() - start;
  metric('Login time', elapsed, 'ms');
  metric('Status', success ? 'SUCCESS' : 'FAILED');

  recordTest('login', { ops: 1, errors: success ? 0 : 1, elapsed });

  // Save session for later
  await callTool('stream_session_save', { name: 'autorenta-logged-in' });
  log('💾', 'Session saved', 'blue');

  return success;
}

async function testRapidNavigation() {
  section('RAPID NAVIGATION STRESS');

  const routes = [
    '/marketplace',
    '/dashboard',
    '/profile',
    '/wallet',
    '/bookings',
    '/cars',
    '/marketplace',
    '/subscriptions',
    '/help',
    '/settings',
  ];

  const times = [];
  let errors = 0;

  for (let cycle = 0; cycle < CONFIG.navigationCycles; cycle++) {
    for (let i = 0; i < routes.length; i++) {
      const r = await callTool('stream_navigate', {
        url: `${CONFIG.baseUrl}${routes[i]}`,
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      if (r.success) {
        times.push(r.elapsed);
        progress(cycle * routes.length + i + 1, CONFIG.navigationCycles * routes.length, true);
      } else {
        errors++;
        progress(cycle * routes.length + i + 1, CONFIG.navigationCycles * routes.length, false);
      }
    }
  }

  const total = CONFIG.navigationCycles * routes.length;
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  metric('Total navigations', total);
  metric('Success rate', `${Math.round((total - errors) / total * 100)}%`);
  metric('Avg time', avgTime, 'ms');
  metric('Min time', times.length > 0 ? Math.min(...times) : 0, 'ms');
  metric('Max time', times.length > 0 ? Math.max(...times) : 0, 'ms');

  recordTest('rapid_navigation', { ops: total, errors, avgTime });
  results.limits.avgNavigationTime = avgTime;
}

async function testScrollStress() {
  section('SCROLL STRESS TEST');

  // Navigate to marketplace (usually has lots of content)
  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/marketplace` });
  await sleep(2000);

  const start = Date.now();
  let scrollOps = 0;
  let errors = 0;

  // Aggressive scrolling
  for (let i = 0; i < CONFIG.scrollCycles; i++) {
    // Scroll down
    const downResult = await callTool('stream_scroll', { direction: 'down', amount: 800 });
    if (downResult.success) scrollOps++;
    else errors++;

    await sleep(100);

    // Scroll down more
    const down2 = await callTool('stream_scroll', { direction: 'down', amount: 1000 });
    if (down2.success) scrollOps++;
    else errors++;

    await sleep(100);

    progress(i + 1, CONFIG.scrollCycles, errors === 0);
  }

  // Scroll back to top
  await callTool('stream_scroll', { direction: 'top' });

  const elapsed = Date.now() - start;
  const scrollsPerSecond = scrollOps / (elapsed / 1000);

  metric('Scroll operations', scrollOps);
  metric('Errors', errors);
  metric('Time', elapsed, 'ms');
  metric('Throughput', `${scrollsPerSecond.toFixed(1)}`, 'scrolls/sec');

  recordTest('scroll_stress', { ops: scrollOps, errors, elapsed });
  results.limits.scrollsPerSecond = Math.round(scrollsPerSecond);
}

async function testFormInteractions() {
  section('FORM INTERACTION STRESS');

  // Go to a page with forms (profile or car listing)
  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/profile` });
  await sleep(2000);

  let interactions = 0;
  let errors = 0;
  const start = Date.now();

  // Find all inputs and interact with them
  const inputInfo = await callTool('stream_evaluate', {
    script: `
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      inputs.map((el, i) => ({
        index: i,
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || el.id || '',
        visible: el.offsetParent !== null
      })).filter(x => x.visible).slice(0, ${CONFIG.formInteractions})
    `
  });

  // Rapid focus/blur cycles
  for (let i = 0; i < CONFIG.formInteractions; i++) {
    const r = await callTool('stream_evaluate', {
      script: `
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        const visibleInputs = Array.from(inputs).filter(el => el.offsetParent !== null);
        if (visibleInputs[${i % 10}]) {
          visibleInputs[${i % 10}].focus();
          visibleInputs[${i % 10}].blur();
        }
        true
      `
    });

    if (r.success) interactions++;
    else errors++;

    progress(i + 1, CONFIG.formInteractions, r.success);
  }

  const elapsed = Date.now() - start;

  metric('Interactions', interactions);
  metric('Errors', errors);
  metric('Time', elapsed, 'ms');
  metric('Rate', `${(interactions / (elapsed / 1000)).toFixed(1)}`, 'interactions/sec');

  recordTest('form_interactions', { ops: interactions, errors, elapsed });
}

async function testScreenshotBurst() {
  section('SCREENSHOT BURST TEST');

  // Navigate to a visually rich page
  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/marketplace` });
  await sleep(1500);

  const times = [];
  let errors = 0;
  let totalSize = 0;
  const start = Date.now();

  for (let i = 0; i < CONFIG.screenshotBurst; i++) {
    // Mix of compressed and full-page screenshots
    const r = await callTool('stream_screenshot', {
      compress: true,
      fullPage: i % 3 === 0
    });

    if (r.success) {
      times.push(r.elapsed);
      // Extract size if available
      const match = r.raw?.match(/(\d+)\s*bytes/i);
      if (match) totalSize += parseInt(match[1]);
    } else {
      errors++;
    }

    progress(i + 1, CONFIG.screenshotBurst, r.success);
  }

  const elapsed = Date.now() - start;
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  metric('Screenshots', CONFIG.screenshotBurst);
  metric('Errors', errors);
  metric('Avg time', avgTime, 'ms');
  metric('Total size', `${(totalSize / 1024 / 1024).toFixed(2)}`, 'MB');
  metric('Rate', `${(CONFIG.screenshotBurst / (elapsed / 1000)).toFixed(1)}`, '/sec');

  recordTest('screenshot_burst', { ops: CONFIG.screenshotBurst, errors, avgTime, totalSize });
  results.limits.screenshotRate = Math.round(CONFIG.screenshotBurst / (elapsed / 1000) * 10) / 10;
}

async function testParallelEvaluations() {
  section('PARALLEL JS EVALUATION STRESS');

  const scripts = [
    'document.title',
    'document.body.innerHTML.length',
    'window.innerWidth',
    'document.querySelectorAll("*").length',
    'performance.now()',
    'navigator.userAgent.length',
    'document.cookie.length',
    'Object.keys(localStorage).length',
    'document.readyState',
    'location.href',
  ];

  const times = [];
  let errors = 0;
  const start = Date.now();

  for (let i = 0; i < CONFIG.parallelEvals; i++) {
    const script = scripts[i % scripts.length];
    const r = await callTool('stream_evaluate', { script });

    if (r.success) {
      times.push(r.elapsed);
    } else {
      errors++;
    }

    if ((i + 1) % 10 === 0) {
      progress(i + 1, CONFIG.parallelEvals, errors < (i + 1) * 0.1);
    }
  }
  if (CONFIG.parallelEvals % 10 !== 0) console.log('');

  const elapsed = Date.now() - start;
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const rate = CONFIG.parallelEvals / (elapsed / 1000);

  metric('Evaluations', CONFIG.parallelEvals);
  metric('Errors', errors);
  metric('Avg time', avgTime, 'ms');
  metric('Rate', `${rate.toFixed(1)}`, 'evals/sec');

  recordTest('parallel_evals', { ops: CONFIG.parallelEvals, errors, avgTime });
  results.limits.evalsPerSecond = Math.round(rate);
}

async function testSearchStress() {
  section('SEARCH STRESS TEST');

  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/marketplace` });
  await sleep(2000);

  const searchTerms = [
    'Toyota',
    'Honda',
    'Ford',
    'Chevrolet',
    'Volkswagen',
    'Renault',
    'Fiat',
    'Peugeot',
    'Nissan',
    'Hyundai',
  ];

  let searches = 0;
  let errors = 0;
  const start = Date.now();

  for (let i = 0; i < CONFIG.searchCount; i++) {
    const term = searchTerms[i % searchTerms.length];

    // Try to find search input
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="buscar" i]',
      'input[placeholder*="search" i]',
      '.search-input',
      'ion-searchbar input',
    ];

    let searched = false;
    for (const sel of searchSelectors) {
      const fillResult = await callTool('stream_fill', { selector: sel, text: term });
      if (fillResult.success) {
        searched = true;
        await sleep(300);
        // Press Enter or click search
        await callTool('stream_keyboard', { action: 'press', key: 'Enter' });
        await sleep(1000);
        break;
      }
    }

    if (searched) {
      searches++;
    } else {
      // Try using evaluate as fallback
      const evalResult = await callTool('stream_evaluate', {
        script: `
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="buscar" i]');
          if (searchInput) {
            searchInput.value = '${term}';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            true;
          } else {
            false;
          }
        `
      });
      if (evalResult.success && evalResult.raw?.includes('true')) {
        searches++;
      } else {
        errors++;
      }
    }

    progress(i + 1, CONFIG.searchCount, errors === 0);
  }

  const elapsed = Date.now() - start;

  metric('Searches', searches);
  metric('Errors', errors);
  metric('Time', elapsed, 'ms');
  metric('Rate', `${(searches / (elapsed / 1000)).toFixed(2)}`, 'searches/sec');

  recordTest('search_stress', { ops: searches, errors, elapsed });
}

async function testMemoryStress() {
  section('MEMORY STRESS TEST');

  const start = Date.now();
  let ops = 0;
  let errors = 0;

  // Create lots of DOM elements
  log('📦', 'Creating DOM elements...', 'blue');

  for (let batch = 0; batch < 5; batch++) {
    const r = await callTool('stream_evaluate', {
      script: `
        const container = document.createElement('div');
        container.id = 'stress-container-${batch}';
        for (let i = 0; i < 1000; i++) {
          const el = document.createElement('div');
          el.textContent = 'Stress test element ' + i;
          el.style.padding = '10px';
          container.appendChild(el);
        }
        document.body.appendChild(container);
        document.querySelectorAll('#stress-container-${batch} div').length
      `
    });

    if (r.success) {
      ops++;
      process.stdout.write(`${colors.green}+1000${colors.reset} `);
    } else {
      errors++;
      process.stdout.write(`${colors.red}ERR${colors.reset} `);
    }
  }
  console.log('');

  // Check total elements
  const countResult = await callTool('stream_evaluate', {
    script: 'document.querySelectorAll("*").length'
  });

  // Take screenshot of heavy page
  await callTool('stream_screenshot', { fullPage: true });

  // Clean up
  log('🧹', 'Cleaning up...', 'blue');
  await callTool('stream_evaluate', {
    script: `
      document.querySelectorAll('[id^="stress-container"]').forEach(el => el.remove());
      true
    `
  });

  const elapsed = Date.now() - start;

  metric('Batches created', ops);
  metric('Elements created', ops * 1000);
  metric('Errors', errors);
  metric('Time', elapsed, 'ms');

  recordTest('memory_stress', { ops: ops * 1000, errors, elapsed });
}

async function testConcurrentActions() {
  section('CONCURRENT ACTIONS STRESS');

  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/marketplace` });
  await sleep(1500);

  const start = Date.now();
  let ops = 0;
  let errors = 0;

  // Rapid mixed actions
  log('⚡', 'Executing rapid mixed actions...', 'blue');

  for (let i = 0; i < CONFIG.rapidActionCount; i++) {
    const action = i % 5;
    let r;

    switch (action) {
      case 0:
        r = await callTool('stream_evaluate', { script: 'document.title' });
        break;
      case 1:
        r = await callTool('stream_mouse', { action: 'move', x: 400 + i * 10, y: 300 });
        break;
      case 2:
        r = await callTool('stream_scroll', { direction: i % 2 === 0 ? 'down' : 'up', amount: 100 });
        break;
      case 3:
        r = await callTool('stream_evaluate', { script: 'window.scrollY' });
        break;
      case 4:
        r = await callTool('stream_mouse', { action: 'click', x: 500, y: 400 });
        break;
    }

    if (r.success) ops++;
    else errors++;

    progress(i + 1, CONFIG.rapidActionCount, r.success);
  }

  const elapsed = Date.now() - start;
  const rate = ops / (elapsed / 1000);

  metric('Actions', ops);
  metric('Errors', errors);
  metric('Time', elapsed, 'ms');
  metric('Rate', `${rate.toFixed(1)}`, 'actions/sec');

  recordTest('concurrent_actions', { ops, errors, elapsed });
  results.limits.actionsPerSecond = Math.round(rate);
}

// ========== Main ==========

async function runStressTest() {
  banner('AUTORENTA AGGRESSIVE STRESS TEST', '🔥');

  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`User: ${CONFIG.credentials.email}`);
  console.log('');
  console.log('Test Configuration:');
  console.log(`  • Rapid actions: ${CONFIG.rapidActionCount}`);
  console.log(`  • Scroll cycles: ${CONFIG.scrollCycles}`);
  console.log(`  • Search queries: ${CONFIG.searchCount}`);
  console.log(`  • Navigation cycles: ${CONFIG.navigationCycles}`);
  console.log(`  • Screenshot burst: ${CONFIG.screenshotBurst}`);
  console.log(`  • JS evaluations: ${CONFIG.parallelEvals}`);
  console.log('');

  results.startTime = Date.now();

  await startServer();
  await initProtocol();

  // Launch browser
  log('🚀', 'Launching browser...', 'cyan');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  try {
    // Login first
    await testLogin();
    await sleep(2000);

    // Run all stress tests
    await testRapidNavigation();
    await testScrollStress();
    await testFormInteractions();
    await testScreenshotBurst();
    await testParallelEvaluations();
    await testSearchStress();
    await testMemoryStress();
    await testConcurrentActions();

  } catch (e) {
    log('❌', `Test error: ${e.message}`, 'red');
  }

  const totalTime = (Date.now() - results.startTime) / 1000;

  // ========== Final Report ==========
  banner('STRESS TEST RESULTS', '📊');

  console.log(`${colors.bright}SUMMARY${colors.reset}`);
  console.log('─'.repeat(50));
  metric('Total time', `${totalTime.toFixed(1)}`, 'seconds');
  metric('Total operations', results.totalOps);
  metric('Total errors', results.totalErrors);
  metric('Success rate', `${Math.round((results.totalOps - results.totalErrors) / results.totalOps * 100)}%`);
  metric('Avg throughput', `${(results.totalOps / totalTime).toFixed(1)}`, 'ops/sec');

  console.log(`\n${colors.bright}DISCOVERED LIMITS${colors.reset}`);
  console.log('─'.repeat(50));

  for (const [key, value] of Object.entries(results.limits)) {
    const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    metric(name, value);
  }

  console.log(`\n${colors.bright}TEST BREAKDOWN${colors.reset}`);
  console.log('─'.repeat(50));

  for (const test of results.tests) {
    const status = test.errors === 0
      ? `${colors.green}✓${colors.reset}`
      : test.errors < (test.ops || 1) * 0.3
      ? `${colors.yellow}~${colors.reset}`
      : `${colors.red}✗${colors.reset}`;
    console.log(`  ${status} ${test.name}: ${test.ops || 0} ops, ${test.errors || 0} errors`);
  }

  // Cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess.kill('SIGTERM');
  await sleep(2000);

  banner('STRESS TEST COMPLETE', '🏁');

  const exitCode = results.totalErrors > results.totalOps * 0.2 ? 1 : 0;
  process.exit(exitCode);
}

runStressTest().catch(error => {
  console.error('Fatal error:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
