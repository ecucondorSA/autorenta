#!/usr/bin/env node
/**
 * Captura Product Experience usando Patchright Streaming MCP
 * 
 * Evita detección anti-bot usando patchright (chromium patcheado)
 * via MCP server en /home/edu/autorenta/tools/patchright-streaming-mcp
 */

import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const BASE_URL = process.env.AUTORENTA_BASE_URL?.replace(/^(https?:\/\/)?/, 'https://').replace(/\/$/, '') || 'https://autorentar.com';
const EMAIL = process.env.AUTORENTA_EMAIL || 'eduardomarques@campus.fmed.uba.ar';
const PASSWORD = process.env.AUTORENTA_PASSWORD || 'Ab.12345';
const WAIT_MS = parseInt(process.env.AUTORENTA_WAIT_BEFORE_SCREENSHOT_MS || '10000', 10);
const BOOKING_ID = process.env.AUTORENTA_BOOKING_ID;
const PROFILE = process.env.BROWSER_PROFILE || '/tmp/patchright-profile-autorenta';
const HEADLESS = process.env.AUTORENTA_HEADLESS !== 'false';

const MCP_SERVER_DIR = '/home/edu/autorenta/tools/patchright-streaming-mcp';
const OUT_DIR = join(process.cwd(), 'assets', 'product-experience');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

class MCPClient {
  constructor({ command, args, cwd, env }) {
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.env = env;
    this.proc = null;
    this.buf = '';
    this.nextId = 0;
    this.pending = new Map();
  }

