
import { spawn } from 'child_process';
import path from 'path';

const SERVER_PATH = './server.js';
const CWD = process.cwd();

async function runWalletCapture() {
  console.log('🚀 Starting Wallet Capture...');

  const proc = spawn('node', [SERVER_PATH], {
    cwd: CWD,
    env: { ...process.env, HEADLESS: 'false' }, 
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
        }
      } catch (e) { }
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
      clientInfo: { name: 'wallet-capture', version: '1.0' }
    });

    // 2. Clear session? No, we WANT to see if we are logged in or get the page
    // await send('tools/call', { name: 'stream_reset', arguments: {} });
    
    // 3. Navigate to Wallet
    const targetUrl = 'https://autorentar.com/wallet';
    console.log(`💸 Navigating to ${targetUrl}...`);
    
    await send('tools/call', {
        name: 'stream_navigate',
        arguments: { url: targetUrl, waitUntil: 'networkidle' }
    });
    
    // Wait a bit for rendering
    await send('tools/call', {
        name: 'stream_evaluate',
        arguments: { script: 'new Promise(r => setTimeout(r, 3000))' }
    });

    // 4. Take Screenshot
    console.log('📸 Taking Screenshot...');
    const result = await send('tools/call', {
        name: 'stream_screenshot',
        arguments: { fullPage: true, compress: false } // High quality
    });
    
    if (result.content?.[0]?.text) {
         // The SDK usually returns { content: [...], isError: false }
         // but our server implementation returns a raw result object which the SDK wraps.
         // Let's parse whatever we got.
    }
    console.log('RAW Result:', JSON.stringify(result));


  } catch (e) {
    console.error('❌ Capture failed:', e);
  } finally {
    proc.kill();
    process.exit(0);
  }
}

runWalletCapture();
