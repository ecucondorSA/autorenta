#!/usr/bin/env node

/**
 * Interactive client that uses Patchright Streaming MCP (server.js) to:
 * 1) Navigate to http://localhost:4200/auth/login
 * 2) Fill email + password (password entered interactively, not logged)
 * 3) Submit login
 * 4) Attempt to start a rental (open a car detail and click Alquilar/Reservar)
 *
 * Security: password is never printed.
 */

import { spawn } from 'child_process';
import readline from 'readline';

const BASE_URL = process.env.AR_BASE_URL || 'http://localhost:4200';
const LOGIN_URL = `${BASE_URL.replace(/\/$/, '')}/auth/login`;
const EMAIL_DEFAULT = process.env.AR_EMAIL || 'ecucondor@gmail.com';
const PROFILE = process.env.BROWSER_PROFILE || '/tmp/patchright-profile-local4200';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function createRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
}

async function ask(question, { silent = false, defaultValue } = {}) {
  const rl = createRl();
  if (!silent) {
    const q = defaultValue ? `${question} (enter = ${defaultValue}): ` : `${question}: `;
    return await new Promise((resolve) => {
      rl.question(q, (ans) => {
        rl.close();
        const trimmed = String(ans ?? '').trim();
        resolve(trimmed || defaultValue || '');
      });
    });
  }

  // Silent input (no echo)
  const q = `${question}: `;
  return await new Promise((resolve) => {
    const onData = (char) => {
      const s = String(char);
      switch (s) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(rl._line || '');
          break;
        case '\u0003':
          process.stdin.off('data', onData);
          rl.close();
          process.exit(130);
          break;
        default:
          // prevent echo
          rl._writeToOutput = () => { };
          break;
      }
    };

    process.stdout.write(q);
    process.stdin.on('data', onData);
    rl.question('', () => {
      // no-op: handled by onData
    });
  });
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
      clientInfo: { name: 'autorenta-login-rent-client', version: '1.0.0' },
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
      }, 60000);
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