  async start() {
    this.proc = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stderr.on('data', (d) => process.stderr.write(String(d)));
    this.proc.stdout.on('data', (d) => this.#onStdout(d));

    await sleep(250);

    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'autorenta-capture-client', version: '1.0.0' },
    });
  }

  async request(method, params = {}) {
    const id = ++this.nextId;
    const msg = { jsonrpc: '2.0', id, method, params };

    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 120000); // 2 min
    });

    this.proc.stdin.write(JSON.stringify(msg) + '\n');
    return p;
  }

  async tool(name, args = {}) {
    return await this.request('tools/call', { name, arguments: args });
  }

  #onStdout(data) {
    this.buf += data.toString('utf8');

    while (true) {
      const idx = this.buf.indexOf('\n');
      if (idx === -1) return;
      const line = this.buf.slice(0, idx).trim();
      this.buf = this.buf.slice(idx + 1);
      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }

      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message || 'Unknown MCP error'));
        else pending.resolve(msg.result);
      }
    }
  }

  async stop() {
    try {
      await this.tool('stream_close', {});
    } catch {
      // ignore
    }

    try {
      if (this.proc && !this.proc.killed) this.proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

const STEPS = [
  {
    key: 'booking_discovery',
    label: 'Reserva - Discovery',
    url: `${BASE_URL}/cars/list`,
    outFile: 'booking_discovery.png',
  },
  {
    key: 'booking_confirmacion',
    label: 'Reserva - Confirmación',
    url: BOOKING_ID ? `${BASE_URL}/bookings/${BOOKING_ID}` : null,
    outFile: 'booking_confirmacion.png',
  },
  {
    key: 'fintech_billetera_virtual',
    label: 'Fintech - Billetera Virtual',
    url: `${BASE_URL}/wallet`,
    outFile: 'fintech_billetera_virtual.png',
  },
  {
    key: 'fintech_hold_garantia',
    label: 'Fintech - Hold/Garantía',
    url: BOOKING_ID ? `${BASE_URL}/bookings/${BOOKING_ID}/detail-payment` : null,
    outFile: 'fintech_hold_garantia.png',
  },
  {
    key: 'trust_kyc_cam',
    label: 'Trust - KYC Cam',
    url: `${BASE_URL}/verification`,
    outFile: 'trust_kyc_cam.png',
  },
  {
    key: 'trust_video_check',
    label: 'Trust - Video Check',
    url: BOOKING_ID ? `${BASE_URL}/bookings/${BOOKING_ID}/check-in` : null,
    outFile: 'trust_video_check.png',
  },
];

async function doLogin(client) {
  console.log(`[LOGIN] Navegando a ${BASE_URL}/auth/login`);
  await client.tool('stream_navigate', { url: `${BASE_URL}/auth/login` });
  await sleep(2000);

  // Try scenic button first
  console.log('[LOGIN] Buscando botón scenic "Ingresar"...');
  const scenicClicked = await client.tool('stream_click', { selector: 'button[data-testid="login-scenic-signin"]' })
    .then(() => true)
    .catch(() => false);

  if (scenicClicked) {
    console.log('[LOGIN] Botón scenic clickeado, esperando form...');
    await sleep(2500);
  }

  // Fill form
  const emailSelectors = [
    'input[type="email"]',
    'input[autocomplete="email"]',
    'input[name="email"]',
    'input[placeholder*="mail" i]',
    'input[id*="email" i]',
  ];

  const passwordSelectors = [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[placeholder*="contraseña" i]',
    'input[id*="password" i]',
  ];

  let emailFilled = false;
  for (const sel of emailSelectors) {
    try {
      await client.tool('stream_fill', { selector: sel, value: EMAIL });
      console.log(`[LOGIN] Email filled via ${sel}`);
      emailFilled = true;
      break;
    } catch {
      // continue
    }
  }

  if (!emailFilled) throw new Error('No se pudo llenar email');

  let passwordFilled = false;
  for (const sel of passwordSelectors) {
    try {
      await client.tool('stream_fill', { selector: sel, value: PASSWORD });
      console.log(`[LOGIN] Password filled via ${sel}`);
      passwordFilled = true;
      break;
    } catch {
      // continue
    }
  }

  if (!passwordFilled) throw new Error('No se pudo llenar password');

  await sleep(500);

  // Submit
  const submitSelectors = [
    'button[type="submit"]',
    'button:has-text("Ingresar")',
    'button:has-text("Iniciar")',
    'button:has-text("Login")',
    'ion-button[type="submit"]',
  ];

  let submitted = false;
  for (const sel of submitSelectors) {
    try {
      await client.tool('stream_click', { selector: sel });
      console.log(`[LOGIN] Submit clicked via ${sel}`);
      submitted = true;
      break;
    } catch {
      // continue
    }
  }

  if (!submitted) {
    // Fallback: press Enter
    console.log('[LOGIN] Submit button not found, pressing Enter');
    await client.tool('stream_keyboard', { key: 'Enter' });
  }

  console.log('[LOGIN] Esperando redirect post-login (5s)...');
  await sleep(5000);

  // Verify not in login page
  const urlResult = await client.tool('stream_url', {});
  const currentUrl = urlResult?.content?.[0]?.text || '';
  
  if (currentUrl.includes('/auth/login')) {
    throw new Error(`Login failed: still at ${currentUrl}`);
  }

  console.log(`[LOGIN] ✓ Login exitoso, URL: ${currentUrl}`);
}

async function captureStep(client, step) {
  if (!step.url) {
    console.log(`[SKIP] ${step.label} - URL no definida (falta BOOKING_ID)`);
    return;
  }

  console.log(`\n[${step.key}] Navegando a ${step.url}`);
  await client.tool('stream_navigate', { url: step.url });

  console.log(`[${step.key}] Esperando ${WAIT_MS}ms para render...`);
  await sleep(WAIT_MS);

  // Verify not redirected to login
  const urlResult = await client.tool('stream_url', {});
  const currentUrl = urlResult?.content?.[0]?.text || '';
  
  if (currentUrl.includes('/auth/login')) {
    throw new Error(`Redirected to login at ${step.url}`);
  }

  console.log(`[${step.key}] Capturando screenshot...`);
  const screenshotResult = await client.tool('stream_screenshot', { fullPage: true });
  
  const base64Data = screenshotResult?.content?.[0]?.data;
  if (!base64Data) {
    throw new Error(`No screenshot data returned for ${step.key}`);
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const outPath = join(OUT_DIR, step.outFile);
  await writeFile(outPath, buffer);

  console.log(`[${step.key}] ✓ Guardado en ${outPath} (${Math.round(buffer.length / 1024)} KB)`);
}

async function main() {
  console.log('🚀 Patchright Product Experience Capture');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Wait: ${WAIT_MS}ms`);
  console.log(`   Headless: ${HEADLESS}`);
  console.log(`   Profile: ${PROFILE}`);
  console.log('');

  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
    console.log(`[SETUP] Created ${OUT_DIR}`);
  }

  const client = new MCPClient({
    command: 'node',
    args: ['server.js'],
    cwd: MCP_SERVER_DIR,
    env: {
      HEADLESS: HEADLESS ? 'true' : 'false',
      BROWSER_PROFILE: PROFILE,
    },
  });

  try {
    console.log('[MCP] Starting patchright-streaming-mcp server...');
    await client.start();
    console.log('[MCP] ✓ Server ready\n');

    await doLogin(client);

    for (const step of STEPS) {
      try {
        await captureStep(client, step);
      } catch (err) {
        console.error(`[ERROR] ${step.key}: ${err.message}`);
      }
    }

    console.log('\n✅ Captura completada');
  } catch (err) {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  } finally {
    await client.stop();
  }
}

main();
