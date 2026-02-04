#!/usr/bin/env node
/**
 * 🤖 DEMO AI-POWERED ACTIONS - Patchright Streaming MCP
 *
 * Demuestra las capacidades de AI:
 * 1. stream_ai_status - Verificar configuración
 * 2. stream_observe - Analizar página
 * 3. stream_act - Acciones en lenguaje natural
 * 4. stream_extract - Extracción de datos
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
    console.log(`   Args: ${argsStr.length > 100 ? argsStr.substring(0, 100) + '...' : argsStr}`);
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
    content.split('\n').slice(0, 20).forEach(line => console.log(`     ${line}`));
    if (content.split('\n').length > 20) console.log('     ... (truncated)');
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
      env: { ...process.env }, // Pass through environment including GEMINI_API_KEY
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
        if (l.includes('[AI]')) {
          console.log(`${colors.cyan}   ${l}${colors.reset}`);
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
    clientInfo: { name: 'demo-ai', version: '1.0.0' },
  });
  log('✅', 'Protocolo MCP inicializado', 'green');
}

// ========== Main Demo ==========

async function runDemo() {
  banner('🤖 DEMO AI-POWERED ACTIONS');

  console.log('Esta demo muestra las capacidades de AI del MCP:');
  console.log('  • stream_ai_status - Verificar configuración de AI');
  console.log('  • stream_observe - Analizar página con visión');
  console.log('  • stream_act - Ejecutar acciones en lenguaje natural');
  console.log('  • stream_extract - Extraer datos estructurados');
  console.log('');

  // Check for API key
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    log('⚠️', 'GEMINI_API_KEY no encontrada. Exportala primero:', 'red');
    console.log('   export GEMINI_API_KEY="tu-api-key"');
    console.log('');
    log('📝', 'Continuando en modo debug (sin ejecución real)...', 'yellow');
  }

  await startServer();
  await initProtocol();

  // ========== PASO 1: Verificar AI Status ==========
  step(1, 'VERIFICAR CONFIGURACIÓN DE AI');
  const statusResult = await callTool('stream_ai_status', { test: true });
  await sleep(1000);

  // Check if AI is configured (either via API key or Vertex AI)
  const statusContent = statusResult?.content?.[0]?.text || '';
  const hasApiKey = statusContent.includes('"geminiApiKeyConfigured": true') || statusContent.includes('"geminiApiKeyConfigured":true');
  const hasVertexAI = statusContent.includes('"vertexAIConfigured": true') || statusContent.includes('"vertexAIConfigured":true');
  const isConnected = statusContent.includes('"apiConnected": true') || statusContent.includes('"apiConnected":true');
  const hasGemini = isConnected || hasVertexAI;

  if (!hasGemini) {
    log('⚠️', 'Gemini API no configurada. Las siguientes demos usarán modo debug.', 'yellow');
  } else if (hasVertexAI) {
    log('✅', 'Usando Vertex AI con Service Account', 'green');
  } else if (isConnected) {
    log('✅', 'API Key conectada', 'green');
  }

  // ========== PASO 2: Lanzar Browser ==========
  step(2, 'LANZAR BROWSER');
  await callTool('stream_status', { launch: true });
  await sleep(2000);

  // ========== PASO 3: Navegar a página de ejemplo ==========
  step(3, 'NAVEGAR A PÁGINA DE PRUEBA');
  await callTool('stream_navigate', {
    url: 'https://www.google.com',
    waitUntil: 'domcontentloaded',
  });
  await sleep(2000);

  // ========== PASO 4: Observar la página ==========
  step(4, 'OBSERVAR PÁGINA CON AI VISION');
  if (hasGemini) {
    await callTool('stream_observe', {});
  } else {
    log('⏭️', 'Saltando (requiere GEMINI_API_KEY)', 'yellow');
  }
  await sleep(2000);

  // ========== PASO 5: Acción con lenguaje natural (debug) ==========
  step(5, 'AI ACT - MODO DEBUG');
  console.log('   Preguntando al AI dónde hacer click para buscar...');
  if (hasGemini) {
    await callTool('stream_act', {
      instruction: 'click on the search input field',
      debug: true, // Solo analiza, no ejecuta
    });
  } else {
    log('⏭️', 'Saltando (requiere GEMINI_API_KEY)', 'yellow');
  }
  await sleep(2000);

  // ========== PASO 6: Acción real ==========
  step(6, 'AI ACT - EJECUCIÓN REAL');
  if (hasGemini) {
    console.log('   Ejecutando: "click on the search box and type hello world"');
    await callTool('stream_act', {
      instruction: 'click on the Google search box',
      debug: false,
    });
    await sleep(1000);

    // Type something
    await callTool('stream_act', {
      instruction: 'type "Patchright MCP demo" in the search field',
      debug: false,
    });
  } else {
    log('⏭️', 'Saltando (requiere GEMINI_API_KEY)', 'yellow');
  }
  await sleep(2000);

  // ========== PASO 7: Navegar a otra página ==========
  step(7, 'NAVEGAR A MERCADOLIBRE');
  await callTool('stream_navigate', {
    url: 'https://www.mercadolibre.com.ar',
    waitUntil: 'domcontentloaded',
  });
  await sleep(3000);

  // ========== PASO 8: Extraer datos ==========
  step(8, 'AI EXTRACT - EXTRAER DATOS');
  if (hasGemini) {
    await callTool('stream_extract', {
      prompt: 'Extract the main navigation categories visible on this page. Return as array of {name, position}',
    });
  } else {
    log('⏭️', 'Saltando (requiere GEMINI_API_KEY)', 'yellow');
  }
  await sleep(2000);

  // ========== PASO 9: Observar MercadoLibre ==========
  step(9, 'OBSERVAR MERCADOLIBRE');
  if (hasGemini) {
    await callTool('stream_observe', {
      focus: 'interactive elements and search functionality',
    });
  } else {
    log('⏭️', 'Saltando (requiere GEMINI_API_KEY)', 'yellow');
  }
  await sleep(2000);

  // ========== Cleanup ==========
  banner('🎉 DEMO AI COMPLETADA');

  if (hasGemini) {
    console.log('Capacidades AI demostradas:');
    console.log('  ✅ AI Vision - Análisis de screenshots');
    console.log('  ✅ Natural Language Actions - Click, type sin selectores');
    console.log('  ✅ Data Extraction - Extracción estructurada');
    console.log('  ✅ Page Observation - Descripción inteligente');
  } else {
    console.log('Para ver la demo completa, configura GEMINI_API_KEY:');
    console.log('  export GEMINI_API_KEY="tu-api-key"');
    console.log('  node demo-ai.js');
  }
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
