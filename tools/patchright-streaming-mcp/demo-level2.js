#!/usr/bin/env node
/**
 * DEMO LEVEL 2 - Advanced AI Features
 *
 * Tests all 6 new features that make us UNIQUE:
 * 1. Session Persistence - Save/load browser sessions
 * 2. AI Planning - Automatic step generation
 * 3. Visual Assertions - AI-powered verification
 * 4. Smart Waiting - AI determines page readiness
 * 5. Self-Healing - Broken selector recovery
 * 6. Natural Language - Complex multi-step instructions
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

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

function banner(text, icon = '🚀') {
  const line = '═'.repeat(60);
  console.log(`\n${colors.cyan}${line}`);
  console.log(`  ${icon} ${text}`);
  console.log(`${line}${colors.reset}\n`);
}

function section(num, text) {
  console.log(`\n${colors.magenta}━━━ FEATURE ${num}: ${text} ━━━${colors.reset}\n`);
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
  log('🔧', `Tool: ${name}`, 'yellow');
  if (Object.keys(args).length > 0) {
    const argsStr = JSON.stringify(args);
    if (argsStr.length < 150) {
      console.log(`   Args: ${argsStr}`);
    } else {
      console.log(`   Args: ${argsStr.substring(0, 150)}...`);
    }
  }

  const response = await sendRequest('tools/call', { name, arguments: args });

  if (response.error) {
    log('❌', `Error: ${JSON.stringify(response.error)}`, 'red');
    return { error: response.error };
  }

  const content = response.result?.content?.[0]?.text || '';
  console.log(`${colors.green}   ✓ Result:${colors.reset}`);

  // Pretty print JSON if possible
  try {
    const cleaned = content.replace(/⏱️.*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    const formatted = JSON.stringify(parsed, null, 2).split('\n').slice(0, 20);
    formatted.forEach(line => console.log(`     ${line}`));
    if (JSON.stringify(parsed, null, 2).split('\n').length > 20) {
      console.log('     ... (truncated)');
    }
  } catch {
    content.split('\n').slice(0, 10).forEach(line => console.log(`     ${line}`));
  }

  return { raw: content, result: response.result };
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
    log('🚀', 'Starting Patchright Streaming MCP Server v2.0...', 'cyan');

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
        log('✅', 'Server started', 'green');
        resolve();
      }
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (l.includes('[AI]') || l.includes('[Plan]') || l.includes('[Session]') || l.includes('[Heal]') || l.includes('[Wait]') || l.includes('[Assert]')) {
          console.log(`${colors.magenta}   ${l}${colors.reset}`);
        } else if (!l.includes('[Event]') && !l.includes('[Monitor]')) {
          // console.log(`${colors.blue}   [server] ${l}${colors.reset}`);
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
    clientInfo: { name: 'demo-level2', version: '1.0.0' },
  });
  log('✅', 'MCP protocol initialized', 'green');
}

// ========== Test Results Tracking ==========
const results = { passed: 0, failed: 0, skipped: 0 };

async function test(name, fn) {
  process.stdout.write(`  ${colors.yellow}◉${colors.reset} ${name}... `);
  try {
    const result = await fn();
    if (result === 'skip') {
      console.log(`${colors.blue}SKIPPED${colors.reset}`);
      results.skipped++;
    } else if (result) {
      console.log(`${colors.green}✓ PASS${colors.reset}`);
      results.passed++;
    } else {
      console.log(`${colors.red}✗ FAIL${colors.reset}`);
      results.failed++;
    }
  } catch (e) {
    console.log(`${colors.red}✗ ERROR: ${e.message}${colors.reset}`);
    results.failed++;
  }
}

// ========== Main Demo ==========

async function runDemo() {
  banner('LEVEL 2 DEMO - Advanced AI Features', '🧠');

  console.log('Testing 6 unique features that differentiate us from Playwright/Selenium:\n');
  console.log('  1. 💾 Session Persistence - Save/load browser sessions');
  console.log('  2. 🎯 AI Planning - Automatic step generation from goals');
  console.log('  3. ✅ Visual Assertions - AI-powered verification');
  console.log('  4. ⏳ Smart Waiting - AI determines page readiness');
  console.log('  5. 🩹 Self-Healing Selectors - Auto-recovery');
  console.log('  6. 💬 Natural Language Commands - Complex instructions');
  console.log('');

  await startServer();
  await initProtocol();

  // Check AI status
  const aiStatus = await callTool('stream_ai_status', { test: false });
  const hasAI = aiStatus.raw?.includes('vertexAIConfigured": true') ||
                aiStatus.raw?.includes('geminiApiKeyConfigured": true') ||
                aiStatus.raw?.includes('"tokenLength"');

  if (!hasAI) {
    log('⚠️', 'AI not configured - some tests will be skipped', 'yellow');
    log('ℹ️', 'Set GEMINI_API_KEY or configure Vertex AI service account', 'blue');
  }

  // Launch browser
  section(0, 'INITIALIZE BROWSER');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  // ========== FEATURE 1: Session Persistence ==========
  section(1, 'SESSION PERSISTENCE');

  await test('List sessions (initial)', async () => {
    const r = await callTool('stream_session_list', {});
    return r.raw?.includes('sessions');
  });

  await test('Save session', async () => {
    await callTool('stream_navigate', { url: 'https://www.google.com' });
    await sleep(1000);
    const r = await callTool('stream_session_save', { name: 'test-session-demo' });
    return r.raw?.includes('savedAt') || r.raw?.includes('test-session-demo');
  });

  await test('List sessions (after save)', async () => {
    const r = await callTool('stream_session_list', {});
    return r.raw?.includes('test-session-demo');
  });

  await test('Load session', async () => {
    const r = await callTool('stream_session_load', { name: 'test-session-demo' });
    return r.raw?.includes('restored') || r.raw?.includes('cookies');
  });

  await test('Delete session', async () => {
    const r = await callTool('stream_session_delete', { name: 'test-session-demo' });
    return r.raw?.includes('deleted');
  });

  // ========== FEATURE 2: AI Planning ==========
  section(2, 'AI PLANNING');

  if (!hasAI) {
    await test('AI Plan (skip - no AI)', async () => 'skip');
    await test('AI Execute Plan (skip - no AI)', async () => 'skip');
    await test('AI Plan Status (skip - no AI)', async () => 'skip');
  } else {
    await test('Create AI plan', async () => {
      const r = await callTool('stream_ai_plan', {
        goal: 'Search for "Patchright MCP" on Google and take a screenshot of results',
        context: { searchEngine: 'google.com' }
      });
      return r.raw?.includes('steps') || r.raw?.includes('goal');
    });

    await test('Get plan status', async () => {
      const r = await callTool('stream_ai_plan_status', {});
      return r.raw?.includes('status') || r.raw?.includes('goal');
    });

    await test('Execute plan', async () => {
      const r = await callTool('stream_ai_execute_plan', { stopOnError: false, maxSteps: 5 });
      return r.raw?.includes('results') || r.raw?.includes('completedSteps');
    });
  }

  // ========== FEATURE 3: Visual Assertions ==========
  section(3, 'VISUAL ASSERTIONS');

  // Navigate to a predictable page
  await callTool('stream_navigate', { url: 'https://www.google.com' });
  await sleep(1000);

  if (!hasAI) {
    await test('AI Assert (skip - no AI)', async () => 'skip');
  } else {
    await test('Assert page has search input', async () => {
      const r = await callTool('stream_ai_assert', {
        assertion: 'There is a search input or search box visible on the page'
      });
      return r.raw?.includes('passed": true') || r.raw?.includes('"passed":true');
    });

    await test('Assert with strict mode', async () => {
      const r = await callTool('stream_ai_assert', {
        assertion: 'The page shows Google logo or Google branding',
        strict: true
      });
      return r.raw?.includes('passed') && r.raw?.includes('confidence');
    });

    await test('Assert false condition', async () => {
      const r = await callTool('stream_ai_assert', {
        assertion: 'There is a purple elephant dancing on the page'
      });
      // This should fail (passed: false)
      return r.raw?.includes('passed": false') || r.raw?.includes('"passed":false');
    });
  }

  // ========== FEATURE 4: Smart Waiting ==========
  section(4, 'SMART WAITING');

  if (!hasAI) {
    await test('AI Smart Wait (skip - no AI)', async () => 'skip');
  } else {
    await test('Smart wait for page ready', async () => {
      await callTool('stream_navigate', { url: 'https://www.google.com' });
      const r = await callTool('stream_ai_wait', {
        condition: 'page is fully loaded and ready for interaction',
        maxWaitMs: 10000,
        pollIntervalMs: 1000
      });
      return r.raw?.includes('ready') && r.raw?.includes('waitedMs');
    });

    await test('Smart wait with custom condition', async () => {
      const r = await callTool('stream_ai_wait', {
        condition: 'search input is visible and not disabled',
        maxWaitMs: 5000
      });
      return r.raw?.includes('ready');
    });
  }

  // ========== FEATURE 5: Self-Healing ==========
  section(5, 'SELF-HEALING SELECTORS');

  await test('Get healing status', async () => {
    const r = await callTool('stream_healing_status', {});
    return r.raw?.includes('enabled') && r.raw?.includes('cachedSelectors');
  });

  await test('Toggle healing off', async () => {
    const r = await callTool('stream_healing_toggle', { enabled: false });
    return r.raw?.includes('disabled') || r.raw?.includes('enabled": false');
  });

  await test('Toggle healing on', async () => {
    const r = await callTool('stream_healing_toggle', { enabled: true });
    return r.raw?.includes('enabled') && !r.raw?.includes('disabled');
  });

  await test('Clear healing cache', async () => {
    const r = await callTool('stream_healing_clear_cache', {});
    return r.raw?.includes('cleared');
  });

  // ========== FEATURE 6: Natural Language Commands ==========
  section(6, 'NATURAL LANGUAGE COMMANDS');

  if (!hasAI) {
    await test('Natural language do (skip - no AI)', async () => 'skip');
  } else {
    // Navigate first
    await callTool('stream_navigate', { url: 'https://www.google.com' });
    await sleep(1000);

    await test('Simple natural language action', async () => {
      const r = await callTool('stream_do', {
        instruction: 'Click on the search input field',
        verify: false
      });
      return r.raw?.includes('actionsExecuted') || r.raw?.includes('results');
    });

    await test('Complex natural language action', async () => {
      const r = await callTool('stream_do', {
        instruction: 'Type "Patchright browser automation" in the search box',
        verify: false
      });
      return r.raw?.includes('actionsExecuted') || r.raw?.includes('typed');
    });

    await test('Natural language with verification', async () => {
      const r = await callTool('stream_do', {
        instruction: 'Press Enter to search',
        verify: true
      });
      return r.raw?.includes('verification') || r.raw?.includes('results');
    });
  }

  // ========== Results ==========
  banner('DEMO COMPLETE', '🎉');

  console.log('Results Summary:');
  console.log(`  ${colors.green}✓ Passed:  ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}✗ Failed:  ${results.failed}${colors.reset}`);
  console.log(`  ${colors.blue}○ Skipped: ${results.skipped}${colors.reset}`);

  const total = results.passed + results.failed;
  const rate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  console.log(`  Pass Rate: ${rate}%`);
  console.log('');

  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bright}All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Some tests failed. Check AI configuration if needed.${colors.reset}`);
  }

  // Cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess.kill('SIGTERM');
  await sleep(2000);

  log('👋', 'Demo finished!', 'cyan');
  process.exit(results.failed > 0 ? 1 : 0);
}

runDemo().catch(error => {
  console.error('Error in demo:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
