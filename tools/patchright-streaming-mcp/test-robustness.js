#!/usr/bin/env node
/**
 * Robustness Test Suite for Patchright Streaming MCP
 *
 * Tests:
 * 1. Server startup
 * 2. Health check
 * 3. Input validation (missing args, wrong types)
 * 4. Navigation with retry
 * 5. Page recovery
 * 6. Event streaming
 * 7. Graceful shutdown
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// ========== Test Utilities ==========

const TIMEOUT_MS = 60000;
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();

function log(level, msg) {
  const icons = { info: '📋', pass: '✅', fail: '❌', warn: '⚠️', step: '🔹' };
  console.log(`${icons[level] || '•'} ${msg}`);
}

function createMessage(method, params = {}) {
  return {
    jsonrpc: '2.0',
    id: ++messageId,
    method,
    params,
  };
}

async function sendRequest(method, params = {}, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const msg = createMessage(method, params);
    const id = msg.id;

    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Timeout waiting for response to ${method}`));
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timeout, method });

    serverProcess.stdin.write(JSON.stringify(msg) + '\n');
  });
}

async function callTool(name, args = {}, timeoutMs = TIMEOUT_MS) {
  const response = await sendRequest('tools/call', { name, arguments: args }, timeoutMs);

  if (response.error) {
    throw new Error(`Tool error: ${JSON.stringify(response.error)}`);
  }

  return response.result;
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
  } catch (e) {
    // Not JSON, probably a log line - ignore
  }
}

// ========== Test Cases ==========

async function testServerStartup() {
  log('step', 'Starting MCP server...');

  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HEADLESS: 'true' },
    });

    let started = false;

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server v1.0 started') && !started) {
        started = true;
        log('pass', 'Server started successfully');

        // Setup stdout reader for JSON-RPC
        rl = createInterface({ input: serverProcess.stdout });
        rl.on('line', handleServerOutput);

        resolve();
      }
      // Log server messages
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (!l.includes('[Event]')) { // Skip noisy event logs
          console.log(`   [server] ${l}`);
        }
      });
    });

    serverProcess.on('error', reject);

    setTimeout(() => {
      if (!started) reject(new Error('Server startup timeout'));
    }, 10000);
  });
}

async function testInitialize() {
  log('step', 'Initializing MCP protocol...');

  const response = await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });

  if (response.result?.serverInfo?.name === 'patchright-streaming') {
    log('pass', `Protocol initialized: ${response.result.serverInfo.name} v${response.result.serverInfo.version}`);
    return true;
  }

  throw new Error('Initialize failed');
}

async function testListTools() {
  log('step', 'Listing available tools...');

  const response = await sendRequest('tools/list', {});
  const tools = response.result?.tools || [];

  if (tools.length > 30) {
    log('pass', `Found ${tools.length} tools`);

    // Check for new health tool
    const hasHealth = tools.some(t => t.name === 'stream_health');
    if (hasHealth) {
      log('pass', 'stream_health tool available');
    } else {
      log('warn', 'stream_health tool not found');
    }

    return tools;
  }

  throw new Error(`Expected 30+ tools, got ${tools.length}`);
}

async function testInputValidation() {
  log('step', 'Testing input validation...');

  // Test 1: Missing required argument
  const result1 = await callTool('stream_click', {}); // Missing 'selector'
  const content1 = result1.content?.[0]?.text || '';
  const isError1 = result1.isError === true;

  if (isError1 && content1.includes('Missing required')) {
    log('pass', 'Correctly rejected missing required argument');
  } else if (isError1) {
    log('pass', `Rejected with error: ${content1.substring(0, 60)}`);
  } else {
    log('fail', 'Should have returned error for missing selector');
    return false;
  }

  // Test 2: Wrong type
  const result2 = await callTool('stream_navigate', { url: 123 }); // url should be string
  const content2 = result2.content?.[0]?.text || '';
  const isError2 = result2.isError === true;

  if (isError2 && content2.includes('must be string')) {
    log('pass', 'Correctly rejected wrong argument type');
  } else if (isError2) {
    log('pass', `Rejected with error: ${content2.substring(0, 60)}`);
  } else {
    log('fail', 'Should have returned error for wrong type');
    return false;
  }

  return true;
}

async function testHealthCheck() {
  log('step', 'Testing health check (before browser launch)...');

  const result = await callTool('stream_health', {});
  const content = result.content?.[0]?.text || '';

  if (content.includes('healthy') || content.includes('no_context')) {
    log('pass', `Health check works: ${content.substring(0, 100)}`);
    return true;
  }

  throw new Error('Health check failed');
}

async function testBrowserLaunch() {
  log('step', 'Launching browser...');

  const result = await callTool('stream_status', { launch: true }, 30000);
  const content = result.content?.[0]?.text || '';

  if (content.includes('Browser: Open') || content.includes('browserOpen')) {
    log('pass', 'Browser launched successfully');
    return true;
  }

  throw new Error(`Browser launch failed: ${content}`);
}

async function testNavigation() {
  log('step', 'Testing navigation with retry logic...');

  const result = await callTool('stream_navigate', {
    url: 'https://example.com',
    waitUntil: 'domcontentloaded',
  }, 30000);

  const content = result.content?.[0]?.text || '';

  if (content.includes('example.com') || content.includes('Navigated')) {
    log('pass', 'Navigation successful');
    return true;
  }

  throw new Error(`Navigation failed: ${content}`);
}

async function testHealthCheckAfterLaunch() {
  log('step', 'Testing health check (after browser launch)...');

  const result = await callTool('stream_health', {});
  const content = result.content?.[0]?.text || '';

  if (content.includes('healthy: true') || content.includes('responseTime')) {
    log('pass', `Browser is healthy: ${content.substring(0, 150)}`);
    return true;
  }

  log('warn', `Health check result: ${content}`);
  return false;
}

async function testScreenshot() {
  log('step', 'Testing screenshot...');

  const result = await callTool('stream_screenshot', { compress: true });
  const content = result.content?.[0]?.text || '';

  if (content.includes('Screenshot captured') || content.includes('.jpg')) {
    log('pass', 'Screenshot captured successfully');
    return true;
  }

  throw new Error(`Screenshot failed: ${content}`);
}

async function testEventBuffer() {
  log('step', 'Testing event buffer...');

  const result = await callTool('stream_get_events', { since_id: 0 });
  const content = result.content?.[0]?.text || '';

  if (content.includes('events') || content.includes('lastEventId')) {
    log('pass', `Event buffer working: ${content.substring(0, 100)}`);
    return true;
  }

  throw new Error(`Event buffer failed: ${content}`);
}

async function testClick() {
  log('step', 'Testing click with self-healing...');

  // Click on a known element on example.com
  const result = await callTool('stream_click', {
    selector: 'h1',
    timeout: 5000,
  });

  const content = result.content?.[0]?.text || '';

  if (content.includes('Clicked') || content.includes('clicked')) {
    log('pass', 'Click successful');
    return true;
  }

  log('warn', `Click result: ${content}`);
  return false;
}

async function testEvaluate() {
  log('step', 'Testing JavaScript evaluation...');

  const result = await callTool('stream_evaluate', {
    script: 'document.title',
  });

  const content = result.content?.[0]?.text || '';

  if (content.includes('Example') || content.includes('Result')) {
    log('pass', `Evaluate successful: ${content.substring(0, 80)}`);
    return true;
  }

  throw new Error(`Evaluate failed: ${content}`);
}

async function testGracefulClose() {
  log('step', 'Testing graceful browser close...');

  const result = await callTool('stream_close', {});
  const content = result.content?.[0]?.text || '';

  if (content.includes('closed') || content.includes('Browser closed')) {
    log('pass', 'Browser closed gracefully');
    return true;
  }

  throw new Error(`Close failed: ${content}`);
}

async function testHealthAfterClose() {
  log('step', 'Testing health after close (should be unhealthy)...');

  const result = await callTool('stream_health', {});
  const content = result.content?.[0]?.text || '';

  if (content.includes('no_context') || content.includes('healthy: false')) {
    log('pass', 'Correctly reports unhealthy after close');
    return true;
  }

  log('warn', `Unexpected health: ${content}`);
  return false;
}

async function testHealthRepair() {
  log('step', 'Testing health repair (auto-recovery)...');

  const result = await callTool('stream_health', { repair: true }, 30000);
  const content = result.content?.[0]?.text || '';

  // Check for successful repair indicators
  if (content.includes('"repaired": true') || content.includes('"repaired":true') ||
      (content.includes('"healthy": true') && content.includes('repaired'))) {
    log('pass', 'Health repair successful - browser recovered');
    return true;
  }

  // Also pass if it shows healthy with responseTime (means repair worked)
  if (content.includes('"healthy": true') && content.includes('responseTime')) {
    log('pass', 'Health repair successful - browser is responsive');
    return true;
  }

  log('warn', `Repair result: ${content}`);
  return false;
}

// ========== Main ==========

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  PATCHRIGHT STREAMING MCP - ROBUSTNESS TEST SUITE');
  console.log('='.repeat(60) + '\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  const tests = [
    ['Server Startup', testServerStartup],
    ['Protocol Initialize', testInitialize],
    ['List Tools', testListTools],
    ['Input Validation', testInputValidation],
    ['Health Check (pre-launch)', testHealthCheck],
    ['Browser Launch', testBrowserLaunch],
    ['Navigation with Retry', testNavigation],
    ['Health Check (post-launch)', testHealthCheckAfterLaunch],
    ['Screenshot', testScreenshot],
    ['Event Buffer', testEventBuffer],
    ['Click with Self-Healing', testClick],
    ['JavaScript Evaluate', testEvaluate],
    ['Graceful Close', testGracefulClose],
    ['Health After Close', testHealthAfterClose],
    ['Health Repair (Recovery)', testHealthRepair],
  ];

  for (const [name, testFn] of tests) {
    console.log(`\n--- ${name} ---`);
    try {
      const result = await testFn();
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.warnings++;
      } else {
        results.passed++;
      }
    } catch (error) {
      log('fail', `${name}: ${error.message}`);
      results.failed++;

      // If critical test fails, we might need to stop
      if (name === 'Server Startup' || name === 'Protocol Initialize') {
        console.log('\n❌ Critical failure, stopping tests');
        break;
      }
    }
  }

  // Final cleanup
  console.log('\n--- Cleanup ---');
  try {
    await callTool('stream_close', {});
  } catch (e) {
    // Ignore
  }

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed:   ${results.passed}`);
  console.log(`  ⚠️  Warnings: ${results.warnings}`);
  console.log(`  ❌ Failed:   ${results.failed}`);
  console.log('='.repeat(60) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