async function main() {
  const email = await ask('Email', { defaultValue: EMAIL_DEFAULT });
  const password = await ask('Password (no se muestra)', { silent: true });
  if (!password) throw new Error('Password vacío. Cancelado.');

  const client = new MCPClient({
    command: 'node',
    args: ['server.js'],
    cwd: new URL('.', import.meta.url).pathname,
    env: {
      HEADLESS: process.env.HEADLESS ?? 'false',
      BROWSER_PROFILE: PROFILE,
    },
  });

  try {
    console.log(`[flow] Navegando a login: ${LOGIN_URL}`);
    await client.start();

    await client.tool('stream_navigate', { url: LOGIN_URL });
    await sleep(800);

    // Fill email/password with common selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[autocomplete="email"]',
      'input[name="email"]',
      'input[placeholder*="mail" i]',
      'input[placeholder*="correo" i]',
    ];

    const passSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[autocomplete="current-password"]',
      'input[placeholder*="contrase" i]',
      'input[placeholder*="password" i]',
    ];

    async function tryFill(selectors, text, label) {
      let lastErr;
      for (const sel of selectors) {
        try {
          await client.tool('stream_fill', { selector: sel, text });
          return sel;
        } catch (e) {
          lastErr = e;
        }
      }
      throw new Error(`${label} no encontrado. Último error: ${lastErr?.message || lastErr}`);
    }

    const usedEmailSel = await tryFill(emailSelectors, email, 'Email input');
    const usedPassSel = await tryFill(passSelectors, password, 'Password input');

    console.log(`[flow] Email selector: ${usedEmailSel}`);
    console.log(`[flow] Password selector: ${usedPassSel}`);

    // Submit
    const submitSelectors = [
      'button[type="submit"]',
      'text=/iniciar\s+sesión/i',
      'text=/ingresar/i',
      'text=/continuar/i',
    ];

    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        await client.tool('stream_click', { selector: sel });
        submitted = true;
        break;
      } catch {
        // keep trying
      }
    }
    if (!submitted) throw new Error('No pude enviar el formulario (botón submit no encontrado).');

    // Wait for navigation / session
    await sleep(1500);

    // Try to detect success by navigating to a protected route
    await client.tool('stream_navigate', { url: `${BASE_URL.replace(/\/$/, '')}/bookings` });
    await sleep(1200);

    const snap1 = await client.tool('stream_snapshot', {});
    const snapText1 = snap1?.content?.[0]?.text || '';
    if (/auth\/login|iniciar\s+sesión|ingresar/i.test(snapText1)) {
      console.log('[flow] Parece que siguió en login; continuo igual para intentar alquiler desde home.');
    } else {
      console.log('[flow] Login parece OK (no se ve UI de auth en snapshot).');
    }

    // Attempt rental: go home, open first car card by clicking a known heading/model name is hard,
    // so we try to click a visible car card image/title and then click Alquilar/Reservar.
    await client.tool('stream_navigate', { url: `${BASE_URL.replace(/\/$/, '')}/` });
    await sleep(1200);

    // Heuristic: click first link that looks like car detail (contains /cars/)
    // Use evaluate to find an href if the tool exists; otherwise fall back to clicking the first car heading.
    let carHref = null;
    try {
      const evalRes = await client.tool('stream_evaluate', {
        script: `(() => {
          const a = Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.getAttribute('href'))
            .filter(Boolean);
          const candidates = a.filter(h => h.startsWith('/cars/') && h.split('/').length >= 3);
          return candidates[0] || null;
        })()`
      });
      const txt = evalRes?.content?.[0]?.text || '';
      // stream_evaluate compact output embeds JSON; try parse
      const m = txt.match(/\{[\s\S]*\}$/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          carHref = parsed;
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    if (carHref) {
      console.log(`[flow] Abriendo auto: ${carHref}`);
      await client.tool('stream_navigate', { url: `${BASE_URL.replace(/\/$/, '')}${carHref}` });
      await sleep(1200);
    } else {
      // fallback: click any car title we saw earlier in snapshot
      const snapHome = await client.tool('stream_snapshot', {});
      const homeText = snapHome?.content?.[0]?.text || '';
      const lines = homeText.split('\n').map(s => s.trim()).filter(Boolean);
      const candidateTitle = lines.find(l => /porsche|fiat|volkswagen|ford|toyota/i.test(l));
      if (candidateTitle) {
        try {
          await client.tool('stream_click', { selector: `text=${candidateTitle}` });
          await sleep(1500);
        } catch {
          // ignore
        }
      }
    }

    // On car detail, attempt to click rent/reserve
    const rentSelectors = [
      'text=/alquilar/i',
      'text=/reservar/i',
      'text=/continuar/i',
      'a[href*="bookings"]',
      'button:has-text("Alquilar")',
    ];

    let rentClicked = false;
    for (const sel of rentSelectors) {
      try {
        await client.tool('stream_click', { selector: sel });
        rentClicked = true;
        break;
      } catch {
        // keep trying
      }
    }

    const snapFinal = await client.tool('stream_snapshot', {});
    const shot = await client.tool('stream_screenshot', { fullPage: true, compress: true });

    const finalText = snapFinal?.content?.[0]?.text || '';
    const shotText = shot?.content?.[0]?.text || '';

    console.log(rentClicked ? '[flow] Click de alquiler/reserva ejecutado.' : '[flow] No encontré botón de alquilar/reservar.');
    console.log('[flow] Snapshot final:');
    console.log(finalText ? finalText : '(vacío)');
    console.log('[flow] Screenshot:');
    console.log(shotText ? shotText : '(sin detalle)');
  } finally {
    // Ensure we don't keep password anywhere
    await sleep(200);
  }
}

main().catch((e) => {
  console.error(`[fatal] ${e?.message || e}`);
  process.exit(1);
});
