
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const SERVER_PATH = './server.js';
const CWD = process.cwd();

async function runTest() {
  console.log('🚀 Starting Stealth Test Client...');

  const proc = spawn('node', [SERVER_PATH], {
    cwd: CWD,
    env: { ...process.env, HEADLESS: 'false' }, // Watch it live if possible or just use server default
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let requestId = 0;
  const pending = new Map();

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pending.has(msg.id)) {
          const { resolve, reject } = pending.get(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
          pending.delete(msg.id);
        } else if (msg.method === 'notifications/resources/list_changed') {
            // ignore
        } else {
            // console.log('[Server Notification]', line);
        }
      } catch (e) {
        // console.error('Failed to parse:', line);
      }
    }
  });

  proc.stderr.on('data', (d) => process.stderr.write(d));

  const send = (method, params) => {
    const id = ++requestId;
    const msg = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      proc.stdin.write(JSON.stringify(msg) + '\n');
    });
  };

  try {
    // 1. Initialize
    await send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'stealth-tester', version: '1.0' }
    });

    // 2. Clear previous session/browser to ensure clean state
    console.log('🧹 Resetting browser session...');
    // await send('notifications/tools/call', { name: 'stream_reset', arguments: {} });
    // Note: server.js uses callTool request structure differently via SDK usually, 
    // but the raw protocol expectation for 'callTool' is method: 'tools/call'.
    // Wait, the server uses @modelcontextprotocol/sdk. 
    // The request method is 'tools/call'.
    
    // 3. Navigate to Stealth Test
    console.log('🕵️ Navigating to bot.sannysoft.com...');
    await send('tools/call', {
        name: 'stream_navigate',
        arguments: { url: 'https://bot.sannysoft.com', waitUntil: 'networkidle' }
    });

    // 4. Take Screenshot
    console.log('📸 Taking Evidence Screenshot 1...');
    const result1 = await send('tools/call', {
        name: 'stream_screenshot',
        arguments: { fullPage: true }
    });
    console.log('✅ Screenshot 1 saved at:', result1.content[0].text); // SDK returns content array
    // Wait config of server might return direct object or content array depending on SDK version?
    // Looking at server.js: return { path: ... } directly from the tool handler.
    // The SDK wraps this in { content: [ { type: 'text', text: JSON.stringify(result) } ] } usually?
    // No, standard SDK implementation:
    // The handler returns a result object. The SDK wraps it in { content: [...] } usually.
    // Let's print the whole result to be sure.
    console.log('Result Object:', JSON.stringify(result1));


    // 5. Navigate to Cloudflare Challenge (NowSecure)
    console.log('🛡️ Navigating to nowsecure.nl (Cloudflare Check)...');
    await send('tools/call', {
        name: 'stream_navigate',
        arguments: { url: 'https://nowsecure.nl', waitUntil: 'domcontentloaded' }
    });
    // Wait a bit using evaluate
    await send('tools/call', {
        name: 'stream_evaluate',
        arguments: { script: 'new Promise(r => setTimeout(r, 5000))' }
    });

    // 6. Take Screenshot 2
    console.log('📸 Taking Evidence Screenshot 2...');
    const result2 = await send('tools/call', {
        name: 'stream_screenshot',
        arguments: { fullPage: true, compress: false }
    });
    console.log('Result Object 2:', JSON.stringify(result2));

  } catch (e) {
    console.error('❌ Test failed:', e);
  } finally {
    // Cleanup
    proc.kill();
    process.exit(0);
  }
}

runTest();
