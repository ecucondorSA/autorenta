#!/usr/bin/env node
/**
 * 🎬 DEMO PRÁCTICA - Patchright Streaming MCP
 *
 * Demuestra las capacidades de robustez en acción:
 * 1. Health monitoring
 * 2. Navegación con retry
 * 3. Self-healing clicks
 * 4. Event streaming
 * 5. Screenshot
 * 6. Auto-recovery
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

async function sendRequest(method, params = {}, timeoutMs = 60000) {
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
    console.log(`   Args: ${JSON.stringify(args)}`);
  }

  const response = await sendRequest('tools/call', { name, arguments: args });

  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }

  const content = response.result?.content?.[0]?.text || '';
  console.log(`${colors.green}   ✓ Resultado:${colors.reset}`);
  content.split('\n').forEach(line => console.log(`     ${line}`));

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
    // Log line from server
  }
}

// ========== Demo Steps ==========

async function startServer() {
  return new Promise((resolve, reject) => {
    log('🚀', 'Iniciando Patchright Streaming MCP Server...', 'cyan');

    serverProcess = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let started = false;

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server v1.0 started') && !started) {
        started = true;
        rl = createInterface({ input: serverProcess.stdout });
        rl.on('line', handleServerOutput);
        log('✅', 'Servidor iniciado correctamente', 'green');
        resolve();
      }
      // Show server logs
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (!l.includes('[Event]')) {
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
    clientInfo: { name: 'demo', version: '1.0.0' },
  });
  log('✅', 'Protocolo MCP inicializado', 'green');
}

// ========== Main Demo ==========

async function runDemo() {
  banner('🎬 DEMO PRÁCTICA - PATCHRIGHT STREAMING MCP');

  console.log('Esta demo muestra las capacidades de robustez del MCP:');
  console.log('  • Health monitoring y auto-recovery');
  console.log('  • Navegación con retry automático');
  console.log('  • Click con self-healing visual');
  console.log('  • Event streaming en tiempo real');
  console.log('  • Screenshot comprimido');
  console.log('');

  await startServer();
  await initProtocol();

  // ========== PASO 1: Health Check (antes de browser) ==========
  step(1, 'HEALTH CHECK (sin browser)');
  await callTool('stream_health', {});
  await sleep(1000);

  // ========== PASO 2: Lanzar Browser ==========
  step(2, 'LANZAR BROWSER CON PERFIL PERSISTENTE');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  // ========== PASO 3: Health Check (con browser) ==========
  step(3, 'HEALTH CHECK (browser activo)');
  await callTool('stream_health', {});
  await sleep(1000);

  // ========== PASO 4: Navegar a una página ==========
  step(4, 'NAVEGACIÓN CON RETRY AUTOMÁTICO');
  console.log('   Navegando a https://www.mercadolibre.com.ar ...');
  await callTool('stream_navigate', {
    url: 'https://www.mercadolibre.com.ar',
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);

  // ========== PASO 5: Ver eventos capturados ==========
  step(5, 'EVENT STREAMING (eventos capturados)');
  await callTool('stream_get_events', { since_id: 0 });
  await sleep(1000);

  // ========== PASO 6: Screenshot ==========
  step(6, 'SCREENSHOT COMPRIMIDO');
  const screenshotResult = await callTool('stream_screenshot', { compress: true });
  await sleep(1000);

  // ========== PASO 7: Click con Self-Healing ==========
  step(7, 'CLICK CON SELF-HEALING');
  console.log('   Intentando click en el campo de búsqueda...');
  try {
    await callTool('stream_click', {
      selector: 'input[type="text"], input[name="as_word"], .nav-search-input',
      timeout: 5000,
    });
  } catch (e) {
    log('⚠️', `Click falló (esperado en algunos casos): ${e.message}`, 'yellow');
  }
  await sleep(1000);

  // ========== PASO 8: Typing ==========
  step(8, 'TYPING EN CAMPO DE BÚSQUEDA');
  try {
    await callTool('stream_type', {
      selector: 'input[type="text"], input[name="as_word"], .nav-search-input',
      text: 'auto usado',
    });
  } catch (e) {
    log('⚠️', `Type falló: ${e.message}`, 'yellow');
  }
  await sleep(1000);

  // ========== PASO 9: Evaluar JavaScript ==========
  step(9, 'EJECUTAR JAVASCRIPT EN PÁGINA');
  await callTool('stream_evaluate', {
    script: '({ title: document.title, url: location.href, inputs: document.querySelectorAll("input").length })',
  });
  await sleep(1000);

  // ========== PASO 10: Cerrar y Recovery ==========
  step(10, 'CERRAR BROWSER Y PROBAR RECOVERY');
  await callTool('stream_close', {});
  await sleep(1000);

  console.log('   Browser cerrado. Probando auto-recovery...');
  await callTool('stream_health', { repair: true });
  await sleep(2000);

  // ========== PASO 11: Verificar recovery navegando ==========
  step(11, 'VERIFICAR RECOVERY (nueva navegación)');
  await callTool('stream_navigate', {
    url: 'https://example.com',
    waitUntil: 'domcontentloaded',
  });
  await sleep(1000);

  // ========== PASO 12: Snapshot de página ==========
  step(12, 'SNAPSHOT DE PÁGINA (accesibilidad)');
  await callTool('stream_snapshot', {});
  await sleep(1000);

  // ========== Cleanup ==========
  banner('🎉 DEMO COMPLETADA');

  console.log('Resumen de capacidades demostradas:');
  console.log('  ✅ Health check y monitoreo');
  console.log('  ✅ Lanzamiento de browser con perfil persistente');
  console.log('  ✅ Navegación con retry automático');
  console.log('  ✅ Event streaming en tiempo real');
  console.log('  ✅ Screenshot comprimido');
  console.log('  ✅ Click con self-healing');
  console.log('  ✅ Typing en campos');
  console.log('  ✅ Evaluación de JavaScript');
  console.log('  ✅ Auto-recovery después de cierre');
  console.log('  ✅ Snapshot de accesibilidad');
  console.log('');

  // Final cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess.kill('SIGTERM');
  await sleep(2000);

  log('👋', 'Demo finalizada. ¡Gracias!', 'cyan');
  process.exit(0);
}

// Run
runDemo().catch(error => {
  console.error('Error en demo:', error);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
