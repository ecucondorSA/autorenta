#!/usr/bin/env node
/**
 * Browser Extension CLI - Professional Management Tool
 *
 * Commands:
 *   status    - Full diagnostic of the entire chain
 *   start     - Start bridge as daemon
 *   stop      - Stop bridge daemon
 *   restart   - Restart bridge
 *   doctor    - Diagnose and auto-fix issues
 *   test      - Run connectivity test
 *   logs      - Show bridge logs
 */

import http from 'http';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRIDGE_PORT = 9223;
const PID_FILE = path.join(__dirname, '.bridge.pid');
const LOG_FILE = '/tmp/bridge-server.log';

// Colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const icons = {
  ok: `${c.green}✓${c.reset}`,
  fail: `${c.red}✗${c.reset}`,
  warn: `${c.yellow}!${c.reset}`,
  info: `${c.blue}ℹ${c.reset}`,
  run: `${c.cyan}▶${c.reset}`
};

// ========== Utilities ==========

function httpGet(url, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function isPortInUse(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getPidOnPort(port) {
  try {
    return execSync(`lsof -t -i:${port}`, { stdio: 'pipe' }).toString().trim().split('\n')[0];
  } catch {
    return null;
  }
}

function killPort(port) {
  try {
    const pid = getPidOnPort(port);
    if (pid) {
      process.kill(parseInt(pid), 'SIGTERM');
      return true;
    }
  } catch { }
  return false;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ========== Commands ==========

async function cmdStatus() {
  console.log(`\n${c.bold}Browser Extension Status${c.reset}\n`);

  const checks = [];

  // Check 1: Bridge process
  const bridgeRunning = isPortInUse(BRIDGE_PORT);
  checks.push({
    name: 'Bridge Server',
    status: bridgeRunning ? 'ok' : 'fail',
    detail: bridgeRunning ? `Running on port ${BRIDGE_PORT}` : 'Not running'
  });

  // Check 2: Bridge health
  let bridgeHealth = null;
  if (bridgeRunning) {
    try {
      bridgeHealth = await httpGet(`http://localhost:${BRIDGE_PORT}/health`);
      checks.push({
        name: 'Bridge Health',
        status: 'ok',
        detail: 'Responding to requests'
      });
    } catch (e) {
      checks.push({
        name: 'Bridge Health',
        status: 'fail',
        detail: 'Not responding'
      });
    }
  }

  // Check 3: Extension connection
  if (bridgeHealth) {
    checks.push({
      name: 'Chrome Extension',
      status: bridgeHealth.extensionConnected ? 'ok' : 'warn',
      detail: bridgeHealth.extensionConnected ? 'Connected' : 'Not connected - reload extension in Chrome'
    });
  }

  // Check 4: MCP registration
  const mcpConfigPath = path.join(process.env.HOME, '.claude', 'claude_desktop_config.json');
  let mcpRegistered = false;
  try {
    const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    mcpRegistered = config.mcpServers && config.mcpServers['browser-extension'];
  } catch { }

  checks.push({
    name: 'MCP Registration',
    status: mcpRegistered ? 'ok' : 'warn',
    detail: mcpRegistered ? 'Registered in Claude' : 'Not registered - run: cli.js register'
  });

  // Print results
  const maxNameLen = Math.max(...checks.map(c => c.name.length));
  checks.forEach(check => {
    const icon = icons[check.status];
    const name = check.name.padEnd(maxNameLen);
    console.log(`  ${icon} ${name}  ${c.gray}${check.detail}${c.reset}`);
  });

  // Summary
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;

  console.log('');
  if (failed > 0) {
    console.log(`  ${c.red}${failed} issue(s) found.${c.reset} Run: ${c.cyan}./cli.js doctor${c.reset}`);
  } else if (warned > 0) {
    console.log(`  ${c.yellow}${warned} warning(s).${c.reset} Run: ${c.cyan}./cli.js doctor${c.reset} to fix`);
  } else {
    console.log(`  ${c.green}All systems operational!${c.reset}`);
  }
  console.log('');
}

async function cmdStart() {
  console.log(`\n${icons.run} Starting bridge server...`);

  if (isPortInUse(BRIDGE_PORT)) {
    console.log(`${icons.ok} Bridge already running on port ${BRIDGE_PORT}`);
    return true;
  }

  // Start bridge
  const child = spawn('node', ['bridge-server.js'], {
    cwd: __dirname,
    detached: true,
    stdio: ['ignore', fs.openSync(LOG_FILE, 'a'), fs.openSync(LOG_FILE, 'a')]
  });

  child.unref();
  fs.writeFileSync(PID_FILE, child.pid.toString());

  // Wait for it to be ready
  for (let i = 0; i < 20; i++) {
    await sleep(200);
    try {
      await httpGet(`http://localhost:${BRIDGE_PORT}/health`);
      console.log(`${icons.ok} Bridge started (PID: ${child.pid})`);
      return true;
    } catch { }
  }

  console.log(`${icons.fail} Failed to start bridge. Check: ${c.cyan}cat ${LOG_FILE}${c.reset}`);
  return false;
}

async function cmdStop() {
  console.log(`\n${icons.run} Stopping bridge server...`);

  const killed = killPort(BRIDGE_PORT);

  if (fs.existsSync(PID_FILE)) {
    fs.unlinkSync(PID_FILE);
  }

  if (killed) {
    console.log(`${icons.ok} Bridge stopped`);
  } else {
    console.log(`${icons.warn} Bridge was not running`);
  }
}

async function cmdRestart() {
  await cmdStop();
  await sleep(500);
  await cmdStart();
}

async function cmdDoctor() {
  console.log(`\n${c.bold}${c.blue}Running diagnostics...${c.reset}\n`);

  let fixed = 0;

  // Step 1: Ensure bridge is running
  console.log(`${icons.info} Checking bridge server...`);
  if (!isPortInUse(BRIDGE_PORT)) {
    console.log(`  ${icons.run} Starting bridge...`);
    await cmdStart();
    fixed++;
  } else {
    console.log(`  ${icons.ok} Bridge is running`);
  }

  // Step 2: Verify bridge health
  console.log(`${icons.info} Checking bridge health...`);
  try {
    const health = await httpGet(`http://localhost:${BRIDGE_PORT}/health`);
    console.log(`  ${icons.ok} Bridge is healthy`);

    // Step 3: Check extension
    console.log(`${icons.info} Checking Chrome extension...`);
    if (!health.extensionConnected) {
      console.log(`  ${icons.warn} Extension not connected`);
      console.log(`\n  ${c.yellow}To fix:${c.reset}`);
      console.log(`    1. Open Chrome → ${c.cyan}chrome://extensions${c.reset}`);
      console.log(`    2. Find "Claude Code Browser Control"`);
      console.log(`    3. Click the ${c.bold}reload${c.reset} button (↻)`);
      console.log(`    4. Open any webpage (not chrome://)`);
      console.log(`    5. Badge should show ${c.green}✓${c.reset}`);
    } else {
      console.log(`  ${icons.ok} Extension connected`);
    }
  } catch {
    console.log(`  ${icons.fail} Bridge not responding - restarting...`);
    await cmdRestart();
    fixed++;
  }

  // Step 4: Check MCP registration
  console.log(`${icons.info} Checking MCP registration...`);
  const registered = await ensureMcpRegistered();
  if (registered === 'added') {
    console.log(`  ${icons.ok} MCP registered (restart Claude Code to apply)`);
    fixed++;
  } else if (registered === 'exists') {
    console.log(`  ${icons.ok} MCP already registered`);
  } else {
    console.log(`  ${icons.warn} Could not register MCP automatically`);
  }

  console.log('');
  if (fixed > 0) {
    console.log(`${c.green}Fixed ${fixed} issue(s)!${c.reset}`);
  }
  console.log(`Run ${c.cyan}./cli.js status${c.reset} to verify.\n`);
}

async function ensureMcpRegistered() {
  // Check if already registered using claude mcp list
  try {
    const result = execSync('claude mcp list 2>/dev/null', { stdio: 'pipe' }).toString();
    if (result.includes('browser-extension')) {
      return 'exists';
    }
  } catch { }

  // Register using claude mcp add
  try {
    const mcpServerPath = path.join(__dirname, 'mcp-server.js');
    execSync(`claude mcp add browser-extension node ${mcpServerPath}`, { stdio: 'pipe' });
    return 'added';
  } catch (e) {
    return 'error';
  }
}

async function cmdTest() {
  console.log(`\n${c.bold}Running connectivity test...${c.reset}\n`);

  const tests = [
    { name: 'Bridge reachable', fn: async () => {
      await httpGet(`http://localhost:${BRIDGE_PORT}/health`);
      return true;
    }},
    { name: 'Extension connected', fn: async () => {
      const h = await httpGet(`http://localhost:${BRIDGE_PORT}/health`);
      if (!h.extensionConnected) throw new Error('Not connected');
      return true;
    }},
    { name: 'Full round-trip', fn: async () => {
      const status = await httpGet(`http://localhost:${BRIDGE_PORT}/status`);
      return status.server?.includes('Bridge');
    }}
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ${icons.ok} ${test.name}`);
      passed++;
    } catch (e) {
      console.log(`  ${icons.fail} ${test.name} ${c.gray}(${e.message})${c.reset}`);
    }
  }

  console.log(`\n  ${passed}/${tests.length} tests passed\n`);
}

async function cmdLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log(`${icons.warn} No logs found at ${LOG_FILE}`);
    return;
  }

  const logs = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = logs.split('\n').slice(-50);
  console.log(lines.join('\n'));
}

function cmdHelp() {
  console.log(`
${c.bold}Browser Extension CLI${c.reset}

${c.cyan}Usage:${c.reset}
  ./cli.js <command>

${c.cyan}Commands:${c.reset}
  ${c.bold}status${c.reset}    Full diagnostic of the entire chain
  ${c.bold}start${c.reset}     Start bridge as daemon
  ${c.bold}stop${c.reset}      Stop bridge daemon
  ${c.bold}restart${c.reset}   Restart bridge
  ${c.bold}doctor${c.reset}    Diagnose and auto-fix issues
  ${c.bold}test${c.reset}      Run connectivity test
  ${c.bold}logs${c.reset}      Show last 50 lines of bridge logs
  ${c.bold}help${c.reset}      Show this help

${c.cyan}Examples:${c.reset}
  ./cli.js doctor    # Fix everything automatically
  ./cli.js status    # Check what's working
  ./cli.js restart   # Restart the bridge
`);
}

// ========== Main ==========

const command = process.argv[2] || 'help';

const commands = {
  status: cmdStatus,
  start: cmdStart,
  stop: cmdStop,
  restart: cmdRestart,
  doctor: cmdDoctor,
  test: cmdTest,
  logs: cmdLogs,
  help: cmdHelp
};

if (commands[command]) {
  commands[command]().catch(console.error);
} else {
  console.log(`Unknown command: ${command}`);
  cmdHelp();
}
