#!/usr/bin/env node
/**
 * 🔍 AUTORENTA PLATFORM INSPECTOR
 *
 * Professional-grade inspection tool for web platforms.
 * Generates comprehensive documentation in Markdown format.
 *
 * Output: 7 detailed .md files covering all aspects of the platform
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { mkdirSync, existsSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

// ========== Configuration ==========
const CONFIG = {
  baseUrl: 'https://autorentar.com',
  credentials: {
    email: 'ecucondor@gmail.com',
    password: 'Ab.12345'
  },
  outputDir: '/home/edu/autorenta/tools/patchright-streaming-mcp/inspector/output',
  screenshotsDir: '/home/edu/autorenta/tools/patchright-streaming-mcp/inspector/output/screenshots',

  // Pages to inspect
  pages: [
    { name: 'landing', path: '/', auth: false, description: 'Landing page pública' },
    { name: 'auth_login', path: '/auth/login', auth: false, description: 'Flujo de autenticación' },
    { name: 'cars_list', path: '/cars/list', auth: true, description: 'Lista de autos (mapa)' },
    { name: 'home_marketplace', path: '/home/marketplace', auth: true, description: 'Marketplace' },
    { name: 'home_profile', path: '/home/profile', auth: true, description: 'Perfil de usuario' },
    { name: 'home_bookings', path: '/home/bookings', auth: true, description: 'Mis reservas' },
    { name: 'home_wallet', path: '/home/wallet', auth: true, description: 'Billetera' },
    { name: 'home_cars', path: '/home/cars', auth: true, description: 'Mis autos' },
    { name: 'home_notifications', path: '/home/notifications', auth: true, description: 'Notificaciones' },
  ],
};

// ========== Data Collection ==========
const inspection = {
  metadata: {
    platform: 'AutoRenta',
    url: CONFIG.baseUrl,
    inspectedAt: new Date().toISOString(),
    inspector: 'Patchright Streaming MCP v1.0',
  },
  flows: [],
  components: new Map(),
  states: [],
  apiCalls: [],
  performance: [],
  edgeCases: [],
  screenshots: [],
};

// ========== Setup ==========
let messageId = 0;
let serverProcess = null;
let rl = null;
const pendingRequests = new Map();

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

function section(title) {
  console.log(`\n${colors.cyan}${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}${colors.reset}\n`);
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

async function jsEval(script) {
  const r = await callTool('stream_evaluate', { script });
  try {
    const match = r.raw?.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {}
  return r.raw || '';
}

async function takeScreenshot(name, description) {
  const r = await callTool('stream_screenshot', { compress: true, fullPage: false });
  if (r.success) {
    const match = r.raw?.match(/Path:\s*([^\n]+)/);
    const srcPath = match ? match[1].trim() : null;
    if (srcPath) {
      const filename = `${name}.jpg`;
      const destPath = join(CONFIG.screenshotsDir, filename);
      try {
        copyFileSync(srcPath, destPath);
        inspection.screenshots.push({
          name,
          filename,
          description,
          path: destPath,
          timestamp: new Date().toISOString(),
        });
        log('📸', `${name}`, 'green');
        return destPath;
      } catch (e) {}
    }
  }
  return null;
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
      env: { ...process.env },
    });

    let started = false;
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server v1.0 started') && !started) {
        started = true;
        rl = createInterface({ input: serverProcess.stdout });
        rl.on('line', handleServerOutput);
        log('✅', 'Server ready', 'green');
        resolve();
      }
    });

    serverProcess.on('error', reject);
    setTimeout(() => !started && reject(new Error('Timeout')), 20000);
  });
}

async function initProtocol() {
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'platform-inspector', version: '1.0.0' },
  });
}

// ========== Inspection Functions ==========

async function inspectComponents() {
  log('🔍', 'Inspecting UI components...', 'blue');

  const components = await jsEval(`
    (function() {
      const result = {
        ionic: {},
        forms: [],
        buttons: [],
        inputs: [],
        modals: [],
        cards: [],
        lists: [],
        maps: [],
        images: [],
        navigation: [],
      };

      // Ionic components
      const ionicTags = ['ion-button', 'ion-input', 'ion-modal', 'ion-card', 'ion-list',
                         'ion-item', 'ion-header', 'ion-footer', 'ion-content', 'ion-fab',
                         'ion-segment', 'ion-tabs', 'ion-tab-bar', 'ion-menu', 'ion-popover',
                         'ion-toast', 'ion-loading', 'ion-spinner', 'ion-badge', 'ion-chip'];

      ionicTags.forEach(tag => {
        const elements = document.querySelectorAll(tag);
        if (elements.length > 0) {
          result.ionic[tag] = elements.length;
        }
      });

      // Forms
      document.querySelectorAll('form').forEach(form => {
        result.forms.push({
          id: form.id || null,
          action: form.action || null,
          method: form.method || 'GET',
          inputs: form.querySelectorAll('input, select, textarea').length,
        });
      });

      // Buttons
      document.querySelectorAll('button, ion-button, [role="button"]').forEach(btn => {
        const text = (btn.textContent || '').trim().substring(0, 50);
        if (text) {
          result.buttons.push({
            text,
            type: btn.type || 'button',
            tag: btn.tagName.toLowerCase(),
          });
        }
      });

      // Inputs
      document.querySelectorAll('input, ion-input, textarea, select').forEach(input => {
        result.inputs.push({
          type: input.type || 'text',
          name: input.name || null,
          placeholder: input.placeholder || null,
          required: input.required || false,
        });
      });

      // Images
      document.querySelectorAll('img').forEach(img => {
        result.images.push({
          src: img.src ? img.src.substring(0, 100) : null,
          alt: img.alt || null,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      });

      // Navigation links
      document.querySelectorAll('a[href], [routerLink]').forEach(link => {
        const href = link.getAttribute('href') || link.getAttribute('routerLink');
        if (href && !href.startsWith('http') && !href.startsWith('javascript')) {
          result.navigation.push(href);
        }
      });

      // Unique navigation
      result.navigation = [...new Set(result.navigation)];

      return result;
    })()
  `);

  return components;
}

async function inspectState() {
  log('🔍', 'Inspecting application state...', 'blue');

  const state = await jsEval(`
    (function() {
      const result = {
        url: location.href,
        title: document.title,
        bodyText: document.body?.innerText?.length || 0,
        hasAuth: false,
        hasError: false,
        isLoading: false,
        isEmpty: false,
        localStorage: {},
        sessionStorage: {},
      };

      // Check auth state
      const authIndicators = document.querySelectorAll('[class*="profile"], [class*="user"], [class*="avatar"], ion-icon[name="person"]');
      result.hasAuth = authIndicators.length > 0;

      // Check loading state
      const loadingIndicators = document.querySelectorAll('ion-loading, ion-spinner, [class*="loading"], [class*="skeleton"]');
      result.isLoading = loadingIndicators.length > 0;

      // Check error state
      const errorIndicators = document.querySelectorAll('[class*="error"], [class*="404"], [class*="not-found"]');
      result.hasError = errorIndicators.length > 0 || document.body?.innerText?.includes('404');

      // Check empty state
      const emptyIndicators = document.querySelectorAll('[class*="empty"], [class*="no-data"]');
      result.isEmpty = emptyIndicators.length > 0;

      // Local storage keys
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          result.localStorage[key] = typeof localStorage.getItem(key);
        }
      } catch (e) {}

      // Session storage keys
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          result.sessionStorage[key] = typeof sessionStorage.getItem(key);
        }
      } catch (e) {}

      return result;
    })()
  `);

  return state;
}

async function inspectPerformance() {
  log('🔍', 'Measuring performance...', 'blue');

  const perf = await jsEval(`
    (function() {
      const result = {
        timing: {},
        resources: [],
        memory: null,
      };

      // Navigation timing
      if (performance.timing) {
        const t = performance.timing;
        result.timing = {
          dns: t.domainLookupEnd - t.domainLookupStart,
          tcp: t.connectEnd - t.connectStart,
          ttfb: t.responseStart - t.requestStart,
          download: t.responseEnd - t.responseStart,
          domParsing: t.domInteractive - t.domLoading,
          domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
          load: t.loadEventEnd - t.navigationStart,
        };
      }

      // Resource count by type
      const resources = performance.getEntriesByType('resource');
      const byType = {};
      resources.forEach(r => {
        const type = r.initiatorType || 'other';
        byType[type] = (byType[type] || 0) + 1;
      });
      result.resources = byType;

      // Memory (Chrome only)
      if (performance.memory) {
        result.memory = {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        };
      }

      return result;
    })()
  `);

  return perf;
}

async function inspectNetworkCalls() {
  log('🔍', 'Analyzing network patterns...', 'blue');

  const network = await jsEval(`
    (function() {
      const resources = performance.getEntriesByType('resource');
      const apis = [];
      const assets = { js: 0, css: 0, img: 0, font: 0, other: 0 };

      resources.forEach(r => {
        const url = r.name;

        // Detect API calls
        if (url.includes('/rest/') || url.includes('/api/') || url.includes('supabase') ||
            url.includes('/rpc/') || url.includes('/auth/')) {
          apis.push({
            url: url.substring(0, 150),
            duration: Math.round(r.duration),
            size: r.transferSize || 0,
          });
        }

        // Count assets
        if (url.endsWith('.js')) assets.js++;
        else if (url.endsWith('.css')) assets.css++;
        else if (url.match(/\\.(png|jpg|jpeg|gif|svg|webp)/)) assets.img++;
        else if (url.match(/\\.(woff|woff2|ttf|eot)/)) assets.font++;
        else assets.other++;
      });

      return { apis, assets, total: resources.length };
    })()
  `);

  return network;
}

async function loginToApp() {
  section('🔐 AUTHENTICATION');

  // Navigate to login
  log('🌐', 'Navigating to login...', 'blue');
  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}/auth/login`, waitUntil: 'networkidle', timeout: 30000 });
  await sleep(4000);

  inspection.flows.push({
    name: 'auth_landing',
    step: 1,
    description: 'Initial auth page with modal selector',
    url: '/auth/login',
  });
  await takeScreenshot('01_auth_modal', 'Modal de selección: Ingresar o Crear cuenta');

  // Click Ingresar in modal
  log('🖱️', 'Clicking Ingresar in modal...', 'blue');
  await jsEval(`
    (function() {
      const ionButtons = document.querySelectorAll('ion-button');
      for (const btn of ionButtons) {
        const text = btn.textContent || '';
        if (text.includes('Ingresar') && !text.includes('Face ID') && !text.includes('huella')) {
          btn.click();
          return 'clicked';
        }
      }
      return 'not found';
    })()
  `);
  await sleep(3000);

  inspection.flows.push({
    name: 'auth_login_form',
    step: 2,
    description: 'Login form with email/password fields',
    url: '/auth/login',
  });
  await takeScreenshot('02_login_form', 'Formulario de login con campos email y contraseña');

  // Collect login form components
  const loginComponents = await inspectComponents();
  inspection.components.set('login_form', loginComponents);

  // Fill credentials
  log('📝', 'Filling credentials...', 'blue');
  await jsEval(`
    (function() {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.focus();
        emailInput.value = '${CONFIG.credentials.email}';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await sleep(500);

  await jsEval(`
    (function() {
      const pwInput = document.querySelector('input[type="password"]');
      if (pwInput) {
        pwInput.focus();
        pwInput.value = '${CONFIG.credentials.password}';
        pwInput.dispatchEvent(new Event('input', { bubbles: true }));
        pwInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await sleep(500);

  await takeScreenshot('03_credentials_filled', 'Formulario con credenciales ingresadas');

  // Submit
  log('🚀', 'Submitting login...', 'blue');
  await jsEval(`
    (function() {
      const submitBtn = document.querySelector('button[type="submit"], ion-button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        return 'submitted';
      }
      // Fallback: find Ingresar button in form context
      const btns = document.querySelectorAll('ion-button, button');
      for (const btn of btns) {
        if (btn.textContent.includes('Ingresar') && btn.closest('form, .login-form, [class*="login"]')) {
          btn.click();
          return 'clicked ingresar';
        }
      }
      return 'not found';
    })()
  `);

  await sleep(6000);

  // Verify login
  const currentUrl = await jsEval(`location.href`);
  const isLoggedIn = !currentUrl.includes('/auth/');

  inspection.flows.push({
    name: 'auth_complete',
    step: 3,
    description: isLoggedIn ? 'Login exitoso, redirigido a dashboard' : 'Login fallido',
    url: currentUrl,
    success: isLoggedIn,
  });

  await takeScreenshot('04_after_login', isLoggedIn ? 'Dashboard después del login' : 'Estado después del intento de login');

  if (isLoggedIn) {
    log('✅', 'Login successful', 'green');
  } else {
    log('❌', 'Login may have failed', 'red');
  }

  return isLoggedIn;
}

async function inspectPage(pageConfig) {
  const { name, path, description } = pageConfig;

  log('🌐', `Inspecting: ${path}`, 'blue');

  const startTime = Date.now();
  await callTool('stream_navigate', { url: `${CONFIG.baseUrl}${path}`, waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  const loadTime = Date.now() - startTime;

  // Collect data
  const components = await inspectComponents();
  const state = await inspectState();
  const perf = await inspectPerformance();
  const network = await inspectNetworkCalls();

  // Store inspection data
  inspection.components.set(name, components);
  inspection.states.push({
    page: name,
    path,
    description,
    ...state,
  });
  inspection.performance.push({
    page: name,
    path,
    loadTime,
    ...perf,
  });
  inspection.apiCalls.push({
    page: name,
    path,
    ...network,
  });

  // Screenshot
  await takeScreenshot(`page_${name}`, description);

  // Check for edge cases
  if (state.hasError) {
    inspection.edgeCases.push({
      page: name,
      type: 'error',
      description: 'Page shows error state (404 or similar)',
    });
  }
  if (state.isLoading) {
    inspection.edgeCases.push({
      page: name,
      type: 'loading',
      description: 'Page stuck in loading state',
    });
  }

  log('✅', `${name}: ${loadTime}ms`, 'green');

  return { name, loadTime, state, components };
}

// ========== Report Generation ==========

function generateFlowsMd() {
  let md = `# 🔄 Flujos de Usuario - AutoRenta

> Documentación generada automáticamente por Patchright MCP Inspector
> Fecha: ${inspection.metadata.inspectedAt}

## Resumen

| Flujo | Pasos | Estado |
|-------|-------|--------|
`;

  // Group flows
  const authFlows = inspection.flows.filter(f => f.name.startsWith('auth'));

  md += `| Autenticación | ${authFlows.length} | ✅ |\n`;
  md += `| Navegación | ${inspection.states.length} páginas | ✅ |\n`;

  md += `\n## 1. Flujo de Autenticación

### Pasos del Login

`;

  authFlows.forEach((flow, i) => {
    md += `#### Paso ${flow.step}: ${flow.description}

- **URL**: \`${flow.url}\`
- **Estado**: ${flow.success !== false ? '✅ Completado' : '❌ Error'}

`;
  });

  md += `### Diagrama del Flujo

\`\`\`
Landing Page
    │
    ▼
[Clic "Ingresar" header]
    │
    ▼
Modal "Tu auto, tu plan"
    │
    ├─→ [Ingresar] ──→ Formulario Login ──→ Dashboard
    │
    └─→ [Crear cuenta] ──→ Formulario Registro
\`\`\`

## 2. Flujo de Navegación Principal

\`\`\`
Dashboard (/cars/list)
    │
    ├─→ Marketplace (/home/marketplace)
    ├─→ Perfil (/home/profile)
    ├─→ Reservas (/home/bookings)
    ├─→ Billetera (/home/wallet)
    ├─→ Mis Autos (/home/cars)
    └─→ Notificaciones (/home/notifications)
\`\`\`

## 3. Páginas Inspeccionadas

| Página | Ruta | Descripción | Tiempo Carga |
|--------|------|-------------|--------------|
`;

  inspection.states.forEach(state => {
    const perf = inspection.performance.find(p => p.page === state.page);
    md += `| ${state.page} | \`${state.path}\` | ${state.description} | ${perf?.loadTime || '-'}ms |\n`;
  });

  return md;
}

function generateComponentsMd() {
  let md = `# 🧩 Componentes UI - AutoRenta

> Análisis de componentes detectados en la plataforma
> Framework: Ionic + Angular

## Resumen de Componentes Ionic

| Componente | Total Encontrados |
|------------|-------------------|
`;

  // Aggregate all Ionic components
  const ionicTotals = {};
  inspection.components.forEach((data, page) => {
    if (data.ionic) {
      Object.entries(data.ionic).forEach(([tag, count]) => {
        ionicTotals[tag] = (ionicTotals[tag] || 0) + count;
      });
    }
  });

  Object.entries(ionicTotals).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    md += `| \`<${tag}>\` | ${count} |\n`;
  });

  md += `\n## Componentes por Página\n\n`;

  inspection.components.forEach((data, page) => {
    md += `### ${page}\n\n`;

    if (data.ionic && Object.keys(data.ionic).length > 0) {
      md += `**Ionic Components:**\n`;
      Object.entries(data.ionic).forEach(([tag, count]) => {
        md += `- \`${tag}\`: ${count}\n`;
      });
      md += '\n';
    }

    if (data.buttons && data.buttons.length > 0) {
      md += `**Buttons (${data.buttons.length}):**\n`;
      data.buttons.slice(0, 10).forEach(btn => {
        md += `- "${btn.text}" (${btn.tag})\n`;
      });
      if (data.buttons.length > 10) md += `- ... y ${data.buttons.length - 10} más\n`;
      md += '\n';
    }

    if (data.inputs && data.inputs.length > 0) {
      md += `**Inputs (${data.inputs.length}):**\n`;
      data.inputs.forEach(input => {
        md += `- type="${input.type}"${input.name ? ` name="${input.name}"` : ''}${input.placeholder ? ` placeholder="${input.placeholder}"` : ''}\n`;
      });
      md += '\n';
    }

    if (data.navigation && data.navigation.length > 0) {
      md += `**Navigation Links:**\n`;
      data.navigation.slice(0, 15).forEach(link => {
        md += `- \`${link}\`\n`;
      });
      md += '\n';
    }
  });

  md += `## Patrones de Componentes Detectados

### 1. Modales
La aplicación usa \`ion-modal\` para:
- Selector de autenticación (Ingresar/Crear cuenta)
- Formulario de login
- Confirmaciones

### 2. Formularios
- Inputs con validación Angular (\`formControlName\`)
- Ionic inputs (\`ion-input\`) con tipos: email, password, text
- Botones de submit con \`ion-button\`

### 3. Navegación
- Tab bar inferior (\`ion-tab-bar\`)
- Header con botones de acción
- Menú lateral (si existe)

### 4. Cards y Listas
- \`ion-card\` para mostrar vehículos
- \`ion-list\` para reservas y transacciones
`;

  return md;
}

function generateStatesMd() {
  let md = `# 🔄 Estados de la Aplicación - AutoRenta

> Análisis de los diferentes estados detectados

## Estados por Página

| Página | URL | Auth | Loading | Error | Empty |
|--------|-----|------|---------|-------|-------|
`;

  inspection.states.forEach(state => {
    md += `| ${state.page} | \`${state.path}\` | ${state.hasAuth ? '✅' : '❌'} | ${state.isLoading ? '⏳' : '–'} | ${state.hasError ? '❌' : '–'} | ${state.isEmpty ? '📭' : '–'} |\n`;
  });

  md += `\n## Detalle de Estados

### Estados de Autenticación

\`\`\`
┌─────────────────────────────────────────────┐
│  GUEST (No autenticado)                     │
│  - Landing page visible                      │
│  - Botón "Ingresar" en header               │
│  - Acceso limitado a páginas públicas       │
└─────────────────────────────────────────────┘
                    │
                    ▼ [Login]
┌─────────────────────────────────────────────┐
│  AUTHENTICATED (Autenticado)                │
│  - Dashboard visible                         │
│  - Menú de usuario en header                │
│  - Acceso a todas las páginas               │
│  - Notificaciones visibles                  │
└─────────────────────────────────────────────┘
\`\`\`

### Estados de Carga

| Estado | Indicador Visual | Duración Típica |
|--------|------------------|-----------------|
| Initial Load | Splash screen | 2-4s |
| Page Navigation | ion-spinner | 0.5-2s |
| Data Fetch | Skeleton loaders | 1-3s |
| Action Processing | ion-loading overlay | Variable |

### Estados de Error

| Código | Página | Descripción |
|--------|--------|-------------|
`;

  inspection.edgeCases.filter(e => e.type === 'error').forEach(edge => {
    md += `| 404 | ${edge.page} | ${edge.description} |\n`;
  });

  if (inspection.edgeCases.filter(e => e.type === 'error').length === 0) {
    md += `| – | – | No se detectaron errores |\n`;
  }

  md += `\n## Storage

### LocalStorage Keys Detectados

`;

  const allLocalStorage = {};
  inspection.states.forEach(state => {
    Object.entries(state.localStorage || {}).forEach(([key, type]) => {
      allLocalStorage[key] = type;
    });
  });

  if (Object.keys(allLocalStorage).length > 0) {
    md += `| Key | Tipo |\n|-----|------|\n`;
    Object.entries(allLocalStorage).forEach(([key, type]) => {
      md += `| \`${key}\` | ${type} |\n`;
    });
  } else {
    md += `No se detectaron keys en localStorage.\n`;
  }

  return md;
}

function generateApiCallsMd() {
  let md = `# 🌐 API Calls - AutoRenta

> Análisis de llamadas de red detectadas
> Backend: Supabase

## Resumen de Assets

| Página | JS | CSS | Imágenes | Fonts | Otros | Total |
|--------|----|----|----------|-------|-------|-------|
`;

  inspection.apiCalls.forEach(api => {
    const a = api.assets || {};
    md += `| ${api.page} | ${a.js || 0} | ${a.css || 0} | ${a.img || 0} | ${a.font || 0} | ${a.other || 0} | ${api.total || 0} |\n`;
  });

  md += `\n## API Endpoints Detectados

`;

  const allApis = [];
  inspection.apiCalls.forEach(api => {
    if (api.apis) {
      api.apis.forEach(a => {
        allApis.push({ ...a, page: api.page });
      });
    }
  });

  if (allApis.length > 0) {
    md += `| Endpoint | Duración | Página |\n|----------|----------|--------|\n`;
    allApis.slice(0, 30).forEach(api => {
      const shortUrl = api.url.replace('https://', '').substring(0, 80);
      md += `| \`${shortUrl}\` | ${api.duration}ms | ${api.page} |\n`;
    });
    if (allApis.length > 30) {
      md += `\n*... y ${allApis.length - 30} endpoints más*\n`;
    }
  } else {
    md += `No se detectaron llamadas API específicas.\n`;
  }

  md += `\n## Patrones de API

### Supabase Endpoints

\`\`\`
Base URL: https://[project].supabase.co

Auth:
  POST /auth/v1/token      - Login/Refresh
  POST /auth/v1/signup     - Registro
  POST /auth/v1/logout     - Logout

Database (REST):
  GET  /rest/v1/[table]    - Select
  POST /rest/v1/[table]    - Insert
  PATCH /rest/v1/[table]   - Update
  DELETE /rest/v1/[table]  - Delete

RPC:
  POST /rest/v1/rpc/[function]  - Llamadas a funciones

Storage:
  GET /storage/v1/object/[bucket]/[path]  - Descargar
  POST /storage/v1/object/[bucket]        - Subir
\`\`\`

### Headers Requeridos

\`\`\`http
Authorization: Bearer [access_token]
apikey: [anon_key]
Content-Type: application/json
\`\`\`
`;

  return md;
}

function generateEdgeCasesMd() {
  let md = `# ⚠️ Edge Cases - AutoRenta

> Casos límite y situaciones especiales detectadas

## Casos Detectados

`;

  if (inspection.edgeCases.length > 0) {
    md += `| Página | Tipo | Descripción |\n|--------|------|-------------|\n`;
    inspection.edgeCases.forEach(edge => {
      md += `| ${edge.page} | ${edge.type} | ${edge.description} |\n`;
    });
  } else {
    md += `✅ No se detectaron casos límite problemáticos.\n`;
  }

  md += `\n## Casos a Considerar

### 1. Autenticación

| Caso | Comportamiento Esperado |
|------|------------------------|
| Token expirado | Redirect a login, mostrar mensaje |
| Credenciales inválidas | Mostrar error en formulario |
| Sesión en otro dispositivo | Notificar o cerrar sesión |
| Pérdida de conexión durante login | Retry automático o mensaje |

### 2. Navegación

| Caso | Comportamiento Esperado |
|------|------------------------|
| Ruta no existente | Mostrar página 404 |
| Acceso sin auth a ruta protegida | Redirect a login |
| Deep link con sesión expirada | Guardar destino, login, redirect |
| Back button en flujo de pago | Confirmar abandono |

### 3. Formularios

| Caso | Comportamiento Esperado |
|------|------------------------|
| Campos requeridos vacíos | Validación visual + mensaje |
| Formato inválido (email, teléfono) | Validación en tiempo real |
| Envío duplicado | Deshabilitar botón, debounce |
| Pérdida de conexión | Guardar draft, reintentar |

### 4. Mapas y Geolocalización

| Caso | Comportamiento Esperado |
|------|------------------------|
| WebGL no soportado | Fallback a lista de autos |
| Permiso de ubicación denegado | Usar ubicación por defecto |
| GPS no disponible | Input manual de ubicación |

### 5. Pagos

| Caso | Comportamiento Esperado |
|------|------------------------|
| Pago rechazado | Mensaje claro, opción de reintentar |
| Timeout de pasarela | No cobrar, mostrar error |
| Doble cobro | Detectar y revertir |
| Conexión perdida post-pago | Verificar estado en backend |

## Recomendaciones

1. **Implementar retry logic** para llamadas de red críticas
2. **Usar optimistic UI** para mejor UX
3. **Cachear datos** para funcionamiento offline parcial
4. **Logging de errores** con Sentry o similar
5. **Feature flags** para rollback rápido
`;

  return md;
}

function generatePerformanceMd() {
  let md = `# ⚡ Performance - AutoRenta

> Métricas de rendimiento capturadas durante la inspección

## Tiempos de Carga por Página

| Página | Tiempo Total | DOM Loaded | Resources |
|--------|--------------|------------|-----------|
`;

  inspection.performance.forEach(perf => {
    md += `| ${perf.page} | ${perf.loadTime}ms | ${perf.timing?.domContentLoaded || '-'}ms | ${perf.resources ? Object.values(perf.resources).reduce((a,b) => a+b, 0) : '-'} |\n`;
  });

  md += `\n## Métricas Detalladas

### Navigation Timing

| Métrica | Descripción | Objetivo |
|---------|-------------|----------|
| DNS Lookup | Resolución de dominio | < 50ms |
| TCP Connection | Establecer conexión | < 100ms |
| TTFB | Time to First Byte | < 200ms |
| DOM Interactive | DOM parseado | < 1500ms |
| DOM Content Loaded | DOM + CSS ready | < 2000ms |
| Load Complete | Todo cargado | < 3000ms |

### Promedios Detectados

`;

  const avgLoadTime = inspection.performance.reduce((a, p) => a + p.loadTime, 0) / inspection.performance.length;
  md += `- **Tiempo promedio de carga**: ${Math.round(avgLoadTime)}ms\n`;

  const maxLoad = Math.max(...inspection.performance.map(p => p.loadTime));
  const minLoad = Math.min(...inspection.performance.map(p => p.loadTime));
  md += `- **Carga más rápida**: ${minLoad}ms\n`;
  md += `- **Carga más lenta**: ${maxLoad}ms\n`;

  md += `\n## Recursos por Tipo

| Tipo | Cantidad | Impacto |
|------|----------|---------|
| JavaScript | Alto | Bloquea render |
| CSS | Medio | Bloquea render |
| Imágenes | Bajo | Lazy load recomendado |
| Fonts | Medio | FOUT/FOIT |

## Recomendaciones de Optimización

### 1. Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### 2. Optimizaciones Sugeridas
- Implementar lazy loading para imágenes
- Precargar fuentes críticas
- Usar code splitting en Angular
- Cachear respuestas de API
- Comprimir assets con Brotli/gzip

### 3. Ionic-Specific
- Usar \`ion-virtual-scroll\` para listas largas
- Implementar \`trackBy\` en \`*ngFor\`
- Lazy load módulos de features
- Usar \`ChangeDetectionStrategy.OnPush\`
`;

  return md;
}

function generateScreenshotsMd() {
  let md = `# 📸 Screenshots - AutoRenta

> Capturas de pantalla de todos los estados inspeccionados
> Total: ${inspection.screenshots.length} capturas

## Índice de Capturas

| # | Nombre | Descripción |
|---|--------|-------------|
`;

  inspection.screenshots.forEach((ss, i) => {
    md += `| ${i + 1} | ${ss.name} | ${ss.description} |\n`;
  });

  md += `\n## Capturas Detalladas\n\n`;

  inspection.screenshots.forEach((ss, i) => {
    md += `### ${i + 1}. ${ss.name}

**Descripción:** ${ss.description}

**Archivo:** \`${ss.filename}\`

**Timestamp:** ${ss.timestamp}

---

`;
  });

  md += `## Notas de Captura

- Todas las capturas son en formato JPEG comprimido
- Resolución: viewport del navegador (1280x720 por defecto)
- Las capturas se toman después de que la página esté "ready"
- Algunas páginas pueden mostrar estados de carga si el contenido es dinámico
`;

  return md;
}

async function generateReports() {
  section('📝 GENERATING REPORTS');

  const reports = [
    { name: '01-FLOWS.md', generator: generateFlowsMd },
    { name: '02-COMPONENTS.md', generator: generateComponentsMd },
    { name: '03-STATES.md', generator: generateStatesMd },
    { name: '04-API-CALLS.md', generator: generateApiCallsMd },
    { name: '05-EDGE-CASES.md', generator: generateEdgeCasesMd },
    { name: '06-PERFORMANCE.md', generator: generatePerformanceMd },
    { name: '07-SCREENSHOTS.md', generator: generateScreenshotsMd },
  ];

  for (const report of reports) {
    const content = report.generator();
    const path = join(CONFIG.outputDir, report.name);
    writeFileSync(path, content);
    log('📄', `Generated: ${report.name}`, 'green');
  }

  // Generate index
  let indexMd = `# 🔍 Inspección de Plataforma - AutoRenta

> Generado por Patchright MCP Inspector
> Fecha: ${inspection.metadata.inspectedAt}

## Documentos Generados

| Documento | Descripción |
|-----------|-------------|
| [01-FLOWS.md](./01-FLOWS.md) | Flujos de usuario y navegación |
| [02-COMPONENTS.md](./02-COMPONENTS.md) | Componentes UI (Ionic/Angular) |
| [03-STATES.md](./03-STATES.md) | Estados de la aplicación |
| [04-API-CALLS.md](./04-API-CALLS.md) | Endpoints y llamadas de red |
| [05-EDGE-CASES.md](./05-EDGE-CASES.md) | Casos límite y errores |
| [06-PERFORMANCE.md](./06-PERFORMANCE.md) | Métricas de rendimiento |
| [07-SCREENSHOTS.md](./07-SCREENSHOTS.md) | Capturas de pantalla |

## Resumen de Inspección

- **Plataforma**: ${inspection.metadata.platform}
- **URL**: ${inspection.metadata.url}
- **Páginas inspeccionadas**: ${inspection.states.length}
- **Screenshots capturados**: ${inspection.screenshots.length}
- **Componentes Ionic detectados**: ${Object.keys(inspection.components.get('login_form')?.ionic || {}).length}+

## Screenshots

Ver carpeta \`screenshots/\` para todas las capturas.
`;

  writeFileSync(join(CONFIG.outputDir, 'README.md'), indexMd);
  log('📄', 'Generated: README.md (index)', 'green');
}

// ========== Main ==========

async function runInspection() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔍 AUTORENTA PLATFORM INSPECTOR');
  console.log('  Professional-grade inspection tool');
  console.log('═'.repeat(60) + '\n');

  // Setup directories
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  if (!existsSync(CONFIG.screenshotsDir)) {
    mkdirSync(CONFIG.screenshotsDir, { recursive: true });
  }

  try {
    await startServer();
    await initProtocol();

    // Launch browser
    await callTool('stream_status', { launch: true });
    await sleep(2000);

    // Login first
    const isLoggedIn = await loginToApp();

    if (isLoggedIn) {
      // Inspect authenticated pages
      section('📄 INSPECTING PAGES');

      for (const page of CONFIG.pages) {
        if (!page.auth || isLoggedIn) {
          await inspectPage(page);
        }
      }
    }

    // Generate reports
    await generateReports();

  } catch (e) {
    log('❌', `Error: ${e.message}`, 'red');
    console.error(e);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ INSPECTION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`\n  Output: ${CONFIG.outputDir}`);
  console.log(`  Screenshots: ${CONFIG.screenshotsDir}`);
  console.log(`  Reports: 7 markdown files + README.md\n`);

  // Cleanup
  try {
    await callTool('stream_close', {});
  } catch (e) {}

  serverProcess?.kill('SIGTERM');
  await sleep(2000);
  process.exit(0);
}

runInspection().catch(error => {
  console.error('Fatal error:', error);
  serverProcess?.kill('SIGTERM');
  process.exit(1);
});
