#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class MCPStdioClient {
  constructor({ command, args, cwd }) {
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.requestId = 0;
    this.pending = new Map();
    this.buffer = '';
    this.proc = null;

    this.menuTimer = null;

    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start() {
    this.proc = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stdout.on('data', (data) => this.#onStdout(data));
    this.proc.stderr.on('data', (data) => process.stderr.write(String(data)));

    await new Promise((r) => setTimeout(r, 300));

    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'patchright-streaming-test-client', version: '1.0.0' },
    });

    this.showMenu();
  }

  async request(method, params = {}) {
    const id = ++this.requestId;
    const msg = { jsonrpc: '2.0', id, method, params };

    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout waiting for response to ${method}`));
        }
      }, 30000);
    });

    this.proc.stdin.write(JSON.stringify(msg) + '\n');
    return p;
  }

  notify(method, params = {}) {
    const msg = { jsonrpc: '2.0', method, params };
    this.proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  #onStdout(data) {
    this.buffer += data.toString('utf8');

    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx === -1) return;

      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);

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
      } else {
        // Notifications / logs
        process.stdout.write(`\n[MCP] ${line}\n`);
      }
    }
  }

  showMenu() {
    if (this.rl.closed) return;

    process.stdout.write(`
╔══════════════════════════════════════════════╗
║     Patchright Streaming MCP (Test Client)   ║
╚══════════════════════════════════════════════╝

0) Exit
1) tools/list
2) stream_status
3) stream_navigate
4) stream_snapshot
5) stream_click
6) stream_type
7) stream_wait_for
8) stream_get_events
9) stream_screenshot
10) stream_close

`);

    try {
      this.rl.question('Select option: ', async (answer) => {
        try {
          await this.handleOption(answer.trim());
        } catch (e) {
          console.error(`\n[client] Error: ${e?.message || e}`);
        }

        if (answer.trim() !== '0' && !this.rl.closed) {
          this.menuTimer = setTimeout(() => this.showMenu(), 150);
        }
      });
    } catch {
      // readline already closed
    }
  }

  async handleOption(option) {
    switch (option) {
      case '0':
        await this.shutdown();
        break;

      case '1': {
        const res = await this.request('tools/list');
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '2': {
        const res = await this.request('tools/call', {
          name: 'stream_status',
          arguments: {},
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '3': {
        const url = await this.#ask('URL to navigate: ');
        const res = await this.request('tools/call', {
          name: 'stream_navigate',
          arguments: { url },
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '4': {
        const res = await this.request('tools/call', {
          name: 'stream_snapshot',
          arguments: {},
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '5': {
        const selector = await this.#ask('CSS selector to click: ');
        const res = await this.request('tools/call', {
          name: 'stream_click',
          arguments: { selector },
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '6': {
        const selector = await this.#ask('CSS selector to fill: ');
        const text = await this.#ask('Text: ');
        const res = await this.request('tools/call', {
          name: 'stream_type',
          arguments: { selector, text },
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '7': {
        const selector = await this.#ask('CSS selector to wait for: ');
        const timeoutStr = await this.#ask('Timeout ms (enter for default): ');
        const timeout = timeoutStr ? Number(timeoutStr) : undefined;
        const res = await this.request('tools/call', {
          name: 'stream_wait_for',
          arguments: { selector, ...(Number.isFinite(timeout) ? { timeout } : {}) },
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '8': {
        const sinceStr = await this.#ask('since_id (enter for 0): ');
        const since_id = sinceStr ? Number(sinceStr) : 0;
        const res = await this.request('tools/call', {
          name: 'stream_get_events',
          arguments: { since_id },
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '9': {
        const fullPageStr = await this.#ask('fullPage? (y/N): ');
        const compressStr = await this.#ask('compress? (Y/n): ');
        const res = await this.request('tools/call', {
          name: 'stream_screenshot',
          arguments: {
            fullPage: /^y(es)?$/i.test(fullPageStr),
            compress: !/^n(o)?$/i.test(compressStr),
          },
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case '10': {
        const res = await this.request('tools/call', {
          name: 'stream_close',
          arguments: {},
        });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      default:
        console.log('Unknown option');
    }
  }

  async #ask(prompt) {
    return new Promise((resolve) => this.rl.question(prompt, resolve));
  }

  async shutdown() {
    if (this.menuTimer) {
      clearTimeout(this.menuTimer);
      this.menuTimer = null;
    }

    try {
      this.rl.close();
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

const client = new MCPStdioClient({
  command: 'node',
  args: ['server.js'],
  cwd: new URL('.', import.meta.url).pathname,
});

client.start().catch((e) => {
  console.error(e);
  process.exit(1);
});
