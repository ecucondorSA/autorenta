#!/usr/bin/env node

import { spawn } from 'child_process';

function createClient(proc) {
  let buffer = '';
  let requestId = 0;
  const pending = new Map();

  proc.stdout.on('data', (data) => {
    buffer += data.toString('utf8');
    while (true) {
      const idx = buffer.indexOf('\n');
      if (idx === -1) return;
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || 'Unknown MCP error'));
        else resolve(msg.result);
      }
    }
  });

  function request(method, params = {}) {
    const id = ++requestId;
    const msg = { jsonrpc: '2.0', id, method, params };
    const p = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout waiting for ${method}`));
        }
      }, 30000);
    });
    proc.stdin.write(JSON.stringify(msg) + '\n');
    return p;
  }

  return { request };
}

async function main() {
  const proc = spawn('node', ['./tools/patchright-streaming-mcp/server.js'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  proc.stderr.on('data', (d) => process.stderr.write(String(d)));

  const client = createClient(proc);

  await new Promise((r) => setTimeout(r, 300));

  await client.request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'patchright-streaming-smoke', version: '1.0.0' },
  });

  const url = process.env.BASE_URL || 'http://localhost:4200/';

  await client.request('tools/call', { name: 'stream_navigate', arguments: { url } });
  const snap = await client.request('tools/call', { name: 'stream_snapshot', arguments: {} });
  const shot = await client.request('tools/call', { name: 'stream_screenshot', arguments: { fullPage: false, compress: true } });
  await client.request('tools/call', { name: 'stream_close', arguments: {} });

  console.log('SNAPSHOT_OK:', Boolean(snap?.content?.[0]?.text));
  console.log(snap?.content?.[0]?.text?.slice(0, 400) || '(no snapshot text)');
  console.log('SCREENSHOT_OK:', Boolean(shot?.content?.[0]?.text));
  if (!shot?.content?.length) {
    console.log('(no screenshot content)');
  } else {
    for (let i = 0; i < shot.content.length; i++) {
      console.log(`SCREENSHOT_CONTENT[${i}]:`);
      console.log(shot.content[i]?.text || '(no text)');
    }
  }

  proc.kill('SIGTERM');
}

main().catch((e) => {
  console.error('SMOKE_FAILED:', e?.message || e);
  process.exit(1);
});
