
import { spawn } from 'child_process';
import path from 'path';

const SERVER_PATH = './server.js';
const CWD = process.cwd();

async function runWalletShot() {
  console.log('🚀 Starting Wallet Screenshot Client...');

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
      clientInfo: { name: 'wallet-shot', version: '1.0' }
    });

    // 2. Navigate to MercadoPago Wallet (Home)
    console.log('💸 Navigating to MercadoPago Wallet...');
    // Use stream_navigate tool
    const navResult = await send('tools/call', {
        name: 'stream_navigate',
        arguments: { 
            url: 'https://www.mercadopago.com.ar/home', 
            waitUntil: 'networkidle',
            timeout: 60000 
        }
    });
    console.log('Navigated:', navResult?.content?.[0]?.text || 'OK');

    // 3. Take Screenshot
    console.log('📸 Capturing Wallet View...');
    const shotResult = await send('tools/call', {
        name: 'stream_screenshot',
        arguments: { fullPage: false } 
    });
    
    const text = shotResult.content[0].text;
    console.log(text); // Print the formatted output
    
    // Extract path using regex
    const match = text.match(/Path: (.+)/);
    if (match) {
        console.log(`✅ Extracted Path: ${match[1].trim()}`);
    }

  } catch (e) {
    console.error('❌ Failed:', e);
  } finally {
    proc.kill();
    process.exit(0);
  }
}

runWalletShot();
