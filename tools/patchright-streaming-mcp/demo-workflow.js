#!/usr/bin/env node
/**
 * 📋 DEMO WORKFLOW ENGINE - Patchright Streaming MCP
 *
 * Demuestra las capacidades del Workflow Engine:
 * 1. Crear workflows declarativos
 * 2. Ejecutar workflows con variables
 * 3. Dry-run para validación
 * 4. Error handling por paso
 * 5. Export/Import de workflows
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

function banner(text) {
  const line = '═'.repeat(60);
  console.log(`\n${colors.cyan}${line}`);
  console.log(`  ${text}`);
  console.log(`${line}${colors.reset}\n`);
}

function step(num, text) {
  console.log(`\n${colors.magenta}━━━ PASO ${num}: ${text} ━━━${colors.reset}\n`);
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

async function callTool(name, args = {}) {
  log('🔧', `Llamando: ${name}`, 'yellow');
  if (Object.keys(args).length > 0) {
    const argsStr = JSON.stringify(args);
    if (argsStr.length < 200) {
      console.log(`   Args: ${argsStr}`);
    } else {
      console.log(`   Args: ${argsStr.substring(0, 200)}...`);
    }
  }

  const response = await sendRequest('tools/call', { name, arguments: args });

  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }

  const content = response.result?.content?.[0]?.text || '';
  console.log(`${colors.green}   ✓ Resultado:${colors.reset}`);

  // Pretty print JSON if possible
  try {
    const parsed = JSON.parse(content.replace(/⏱️.*$/, '').trim());
    console.log(JSON.stringify(parsed, null, 2).split('\n').map(l => `     ${l}`).join('\n'));
  } catch {
    content.split('\n').slice(0, 15).forEach(line => console.log(`     ${line}`));
    if (content.split('\n').length > 15) console.log('     ... (truncated)');
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
  } catch (e) {}
}

async function startServer() {
  return new Promise((resolve, reject) => {
    log('🚀', 'Iniciando Patchright Streaming MCP Server...', 'cyan');

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
        log('✅', 'Servidor iniciado', 'green');
        resolve();
      }
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (l.includes('[Workflow]')) {
          console.log(`${colors.magenta}   ${l}${colors.reset}`);
        } else if (!l.includes('[Event]')) {
          console.log(`${colors.blue}   [server] ${l}${colors.reset}`);
        }
      });
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Timeout')), 15000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'demo-workflow', version: '1.0.0' },
  });
  log('✅', 'Protocolo MCP inicializado', 'green');
}

// ========== Main Demo ==========

async function runDemo() {
  banner('📋 DEMO WORKFLOW ENGINE');

  console.log('Esta demo muestra las capacidades del Workflow Engine:');
  console.log('  • stream_workflow_create - Crear workflows');
  console.log('  • stream_workflow_run - Ejecutar workflows');
  console.log('  • stream_workflow_list - Listar workflows');
  console.log('  • stream_workflow_export - Exportar JSON');
  console.log('  • Dry-run para validación previa');
  console.log('');

  await startServer();
  await initProtocol();

  // ========== PASO 1: Listar workflows existentes ==========
  step(1, 'LISTAR WORKFLOWS EXISTENTES');
  await callTool('stream_workflow_list', {});
  await sleep(500);

  // ========== PASO 2: Crear workflow de búsqueda ==========
  step(2, 'CREAR WORKFLOW: google-search');
  await callTool('stream_workflow_create', {
    name: 'google-search',
    description: 'Search on Google and capture results',
    variables: {
      searchTerm: 'Patchright MCP',
    },
    steps: [
      {
        id: 'nav-google',
        action: 'navigate',
        args: { url: 'https://www.google.com' },
        description: 'Go to Google',
      },
      {
        id: 'wait-page',
        action: 'sleep',
        args: { ms: 1000 },
        description: 'Wait for page load',
      },
      {
        id: 'type-search',
        action: 'type',
        args: {
          selector: 'textarea[name="q"], input[name="q"]',
          text: '{{searchTerm}}',
        },
        description: 'Type search term',
        onError: 'continue',
      },
      {
        id: 'submit-search',
        action: 'keyboard',
        args: { key: 'Enter' },
        description: 'Press Enter to search',
      },
      {
        id: 'wait-results',
        action: 'sleep',
        args: { ms: 2000 },
        description: 'Wait for results',
      },
      {
        id: 'screenshot-results',
        action: 'screenshot',
        args: { compress: true },
        description: 'Capture search results',
      },
    ],
    save: true,
  });
  await sleep(500);

  // ========== PASO 3: Crear workflow de login (ejemplo) ==========
  step(3, 'CREAR WORKFLOW: login-example');
  await callTool('stream_workflow_create', {
    name: 'login-example',
    description: 'Generic login flow with configurable credentials',
    variables: {
      loginUrl: 'https://example.com/login',
      email: 'test@example.com',
      password: 'test123',
    },
    steps: [
      {
        id: 'nav-login',
        action: 'navigate',
        args: { url: '{{loginUrl}}' },
        description: 'Navigate to login page',
      },
      {
        id: 'fill-email',
        action: 'fill',
        args: {
          selector: 'input[type="email"], input[name="email"], #email',
          value: '{{email}}',
        },
        description: 'Fill email field',
        onError: 'screenshot',
      },
      {
        id: 'fill-password',
        action: 'fill',
        args: {
          selector: 'input[type="password"], input[name="password"], #password',
          value: '{{password}}',
        },
        description: 'Fill password field',
      },
      {
        id: 'click-submit',
        action: 'click',
        args: {
          selector: 'button[type="submit"], input[type="submit"], .login-btn',
        },
        description: 'Click login button',
        onError: 'stop',
      },
      {
        id: 'wait-redirect',
        action: 'sleep',
        args: { ms: 3000 },
        description: 'Wait for login redirect',
      },
      {
        id: 'verify-success',
        action: 'evaluate',
        args: {
          script: '({ loggedIn: !document.querySelector(".login-form"), url: location.href })',
        },
        description: 'Verify login success',
      },
    ],
    save: true,
  });
  await sleep(500);

  // ========== PASO 4: Listar workflows ==========
  step(4, 'LISTAR WORKFLOWS CREADOS');
  await callTool('stream_workflow_list', { includeSteps: false });
  await sleep(500);

  // ========== PASO 5: Dry-run del workflow ==========
  step(5, 'DRY-RUN: VALIDAR SIN EJECUTAR');
  await callTool('stream_workflow_run', {
    name: 'google-search',
    variables: {
      searchTerm: 'Claude AI automation',
    },
    dryRun: true,
  });
  await sleep(500);

  // ========== PASO 6: Lanzar browser ==========
  step(6, 'LANZAR BROWSER');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  // ========== PASO 7: Ejecutar workflow real ==========
  step(7, 'EJECUTAR WORKFLOW: google-search');
  await callTool('stream_workflow_run', {
    name: 'google-search',
    variables: {
      searchTerm: 'MercadoLibre Argentina',
    },
  });
  await sleep(2000);

  // ========== PASO 8: Exportar workflow ==========
  step(8, 'EXPORTAR WORKFLOW');
  await callTool('stream_workflow_export', {
    name: 'google-search',
    savePath: '/tmp/google-search-workflow.json',
  });
  await sleep(500);

  // ========== PASO 9: Ver workflow exportado ==========
  step(9, 'OBTENER DETALLES DE WORKFLOW');
  await callTool('stream_workflow_get', {
    name: 'login-example',
  });
  await sleep(500);

  // ========== PASO 10: Crear workflow con condicionales ==========
  step(10, 'CREAR WORKFLOW CON CONDICIONALES');
  await callTool('stream_workflow_create', {
    name: 'conditional-flow',
    description: 'Demo of conditional logic in workflows',
    variables: {
      shouldSearch: 'yes',
      searchTerm: 'test',
    },
    steps: [
      {
        id: 'check-condition',
        action: 'condition',
        args: {
          variable: 'shouldSearch',
          equals: 'yes',
          goto: 'do-search',
          gotoElse: 'skip-search',
        },
        description: 'Check if we should search',
      },
      {
        id: 'do-search',
        action: 'navigate',
        args: { url: 'https://www.google.com/search?q={{searchTerm}}' },
        description: 'Perform search',
      },
      {
        id: 'skip-search',
        action: 'navigate',
        args: { url: 'https://example.com' },
        description: 'Skip to example',
      },
    ],
    save: false,  // Don't persist this demo workflow
  });
  await sleep(500);

  // ========== Cleanup ==========
  banner('🎉 DEMO WORKFLOW ENGINE COMPLETADA');

  console.log('Capacidades demostradas:');
  console.log('  ✅ Crear workflows declarativos');
  console.log('  ✅ Variables interpolables ({{variable}})');
  console.log('  ✅ Dry-run para validación');
  console.log('  ✅ Ejecución con variables personalizadas');
  console.log('  ✅ Export/Import de workflows');
  console.log('  ✅ Lógica condicional (goto/gotoElse)');
  console.log('  ✅ Manejo de errores por paso');
  console.log('');
  console.log('Workflows guardados en: /tmp/patchright-workflows/');
  console.log('');

  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess.kill('SIGTERM');
  await sleep(2000);

  log('👋', '¡Demo finalizada!', 'cyan');
  process.exit(0);
}

runDemo().catch(error => {
  console.error('Error en demo:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
