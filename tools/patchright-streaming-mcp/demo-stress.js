#!/usr/bin/env node
/**
 * 🔥 STRESS TEST - Push the limits of Patchright Streaming MCP
 *
 * Tests:
 * 1. SPEED - How fast can we execute actions?
 * 2. VOLUME - Many operations in sequence
 * 3. MEMORY - Large pages, many screenshots
 * 4. CONCURRENCY - Multiple tabs simultaneously
 * 5. STABILITY - Long-running operations
 * 6. ERROR RECOVERY - Graceful handling of failures
 * 7. AI THROUGHPUT - Multiple AI calls (if available)
 * 8. SESSION SIZE - Large cookie/storage loads
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// ========== Configuration ==========
const STRESS_CONFIG = {
  // Speed tests
  rapidClickCount: 20,
  rapidTypeChars: 500,

  // Volume tests
  navigationCount: 15,
  screenshotCount: 10,
  evaluateCount: 50,

  // Concurrency
  maxTabs: 5,

  // Timing
  actionDelayMs: 50,

  // Limits
  maxTestTimeMs: 300000, // 5 minutes max
};

// ========== Setup ==========
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
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

async function callTool(name, args = {}, silent = false) {
  const start = Date.now();

  try {
    const response = await sendRequest('tools/call', { name, arguments: args });
    const elapsed = Date.now() - start;

    if (response.error) {
      if (!silent) log('❌', `${name} failed: ${response.error.message}`, 'red');
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
    setTimeout(() => !started && reject(new Error('Server start timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'stress-test', version: '1.0.0' },
  });
}

// ========== Stress Test Results ==========
const results = {
  tests: [],
  startTime: null,
  endTime: null,
  peakMemory: 0,
  totalOperations: 0,
  totalErrors: 0,
  limits: {},
};

function recordTest(name, data) {
  results.tests.push({ name, ...data, timestamp: Date.now() });
  results.totalOperations += data.operations || 1;
  if (data.errors) results.totalErrors += data.errors;
}

// ========== Individual Stress Tests ==========

async function testRapidNavigation() {
  section('RAPID NAVIGATION TEST');

  const urls = [
    'https://www.google.com',
    'https://www.github.com',
    'https://www.wikipedia.org',
    'https://www.reddit.com',
    'https://www.amazon.com',
    'https://www.youtube.com',
    'https://www.twitter.com',
    'https://www.linkedin.com',
    'https://www.stackoverflow.com',
    'https://www.medium.com',
    'https://www.netflix.com',
    'https://www.spotify.com',
    'https://www.twitch.tv',
    'https://www.discord.com',
    'https://www.slack.com',
  ];

  const times = [];
  let errors = 0;
  const count = Math.min(STRESS_CONFIG.navigationCount, urls.length);

  for (let i = 0; i < count; i++) {
    const r = await callTool('stream_navigate', {
      url: urls[i],
      waitUntil: 'domcontentloaded',
      timeout: 15000
    }, true);

    if (r.success) {
      times.push(r.elapsed);
      process.stdout.write(`${colors.green}.${colors.reset}`);
    } else {
      errors++;
      process.stdout.write(`${colors.red}x${colors.reset}`);
    }
  }
  console.log('');

  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;

  metric('Navigations', count);
  metric('Success rate', `${Math.round((count - errors) / count * 100)}%`);
  metric('Avg time', avgTime, 'ms');
  metric('Min time', minTime, 'ms');
  metric('Max time', maxTime, 'ms');
  metric('Throughput', `${(count / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(2)}`, 'nav/sec');

  recordTest('rapid_navigation', {
    operations: count,
    errors,
    avgTime,
    minTime,
    maxTime,
    throughput: count / (times.reduce((a, b) => a + b, 0) / 1000),
  });

  results.limits.maxNavigationsPerMinute = Math.round((count - errors) / (times.reduce((a, b) => a + b, 0) / 60000));
}

async function testRapidClicks() {
  section('RAPID CLICKS TEST');

  // Navigate to a page with clickable elements
  await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
  await sleep(1000);

  const times = [];
  let errors = 0;
  const count = STRESS_CONFIG.rapidClickCount;

  // Click on body multiple times (safe click target)
  for (let i = 0; i < count; i++) {
    const r = await callTool('stream_mouse', {
      action: 'click',
      x: 400 + (i % 10) * 20,
      y: 300 + Math.floor(i / 10) * 20
    }, true);

    if (r.success) {
      times.push(r.elapsed);
      process.stdout.write(`${colors.green}.${colors.reset}`);
    } else {
      errors++;
      process.stdout.write(`${colors.red}x${colors.reset}`);
    }
  }
  console.log('');

  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);

  metric('Clicks', count);
  metric('Success rate', `${Math.round((count - errors) / count * 100)}%`);
  metric('Avg time', avgTime, 'ms');
  metric('Throughput', `${(count / (totalTime / 1000)).toFixed(2)}`, 'clicks/sec');

  recordTest('rapid_clicks', {
    operations: count,
    errors,
    avgTime,
    throughput: count / (totalTime / 1000),
  });

  results.limits.maxClicksPerSecond = Math.round(count / (totalTime / 1000));
}

async function testRapidTyping() {
  section('RAPID TYPING TEST');

  await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
  await sleep(500);

  // Click search box
  await callTool('stream_click', { selector: 'textarea[name="q"], input[name="q"]' }, true);
  await sleep(200);

  const text = 'A'.repeat(STRESS_CONFIG.rapidTypeChars);
  const start = Date.now();

  const r = await callTool('stream_keyboard', {
    action: 'type',
    text: text,
    delay: 1 // Minimum delay
  }, true);

  const elapsed = Date.now() - start;
  const charsPerSecond = STRESS_CONFIG.rapidTypeChars / (elapsed / 1000);

  metric('Characters', STRESS_CONFIG.rapidTypeChars);
  metric('Time', elapsed, 'ms');
  metric('Speed', `${charsPerSecond.toFixed(0)}`, 'chars/sec');

  recordTest('rapid_typing', {
    operations: 1,
    errors: r.success ? 0 : 1,
    charsTyped: STRESS_CONFIG.rapidTypeChars,
    elapsed,
    charsPerSecond,
  });

  results.limits.maxCharsPerSecond = Math.round(charsPerSecond);
}

async function testMassScreenshots() {
  section('MASS SCREENSHOTS TEST');

  await callTool('stream_navigate', { url: 'https://www.wikipedia.org' }, true);
  await sleep(1000);

  const times = [];
  let totalSize = 0;
  let errors = 0;
  const count = STRESS_CONFIG.screenshotCount;

  for (let i = 0; i < count; i++) {
    const r = await callTool('stream_screenshot', {
      compress: true,
      fullPage: i % 2 === 0 // Alternate between viewport and full page
    }, true);

    if (r.success) {
      times.push(r.elapsed);
      // Extract size from result if available
      const sizeMatch = r.raw?.match(/size.*?(\d+)/i);
      if (sizeMatch) totalSize += parseInt(sizeMatch[1]);
      process.stdout.write(`${colors.green}.${colors.reset}`);
    } else {
      errors++;
      process.stdout.write(`${colors.red}x${colors.reset}`);
    }
  }
  console.log('');

  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);

  metric('Screenshots', count);
  metric('Success rate', `${Math.round((count - errors) / count * 100)}%`);
  metric('Avg time', avgTime, 'ms');
  metric('Total size', `${(totalSize / 1024 / 1024).toFixed(2)}`, 'MB');
  metric('Throughput', `${(count / (totalTime / 1000)).toFixed(2)}`, 'screenshots/sec');

  recordTest('mass_screenshots', {
    operations: count,
    errors,
    avgTime,
    totalSize,
    throughput: count / (totalTime / 1000),
  });

  results.limits.maxScreenshotsPerSecond = Math.round(count / (totalTime / 1000) * 10) / 10;
}

async function testMassEvaluate() {
  section('MASS JAVASCRIPT EVALUATION TEST');

  await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
  await sleep(500);

  const times = [];
  let errors = 0;
  const count = STRESS_CONFIG.evaluateCount;

  // Various JS operations to test
  const scripts = [
    'document.title',
    'window.innerWidth',
    'document.body.innerHTML.length',
    'Array.from(document.querySelectorAll("*")).length',
    'JSON.stringify(performance.timing)',
    'navigator.userAgent',
    'document.cookie.length',
    'window.location.href',
    'document.readyState',
    'Object.keys(window).length',
  ];

  for (let i = 0; i < count; i++) {
    const script = scripts[i % scripts.length];
    const r = await callTool('stream_evaluate', { script }, true);

    if (r.success) {
      times.push(r.elapsed);
      process.stdout.write(`${colors.green}.${colors.reset}`);
    } else {
      errors++;
      process.stdout.write(`${colors.red}x${colors.reset}`);
    }
  }
  console.log('');

  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);

  metric('Evaluations', count);
  metric('Success rate', `${Math.round((count - errors) / count * 100)}%`);
  metric('Avg time', avgTime, 'ms');
  metric('Throughput', `${(count / (totalTime / 1000)).toFixed(2)}`, 'evals/sec');

  recordTest('mass_evaluate', {
    operations: count,
    errors,
    avgTime,
    throughput: count / (totalTime / 1000),
  });

  results.limits.maxEvalsPerSecond = Math.round(count / (totalTime / 1000));
}

async function testMultipleTabs() {
  section('MULTIPLE TABS TEST');

  const tabUrls = [
    'https://www.google.com',
    'https://www.github.com',
    'https://www.wikipedia.org',
    'https://www.reddit.com',
    'https://www.stackoverflow.com',
  ];

  const count = Math.min(STRESS_CONFIG.maxTabs, tabUrls.length);
  let errors = 0;
  const start = Date.now();

  // Open tabs
  log('📂', 'Opening tabs...', 'blue');
  for (let i = 0; i < count; i++) {
    await callTool('stream_navigate', { url: tabUrls[i] }, true);
    await sleep(500);

    // Open new tab via keyboard shortcut
    if (i < count - 1) {
      await callTool('stream_keyboard', { action: 'press', key: 'Control+t' }, true);
      await sleep(300);
    }
  }

  // List tabs
  const tabsResult = await callTool('stream_list_tabs', {}, true);

  // Try to extract tab count
  let tabCount = 0;
  try {
    if (tabsResult.raw) {
      const match = tabsResult.raw.match(/count.*?(\d+)/i);
      if (match) tabCount = parseInt(match[1]);
    }
  } catch (e) {}

  // Switch between tabs
  log('🔄', 'Switching tabs...', 'blue');
  for (let i = 0; i < count; i++) {
    const r = await callTool('stream_switch_tab', { index: i }, true);
    if (!r.success) errors++;
    await sleep(200);
  }

  const elapsed = Date.now() - start;

  metric('Tabs opened', count);
  metric('Tabs detected', tabCount);
  metric('Switch errors', errors);
  metric('Total time', elapsed, 'ms');

  recordTest('multiple_tabs', {
    operations: count * 2,
    errors,
    tabsOpened: count,
    elapsed,
  });

  results.limits.maxTabs = tabCount || count;
}

async function testLongRunningStability() {
  section('LONG-RUNNING STABILITY TEST');

  const duration = 30000; // 30 seconds
  const start = Date.now();
  let operations = 0;
  let errors = 0;

  log('⏱️', `Running for ${duration / 1000} seconds...`, 'blue');

  while (Date.now() - start < duration) {
    // Random operation
    const op = Math.floor(Math.random() * 4);
    let r;

    switch (op) {
      case 0: // Navigate
        r = await callTool('stream_navigate', {
          url: `https://www.google.com/search?q=test${operations}`,
          timeout: 10000
        }, true);
        break;
      case 1: // Screenshot
        r = await callTool('stream_screenshot', { compress: true }, true);
        break;
      case 2: // Evaluate
        r = await callTool('stream_evaluate', { script: 'document.title' }, true);
        break;
      case 3: // Click
        r = await callTool('stream_mouse', { action: 'click', x: 400, y: 300 }, true);
        break;
    }

    if (r.success) {
      process.stdout.write(`${colors.green}.${colors.reset}`);
    } else {
      errors++;
      process.stdout.write(`${colors.red}x${colors.reset}`);
    }
    operations++;

    // Brief pause
    await sleep(STRESS_CONFIG.actionDelayMs);
  }
  console.log('');

  const elapsed = Date.now() - start;

  metric('Duration', `${(elapsed / 1000).toFixed(1)}`, 'seconds');
  metric('Operations', operations);
  metric('Errors', errors);
  metric('Success rate', `${Math.round((operations - errors) / operations * 100)}%`);
  metric('Throughput', `${(operations / (elapsed / 1000)).toFixed(2)}`, 'ops/sec');

  recordTest('stability', {
    operations,
    errors,
    duration: elapsed,
    throughput: operations / (elapsed / 1000),
  });

  results.limits.sustainedOpsPerSecond = Math.round(operations / (elapsed / 1000) * 10) / 10;
}

async function testSessionStress() {
  section('SESSION STRESS TEST');

  // Navigate to a site with lots of cookies
  await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
  await sleep(1000);
  await callTool('stream_navigate', { url: 'https://www.youtube.com' }, true);
  await sleep(1000);
  await callTool('stream_navigate', { url: 'https://www.github.com' }, true);
  await sleep(1000);

  // Add some localStorage items
  for (let i = 0; i < 50; i++) {
    await callTool('stream_evaluate', {
      script: `localStorage.setItem('stress_test_${i}', '${'x'.repeat(1000)}')`
    }, true);
  }

  // Save session
  const saveStart = Date.now();
  const saveResult = await callTool('stream_session_save', { name: 'stress-test-session' }, true);
  const saveTime = Date.now() - saveStart;

  // Load session
  const loadStart = Date.now();
  const loadResult = await callTool('stream_session_load', { name: 'stress-test-session' }, true);
  const loadTime = Date.now() - loadStart;

  // Extract stats
  let cookieCount = 0;
  let storageKeys = 0;
  try {
    const saveMatch = saveResult.raw?.match(/cookieCount.*?(\d+)/i);
    if (saveMatch) cookieCount = parseInt(saveMatch[1]);
    const storageMatch = saveResult.raw?.match(/localStorageKeys.*?(\d+)/i);
    if (storageMatch) storageKeys = parseInt(storageMatch[1]);
  } catch (e) {}

  metric('Cookies saved', cookieCount);
  metric('Storage keys', storageKeys);
  metric('Save time', saveTime, 'ms');
  metric('Load time', loadTime, 'ms');

  // Cleanup
  await callTool('stream_session_delete', { name: 'stress-test-session' }, true);

  recordTest('session_stress', {
    operations: 2,
    errors: (!saveResult.success || !loadResult.success) ? 1 : 0,
    cookieCount,
    storageKeys,
    saveTime,
    loadTime,
  });

  results.limits.maxCookies = cookieCount;
  results.limits.maxStorageKeys = storageKeys;
}

async function testErrorRecovery() {
  section('ERROR RECOVERY TEST');

  let recovered = 0;
  let failed = 0;

  // Test 1: Invalid selector
  log('🧪', 'Testing invalid selector recovery...', 'blue');
  const r1 = await callTool('stream_click', { selector: '#nonexistent-element-12345' }, true);
  if (!r1.success) {
    // Try to continue with valid operation
    const r1b = await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
    if (r1b.success) recovered++;
    else failed++;
  }

  // Test 2: Invalid URL
  log('🧪', 'Testing invalid URL recovery...', 'blue');
  const r2 = await callTool('stream_navigate', { url: 'https://this-domain-does-not-exist-12345.com', timeout: 5000 }, true);
  if (!r2.success) {
    const r2b = await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
    if (r2b.success) recovered++;
    else failed++;
  }

  // Test 3: Invalid JavaScript
  log('🧪', 'Testing invalid JS recovery...', 'blue');
  const r3 = await callTool('stream_evaluate', { script: 'this.is.not.valid.javascript()' }, true);
  if (!r3.success) {
    const r3b = await callTool('stream_evaluate', { script: 'document.title' }, true);
    if (r3b.success) recovered++;
    else failed++;
  }

  // Test 4: Rapid error spam
  log('🧪', 'Testing rapid error spam recovery...', 'blue');
  for (let i = 0; i < 10; i++) {
    await callTool('stream_click', { selector: `#fake${i}` }, true);
  }
  const r4 = await callTool('stream_navigate', { url: 'https://www.google.com' }, true);
  if (r4.success) recovered++;
  else failed++;

  metric('Recovery tests', 4);
  metric('Recovered', recovered);
  metric('Failed', failed);
  metric('Recovery rate', `${Math.round(recovered / 4 * 100)}%`);

  recordTest('error_recovery', {
    operations: 4,
    errors: failed,
    recovered,
    recoveryRate: recovered / 4,
  });
}

async function testWorkflowStress() {
  section('WORKFLOW STRESS TEST');

  // Create a complex workflow
  const complexWorkflow = {
    name: 'stress-workflow',
    description: 'Complex workflow for stress testing',
    variables: { counter: '0' },
    steps: [],
  };

  // Add 20 steps
  for (let i = 0; i < 20; i++) {
    complexWorkflow.steps.push({
      id: `step_${i}`,
      action: i % 3 === 0 ? 'navigate' : i % 3 === 1 ? 'screenshot' : 'evaluate',
      args: i % 3 === 0
        ? { url: 'https://www.google.com' }
        : i % 3 === 1
        ? { compress: true }
        : { script: 'document.title' },
      description: `Step ${i}`,
      onError: 'continue',
    });
  }

  const createStart = Date.now();
  const createResult = await callTool('stream_workflow_create', {
    ...complexWorkflow,
    save: false
  }, true);
  const createTime = Date.now() - createStart;

  // Run workflow
  const runStart = Date.now();
  const runResult = await callTool('stream_workflow_run', {
    name: 'stress-workflow',
    dryRun: true // Just validate, don't execute all steps
  }, true);
  const runTime = Date.now() - runStart;

  metric('Workflow steps', 20);
  metric('Create time', createTime, 'ms');
  metric('Dry-run time', runTime, 'ms');

  recordTest('workflow_stress', {
    operations: 2,
    errors: (!createResult.success || !runResult.success) ? 1 : 0,
    stepsCreated: 20,
    createTime,
    runTime,
  });
}

// ========== Main ==========

async function runStressTest() {
  banner('STRESS TEST - Finding the Limits', '🔥');

  console.log('This test will push the system to its limits:\n');
  console.log(`  • Rapid navigation: ${STRESS_CONFIG.navigationCount} sites`);
  console.log(`  • Rapid clicks: ${STRESS_CONFIG.rapidClickCount} clicks`);
  console.log(`  • Rapid typing: ${STRESS_CONFIG.rapidTypeChars} characters`);
  console.log(`  • Mass screenshots: ${STRESS_CONFIG.screenshotCount}`);
  console.log(`  • Mass JS eval: ${STRESS_CONFIG.evaluateCount}`);
  console.log(`  • Multiple tabs: ${STRESS_CONFIG.maxTabs}`);
  console.log(`  • Stability test: 30 seconds`);
  console.log('');

  results.startTime = Date.now();

  await startServer();
  await initProtocol();

  // Launch browser
  log('🚀', 'Launching browser...', 'cyan');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  // Run all stress tests
  try {
    await testRapidNavigation();
    await testRapidClicks();
    await testRapidTyping();
    await testMassScreenshots();
    await testMassEvaluate();
    await testMultipleTabs();
    await testSessionStress();
    await testWorkflowStress();
    await testErrorRecovery();
    await testLongRunningStability();
  } catch (e) {
    log('❌', `Test failed: ${e.message}`, 'red');
  }

  results.endTime = Date.now();

  // ========== Final Report ==========
  banner('STRESS TEST RESULTS', '📊');

  const totalTime = (results.endTime - results.startTime) / 1000;

  console.log(`${colors.bright}SUMMARY${colors.reset}`);
  console.log('─'.repeat(50));
  metric('Total time', `${totalTime.toFixed(1)}`, 'seconds');
  metric('Total operations', results.totalOperations);
  metric('Total errors', results.totalErrors);
  metric('Success rate', `${Math.round((results.totalOperations - results.totalErrors) / results.totalOperations * 100)}%`);
  metric('Avg throughput', `${(results.totalOperations / totalTime).toFixed(2)}`, 'ops/sec');

  console.log(`\n${colors.bright}DISCOVERED LIMITS${colors.reset}`);
  console.log('─'.repeat(50));

  if (results.limits.maxNavigationsPerMinute) {
    metric('Max navigations', `${results.limits.maxNavigationsPerMinute}`, '/minute');
  }
  if (results.limits.maxClicksPerSecond) {
    metric('Max clicks', `${results.limits.maxClicksPerSecond}`, '/second');
  }
  if (results.limits.maxCharsPerSecond) {
    metric('Max typing', `${results.limits.maxCharsPerSecond}`, 'chars/sec');
  }
  if (results.limits.maxScreenshotsPerSecond) {
    metric('Max screenshots', `${results.limits.maxScreenshotsPerSecond}`, '/second');
  }
  if (results.limits.maxEvalsPerSecond) {
    metric('Max JS evals', `${results.limits.maxEvalsPerSecond}`, '/second');
  }
  if (results.limits.maxTabs) {
    metric('Max tabs', results.limits.maxTabs);
  }
  if (results.limits.sustainedOpsPerSecond) {
    metric('Sustained ops', `${results.limits.sustainedOpsPerSecond}`, '/second');
  }
  if (results.limits.maxCookies) {
    metric('Max cookies', results.limits.maxCookies);
  }

  console.log(`\n${colors.bright}TEST BREAKDOWN${colors.reset}`);
  console.log('─'.repeat(50));

  for (const test of results.tests) {
    const status = test.errors === 0
      ? `${colors.green}✓${colors.reset}`
      : test.errors < test.operations / 2
      ? `${colors.yellow}~${colors.reset}`
      : `${colors.red}✗${colors.reset}`;
    console.log(`  ${status} ${test.name}: ${test.operations} ops, ${test.errors} errors`);
  }

  // Cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess.kill('SIGTERM');
  await sleep(2000);

  banner('STRESS TEST COMPLETE', '🏁');
  process.exit(results.totalErrors > results.totalOperations * 0.2 ? 1 : 0);
}

runStressTest().catch(error => {
  console.error('Stress test error:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
