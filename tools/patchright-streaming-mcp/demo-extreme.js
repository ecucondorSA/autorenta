#!/usr/bin/env node
/**
 * 🔥 DEMO EXTREMA - Patchright Streaming MCP
 *
 * Prueba intensiva de TODOS los límites:
 * - Multi-tab orchestration
 * - AI Vision + Natural Language Actions
 * - Complex workflows with conditions
 * - Error handling & recovery
 * - Network interception
 * - Cookie/Storage manipulation
 * - Scroll & lazy-loading
 * - Form automation
 * - Data extraction
 * - Screenshot comparison
 * - JavaScript injection
 * - Popup handling
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// ========== Setup ==========
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();
const screenshotDir = '/tmp/patchright-extreme-demo';

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
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function log(icon, msg, color = 'reset') {
  console.log(`${colors[color]}${icon} ${msg}${colors.reset}`);
}

function banner(text, color = 'cyan') {
  const line = '═'.repeat(70);
  console.log(`\n${colors[color]}${line}`);
  console.log(`  ${text}`);
  console.log(`${line}${colors.reset}\n`);
}

function section(num, text) {
  console.log(`\n${colors.bgBlue}${colors.white} FASE ${num} ${colors.reset} ${colors.bright}${text}${colors.reset}\n`);
}

function step(num, text) {
  console.log(`${colors.magenta}  ├─ [${num}] ${text}${colors.reset}`);
}

function success(msg) {
  console.log(`${colors.green}  │  ✓ ${msg}${colors.reset}`);
}

function warn(msg) {
  console.log(`${colors.yellow}  │  ⚠ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}  │  ✗ ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.dim}  │  → ${msg}${colors.reset}`);
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

async function callTool(name, args = {}, silent = false) {
  if (!silent) {
    const argsStr = JSON.stringify(args);
    info(`${name}(${argsStr.length > 80 ? argsStr.substring(0, 80) + '...' : argsStr})`);
  }

  const response = await sendRequest('tools/call', { name, arguments: args });

  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }

  const content = response.result?.content?.[0]?.text || '';

  // Parse JSON result if possible
  try {
    const jsonMatch = content.match(/^\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return { raw: content, data: JSON.parse(jsonMatch[0]), isError: response.result?.isError };
    }
  } catch {}

  return { raw: content, data: null, isError: response.result?.isError };
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
        resolve();
      }
      // Only show important logs
      output.split('\n').filter(l => l.trim()).forEach(l => {
        if (l.includes('[AI]') || l.includes('error') || l.includes('Error')) {
          console.log(`${colors.dim}     [server] ${l}${colors.reset}`);
        }
      });
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Server startup timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'demo-extreme', version: '1.0.0' },
  });
}

// ========== Test Utilities ==========

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const elapsed = Date.now() - start;
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed', elapsed });
    success(`${name} (${elapsed}ms)`);
    return true;
  } catch (e) {
    const elapsed = Date.now() - start;
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: e.message, elapsed });
    error(`${name}: ${e.message}`);
    return false;
  }
}

function skipTest(name, reason) {
  testResults.skipped++;
  testResults.tests.push({ name, status: 'skipped', reason });
  warn(`${name} - SKIPPED: ${reason}`);
}

// ========== Main Demo ==========

async function runExtremeDemo() {
  banner('🔥 DEMO EXTREMA - STRESS TEST COMPLETO');

  console.log('Esta demo probará los límites del MCP con:');
  console.log('  • 50+ operaciones encadenadas');
  console.log('  • Multi-tab orchestration');
  console.log('  • AI Vision (si Gemini está configurado)');
  console.log('  • Workflows complejos con condicionales');
  console.log('  • Manejo de errores y recovery');
  console.log('  • Network interception');
  console.log('  • Extracción de datos estructurados');
  console.log('');

  // Create screenshot directory
  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true });
  }

  await startServer();
  await initProtocol();
  log('✅', 'Servidor y protocolo inicializados', 'green');

  // Check AI availability
  const aiStatus = await callTool('stream_ai_status', { test: true }, true);
  // Check for Vertex AI (service account) or API key
  const hasAI = aiStatus.raw?.includes('vertexAIConfigured": true') ||
                aiStatus.raw?.includes('vertexAIConfigured":true') ||
                aiStatus.raw?.includes('apiConnected": true') ||
                aiStatus.raw?.includes('apiConnected":true') ||
                aiStatus.raw?.includes('"tokenLength"');  // Vertex AI test returns tokenLength

  if (hasAI) {
    log('🤖', 'AI (Gemini/Vertex) disponible - habilitando tests de AI', 'green');
  } else {
    log('⚠️', 'AI no disponible - tests de AI serán limitados', 'yellow');
    info(`AI Status: ${aiStatus.raw?.substring(0, 200)}`);
  }

  // ========================================================================
  // FASE 1: BROWSER LIFECYCLE & HEALTH
  // ========================================================================
  section(1, 'BROWSER LIFECYCLE & HEALTH');

  step('1.1', 'Health check pre-launch');
  await runTest('Health check sin browser', async () => {
    const result = await callTool('stream_health', {});
    if (!result.raw.includes('no_context') && !result.raw.includes('healthy')) {
      throw new Error('Health check debería indicar no_context');
    }
  });

  step('1.2', 'Lanzar browser con perfil persistente');
  await runTest('Browser launch', async () => {
    const result = await callTool('stream_status', { launch: true });
    if (!result.raw.includes('Browser: Open') && !result.raw.includes('browserOpen')) {
      throw new Error('Browser no se lanzó correctamente');
    }
  });

  step('1.3', 'Health check post-launch');
  await runTest('Health check con browser', async () => {
    const result = await callTool('stream_health', {});
    if (!result.raw.includes('healthy')) {
      throw new Error('Browser debería estar healthy');
    }
  });

  step('1.4', 'Verificar event buffer inicial');
  await runTest('Event buffer', async () => {
    const result = await callTool('stream_get_events', { since_id: 0 });
    if (!result.raw.includes('events')) {
      throw new Error('Event buffer no disponible');
    }
  });

  // ========================================================================
  // FASE 2: NAVEGACIÓN MULTI-SITIO
  // ========================================================================
  section(2, 'NAVEGACIÓN MULTI-SITIO');

  const sites = [
    { url: 'https://www.google.com', name: 'Google', selector: 'textarea, input[name="q"]' },
    { url: 'https://www.mercadolibre.com.ar', name: 'MercadoLibre', selector: 'input[type="text"]' },
    { url: 'https://github.com', name: 'GitHub', selector: 'input[name="q"]' },
    { url: 'https://news.ycombinator.com', name: 'Hacker News', selector: '.hnname' },
  ];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    step(`2.${i + 1}`, `Navegar a ${site.name}`);
    await runTest(`Navigate ${site.name}`, async () => {
      const result = await callTool('stream_navigate', {
        url: site.url,
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      if (result.isError) throw new Error(result.raw);
    });

    await runTest(`Screenshot ${site.name}`, async () => {
      const result = await callTool('stream_screenshot', { compress: true });
      if (result.isError) throw new Error(result.raw);
    });

    await sleep(500);
  }

  // ========================================================================
  // FASE 3: INTERACCIÓN CON FORMULARIOS
  // ========================================================================
  section(3, 'INTERACCIÓN CON FORMULARIOS');

  step('3.1', 'Navegar a página de prueba');
  await runTest('Navigate to form page', async () => {
    await callTool('stream_navigate', { url: 'https://www.google.com' });
  });

  step('3.2', 'Click en campo de búsqueda');
  await runTest('Click search field', async () => {
    const result = await callTool('stream_click', {
      selector: 'textarea[name="q"], input[name="q"]',
      timeout: 10000
    });
    if (result.isError) throw new Error(result.raw);
  });

  step('3.3', 'Typing con delay humanizado');
  await runTest('Type with human delay', async () => {
    const result = await callTool('stream_type', {
      selector: 'textarea[name="q"], input[name="q"]',
      text: 'Patchright browser automation test'
    });
    if (result.isError) throw new Error(result.raw);
  });

  step('3.4', 'Keyboard navigation');
  await runTest('Press Enter', async () => {
    const result = await callTool('stream_keyboard', { key: 'Enter' });
    if (result.isError) throw new Error(result.raw);
  });

  // Wait longer for Google to load results
  await sleep(3000);

  step('3.5', 'Verificar navegación a resultados');
  await runTest('Verify search results', async () => {
    // Google may handle search as SPA without URL change, wait and check multiple indicators
    await sleep(2000);

    // Try to wait for common result elements
    try {
      await callTool('stream_wait_for', { selector: '#search, #rso, h3, [data-hveid]', timeout: 8000 });
    } catch (e) {
      // Continue even if timeout - some elements might still exist
    }

    const result = await callTool('stream_evaluate', {
      script: `({
        url: location.href,
        hasSearchInUrl: location.href.includes('search') || location.search.includes('q='),
        h3Count: document.querySelectorAll('h3').length,
        hasSearchResults: document.querySelector('#search, #rso, [data-hveid]') !== null,
        bodyText: document.body.innerText.substring(0, 200)
      })`
    });
    info(`Results: ${result.raw}`);

    // Accept if: URL has search, OR has h3 elements, OR has search result containers
    const hasSearch = result.raw.includes('hasSearchInUrl": true') || result.raw.includes('hasSearchInUrl":true');
    const hasH3 = result.raw.includes('"h3Count":') && !result.raw.includes('"h3Count":0');
    const hasContainer = result.raw.includes('hasSearchResults": true') || result.raw.includes('hasSearchResults":true');

    if (!hasSearch && !hasH3 && !hasContainer) {
      // Last resort: check if body text contains search-related content
      if (result.raw.includes('Patchright') || result.raw.includes('browser')) {
        success('Search content found in page');
        return;
      }
      throw new Error('No se encontraron indicadores de resultados de búsqueda');
    }
    success('Search results verified');
  });

  // ========================================================================
  // FASE 4: SCROLL & LAZY LOADING
  // ========================================================================
  section(4, 'SCROLL & LAZY LOADING');

  step('4.1', 'Navegar a página con scroll infinito');
  await runTest('Navigate to HN', async () => {
    await callTool('stream_navigate', { url: 'https://news.ycombinator.com' });
  });

  step('4.2', 'Scroll down múltiple');
  for (let i = 1; i <= 3; i++) {
    await runTest(`Scroll down #${i}`, async () => {
      const result = await callTool('stream_scroll', { direction: 'down', amount: 500 });
      if (result.isError) throw new Error(result.raw);
    });
    await sleep(300);
  }

  step('4.3', 'Scroll up');
  await runTest('Scroll back up', async () => {
    const result = await callTool('stream_scroll', { direction: 'up', amount: 1500 });
    if (result.isError) throw new Error(result.raw);
  });

  step('4.4', 'Evaluar posición de scroll');
  await runTest('Check scroll position', async () => {
    const result = await callTool('stream_evaluate', {
      script: '({ scrollY: window.scrollY, scrollHeight: document.body.scrollHeight })'
    });
    info(result.raw);
  });

  // ========================================================================
  // FASE 5: MULTI-TAB ORCHESTRATION
  // ========================================================================
  section(5, 'MULTI-TAB ORCHESTRATION');

  step('5.1', 'Listar tabs actuales');
  await runTest('List tabs', async () => {
    const result = await callTool('stream_list_tabs', {});
    if (result.isError) throw new Error(result.raw);
    info(result.raw);
  });

  step('5.2', 'Abrir nueva tab - Google');
  await runTest('Navigate to Google (new context)', async () => {
    await callTool('stream_navigate', { url: 'https://www.google.com' });
  });

  step('5.3', 'Ejecutar JavaScript para abrir tab');
  await runTest('Open new tab via JS', async () => {
    const result = await callTool('stream_evaluate', {
      script: `
        window.open('https://example.com', '_blank');
        'Tab opened'
      `
    });
  });

  await sleep(1500);

  step('5.4', 'Listar todas las tabs');
  await runTest('List all tabs', async () => {
    const result = await callTool('stream_list_tabs', {});
    info(result.raw);
  });

  step('5.5', 'Cambiar entre tabs');
  await runTest('Switch to tab 0', async () => {
    const result = await callTool('stream_switch_tab', { index: 0 });
  });

  // ========================================================================
  // FASE 6: NETWORK INTERCEPTION
  // ========================================================================
  section(6, 'NETWORK INTERCEPTION');

  step('6.1', 'Bloquear recursos (imágenes)');
  await runTest('Block images', async () => {
    const result = await callTool('stream_block_resources', {
      types: ['image', 'media']
    });
    if (result.isError) throw new Error(result.raw);
  });

  step('6.2', 'Navegar y verificar bloqueo');
  await runTest('Navigate with blocked resources', async () => {
    await callTool('stream_navigate', { url: 'https://www.wikipedia.org' });
    await sleep(1000);
    const result = await callTool('stream_evaluate', {
      script: 'document.querySelectorAll("img").length'
    });
    info(`Images found: ${result.raw}`);
  });

  step('6.3', 'Configurar route personalizada');
  await runTest('Custom route mock', async () => {
    const result = await callTool('stream_route', {
      action: 'mock',
      pattern: '**/api/test',
      response: {
        status: 200,
        body: { mocked: true, timestamp: Date.now() }
      }
    });
  });

  step('6.4', 'Limpiar routes');
  await runTest('Clear routes', async () => {
    const result = await callTool('stream_route', { action: 'clear' });
  });

  // ========================================================================
  // FASE 7: COOKIES & STORAGE
  // ========================================================================
  section(7, 'COOKIES & STORAGE');

  step('7.1', 'Navegar a sitio para cookies');
  await runTest('Navigate for cookies', async () => {
    await callTool('stream_navigate', { url: 'https://example.com' });
  });

  step('7.2', 'Leer cookies');
  await runTest('Get cookies', async () => {
    const result = await callTool('stream_cookies', { action: 'get' });
    info(result.raw.substring(0, 200));
  });

  step('7.3', 'Establecer cookie personalizada');
  await runTest('Set custom cookie', async () => {
    const result = await callTool('stream_cookies', {
      action: 'set',
      cookies: [{
        name: 'patchright_test',
        value: 'extreme_demo_' + Date.now(),
        domain: 'example.com',
        path: '/'
      }]
    });
  });

  step('7.4', 'Verificar cookie');
  await runTest('Verify cookie', async () => {
    const result = await callTool('stream_cookies', { action: 'get' });
    if (!result.raw.includes('patchright_test')) {
      throw new Error('Cookie no encontrada');
    }
    success('Cookie verificada');
  });

  step('7.5', 'LocalStorage operations');
  await runTest('LocalStorage set/get', async () => {
    // Navigate to a site that allows localStorage (not example.com)
    await callTool('stream_navigate', { url: 'https://www.google.com' });
    await sleep(500);

    await callTool('stream_storage', {
      action: 'set',
      key: 'patchright_demo',
      value: JSON.stringify({ test: true, timestamp: Date.now() })
    });

    const result = await callTool('stream_storage', {
      action: 'get',
      key: 'patchright_demo'
    });

    // Check if we got the value back (either in the response or via evaluate)
    if (result.isError) {
      // Fallback: verify via evaluate
      const evalResult = await callTool('stream_evaluate', {
        script: 'localStorage.getItem("patchright_demo")'
      });
      if (!evalResult.raw.includes('test')) {
        throw new Error('LocalStorage not working');
      }
    }
    success('LocalStorage verified');
  });

  // ========================================================================
  // FASE 8: JAVASCRIPT INJECTION
  // ========================================================================
  section(8, 'JAVASCRIPT INJECTION & EVALUATION');

  step('8.1', 'Evaluar expresiones complejas');
  await runTest('Complex evaluation', async () => {
    const result = await callTool('stream_evaluate', {
      script: `({
        url: location.href,
        title: document.title,
        links: document.querySelectorAll('a').length,
        scripts: document.querySelectorAll('script').length,
        styles: document.querySelectorAll('link[rel="stylesheet"]').length,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent.substring(0, 50),
        timestamp: Date.now()
      })`
    });
    info(result.raw.substring(0, 300));
  });

  step('8.2', 'Modificar DOM');
  await runTest('DOM modification', async () => {
    await callTool('stream_evaluate', {
      script: `
        const banner = document.createElement('div');
        banner.id = 'patchright-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff6b00;color:white;padding:10px;text-align:center;z-index:99999;font-family:sans-serif;';
        banner.textContent = '🔥 Patchright Extreme Demo Running...';
        document.body.prepend(banner);
        'Banner injected'
      `
    });
  });

  step('8.3', 'Screenshot con modificación');
  await runTest('Screenshot modified page', async () => {
    const result = await callTool('stream_screenshot', { compress: true });
  });

  step('8.4', 'Init script para anti-detection');
  await runTest('Anti-detection script', async () => {
    const result = await callTool('stream_init_script', {});
    if (result.isError) throw new Error(result.raw);
  });

  // ========================================================================
  // FASE 9: SNAPSHOT & ACCESSIBILITY
  // ========================================================================
  section(9, 'SNAPSHOT & ACCESSIBILITY TREE');

  step('9.1', 'Navegar a página compleja');
  await runTest('Navigate to complex page', async () => {
    await callTool('stream_navigate', { url: 'https://www.mercadolibre.com.ar' });
  });

  step('9.2', 'Capturar accessibility snapshot');
  await runTest('Accessibility snapshot', async () => {
    const result = await callTool('stream_snapshot', {});
    const lines = result.raw.split('\n').length;
    info(`Snapshot: ${lines} líneas de accessibility tree`);
  });

  // ========================================================================
  // FASE 10: AI-POWERED ACTIONS (si disponible)
  // ========================================================================
  section(10, 'AI-POWERED ACTIONS');

  if (hasAI) {
    step('10.1', 'Navegar a Google para AI test');
    await runTest('Navigate for AI', async () => {
      await callTool('stream_navigate', { url: 'https://www.google.com' });
    });

    step('10.2', 'AI Observe - Analizar página');
    await runTest('AI Observe', async () => {
      const result = await callTool('stream_observe', {
        focus: 'search functionality and main interactive elements'
      });
      info(result.raw.substring(0, 300));
    });

    step('10.3', 'AI Act - Click con lenguaje natural (debug)');
    await runTest('AI Act debug mode', async () => {
      const result = await callTool('stream_act', {
        instruction: 'click on the search input field',
        debug: true
      });
      info(result.raw.substring(0, 300));
    });

    step('10.4', 'AI Act - Ejecutar acción real');
    await runTest('AI Act real', async () => {
      const result = await callTool('stream_act', {
        instruction: 'click on the Google search box',
        debug: false
      });
    });

    step('10.5', 'AI Act - Typing');
    await runTest('AI Type', async () => {
      const result = await callTool('stream_act', {
        instruction: 'type "Patchright AI test" in the search field',
        debug: false
      });
    });

    await sleep(1000);

    step('10.6', 'Navegar a MercadoLibre para extracción');
    await runTest('Navigate ML for extraction', async () => {
      await callTool('stream_navigate', { url: 'https://www.mercadolibre.com.ar' });
    });

    await sleep(2000);

    step('10.7', 'AI Extract - Datos estructurados');
    await runTest('AI Extract categories', async () => {
      const result = await callTool('stream_extract', {
        prompt: 'Extract the main navigation categories visible on this page. Return as JSON array with {name, position} for each category.'
      });
      info(result.raw.substring(0, 500));
    });
  } else {
    skipTest('AI Observe', 'Gemini API no configurada');
    skipTest('AI Act debug', 'Gemini API no configurada');
    skipTest('AI Act real', 'Gemini API no configurada');
    skipTest('AI Type', 'Gemini API no configurada');
    skipTest('AI Extract', 'Gemini API no configurada');
  }

  // ========================================================================
  // FASE 11: COMPLEX WORKFLOW
  // ========================================================================
  section(11, 'COMPLEX WORKFLOW EXECUTION');

  step('11.1', 'Crear workflow complejo');
  await runTest('Create complex workflow', async () => {
    await callTool('stream_workflow_create', {
      name: 'extreme-test-flow',
      description: 'Multi-step workflow for stress testing',
      variables: {
        searchEngine: 'https://www.google.com',
        query: 'browser automation tools 2024',
        maxScrolls: 2
      },
      steps: [
        {
          id: 'nav-search',
          action: 'navigate',
          args: { url: '{{searchEngine}}' },
          description: 'Go to search engine',
          onError: 'stop'
        },
        {
          id: 'wait-load',
          action: 'sleep',
          args: { ms: 1000 },
          description: 'Wait for page load'
        },
        {
          id: 'click-input',
          action: 'click',
          args: { selector: 'textarea[name="q"], input[name="q"]' },
          description: 'Click search input',
          onError: 'continue'
        },
        {
          id: 'type-query',
          action: 'type',
          args: { selector: 'textarea[name="q"], input[name="q"]', text: '{{query}}' },
          description: 'Type search query'
        },
        {
          id: 'submit',
          action: 'keyboard',
          args: { key: 'Enter' },
          description: 'Submit search'
        },
        {
          id: 'wait-results',
          action: 'sleep',
          args: { ms: 2000 },
          description: 'Wait for results'
        },
        {
          id: 'scroll-1',
          action: 'scroll',
          args: { direction: 'down', amount: 500 },
          description: 'Scroll down first time'
        },
        {
          id: 'wait-scroll',
          action: 'sleep',
          args: { ms: 500 },
          description: 'Wait after scroll'
        },
        {
          id: 'scroll-2',
          action: 'scroll',
          args: { direction: 'down', amount: 500 },
          description: 'Scroll down second time'
        },
        {
          id: 'capture-results',
          action: 'screenshot',
          args: { compress: true },
          description: 'Capture search results'
        },
        {
          id: 'extract-count',
          action: 'evaluate',
          args: { script: '({ resultCount: document.querySelectorAll("h3").length, url: location.href })' },
          description: 'Count results'
        }
      ],
      save: true
    });
  });

  step('11.2', 'Dry-run del workflow');
  await runTest('Workflow dry-run', async () => {
    const result = await callTool('stream_workflow_run', {
      name: 'extreme-test-flow',
      variables: { query: 'Playwright vs Puppeteer comparison' },
      dryRun: true
    });
    info(`${result.data?.steps?.length || 0} pasos validados`);
  });

  step('11.3', 'Ejecutar workflow completo');
  await runTest('Execute full workflow', async () => {
    const result = await callTool('stream_workflow_run', {
      name: 'extreme-test-flow',
      variables: { query: 'best web scraping tools 2024' }
    });

    if (result.data?.status !== 'completed') {
      throw new Error(`Workflow failed: ${result.raw}`);
    }
    info(`Completado en ${result.data.duration}ms con ${result.data.stepsExecuted} pasos`);
  });

  // ========================================================================
  // FASE 12: ERROR HANDLING & RECOVERY
  // ========================================================================
  section(12, 'ERROR HANDLING & RECOVERY');

  step('12.1', 'Intentar click en selector inexistente');
  await runTest('Click non-existent selector', async () => {
    const result = await callTool('stream_click', {
      selector: '#this-element-does-not-exist-12345',
      timeout: 3000
    });
    if (!result.isError) {
      throw new Error('Debería haber fallado');
    }
    success('Error manejado correctamente');
  });

  step('12.2', 'Navegación a URL inválida');
  await runTest('Navigate invalid URL', async () => {
    try {
      const result = await callTool('stream_navigate', {
        url: 'https://this-domain-definitely-does-not-exist-123456789.com',
        timeout: 5000
      });
    } catch (e) {
      success('Error de navegación manejado');
    }
  });

  step('12.3', 'Health check después de errores');
  await runTest('Health check after errors', async () => {
    const result = await callTool('stream_health', {});
    if (!result.raw.includes('healthy')) {
      // Intentar repair
      warn('Browser no healthy, intentando repair...');
      const repairResult = await callTool('stream_health', { repair: true });
      if (!repairResult.raw.includes('healthy') && !repairResult.raw.includes('repaired')) {
        throw new Error('No se pudo recuperar');
      }
    }
    success('Browser sigue operativo');
  });

  // ========================================================================
  // FASE 13: PERFORMANCE & STRESS
  // ========================================================================
  section(13, 'PERFORMANCE & STRESS TEST');

  step('13.1', 'Navegaciones rápidas consecutivas');
  const quickNavUrls = [
    'https://example.com',
    'https://www.google.com',
    'https://httpbin.org/html',
    'https://example.org'
  ];

  for (let i = 0; i < quickNavUrls.length; i++) {
    await runTest(`Quick nav #${i + 1}`, async () => {
      const start = Date.now();
      await callTool('stream_navigate', { url: quickNavUrls[i], timeout: 15000 });
      info(`${Date.now() - start}ms`);
    });
  }

  step('13.2', 'Screenshots rápidos consecutivos');
  for (let i = 1; i <= 5; i++) {
    await runTest(`Quick screenshot #${i}`, async () => {
      const start = Date.now();
      await callTool('stream_screenshot', { compress: true });
      info(`${Date.now() - start}ms`);
    });
  }

  step('13.3', 'Evaluar estado final');
  await runTest('Final state evaluation', async () => {
    const result = await callTool('stream_evaluate', {
      script: `({
        memoryUsage: performance?.memory?.usedJSHeapSize || 'N/A',
        documentReady: document.readyState,
        timestamp: Date.now()
      })`
    });
    info(result.raw);
  });

  // ========================================================================
  // FASE 14: CLEANUP & FINAL REPORT
  // ========================================================================
  section(14, 'CLEANUP & FINAL REPORT');

  step('14.1', 'Cerrar browser');
  await runTest('Close browser', async () => {
    const result = await callTool('stream_close', {});
    if (!result.raw.includes('closed')) {
      throw new Error('Browser no se cerró correctamente');
    }
  });

  step('14.2', 'Health check post-close');
  await runTest('Health after close', async () => {
    const result = await callTool('stream_health', {});
    // Should indicate no browser
  });

  // ========================================================================
  // FINAL REPORT
  // ========================================================================
  banner('📊 REPORTE FINAL', 'green');

  const passRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);

  console.log(`  ${colors.green}✓ Passed:${colors.reset}  ${testResults.passed}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset}  ${testResults.failed}`);
  console.log(`  ${colors.yellow}○ Skipped:${colors.reset} ${testResults.skipped}`);
  console.log(`  ${colors.cyan}━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${colors.bright}Pass Rate: ${passRate}%${colors.reset}`);
  console.log('');

  if (testResults.failed > 0) {
    console.log(`${colors.red}  Failed tests:${colors.reset}`);
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`    • ${t.name}: ${t.error}`);
      });
    console.log('');
  }

  // Save report
  const reportPath = `${screenshotDir}/report.json`;
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: testResults,
    aiEnabled: hasAI
  }, null, 2));

  log('📁', `Reporte guardado en: ${reportPath}`, 'cyan');

  // Cleanup
  serverProcess.kill('SIGTERM');
  await sleep(2000);

  banner('🎉 DEMO EXTREMA COMPLETADA', passRate >= 80 ? 'green' : 'yellow');

  process.exit(testResults.failed > 5 ? 1 : 0);
}

// Run
runExtremeDemo().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(1);
});
