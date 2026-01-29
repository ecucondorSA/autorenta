#!/usr/bin/env node
/**
 * Persistent Wallet Viewer (MCP Client)
 * Launches browser, Logs in (if needed), Go to Wallet, and STAYS OPEN.
 */
import { spawn } from 'child_process';

const SERVER_PATH = './server.js';
const CWD = process.cwd();

async function runDaemon() {
  console.log('🚀 Starting Persistent MCP Session...');

  const proc = spawn('node', [SERVER_PATH], {
    cwd: CWD,
    env: { ...process.env, HEADLESS: 'false' }, // Visible browser
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
        } else {
             // Log events to stdout so we can see them in tmux logs
             if (msg.method === 'notifications/resources/list_changed') return;
             // console.log('[Event]', JSON.stringify(msg).substring(0, 100));
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
    // 1. Init
    await send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'persistent-wallet', version: '1.0' }
    });

    // 2. Navigate to Login first (to ensure we can see wallet)
    // Using credentials from direct-login.js reference
    console.log('🔑 Navigating to Login...');
    await send('tools/call', {
        name: 'stream_navigate',
        arguments: { url: 'https://autorentar.com/auth/login', waitUntil: 'networkidle' }
    });

    // 3. Perform Login
    console.log('✍️ Filling Credentials...');
    await send('tools/call', {
        name: 'stream_fill',
        arguments: { selector: 'input[type="email"], input[formcontrolname="email"]', text: 'eduardomarques@campus.fmed.uba.ar' }
    });
    
    await send('tools/call', {
        name: 'stream_fill',
        arguments: { selector: 'input[type="password"]', text: 'Ab.12345' }
    });

    console.log('🖱️ Clicking Login...');
    await send('tools/call', {
        name: 'stream_click',
        arguments: { selector: 'button[type="submit"]', force: true }
    });
    
    // Wait for navigation
    await send('tools/call', {
        name: 'stream_evaluate',
        arguments: { script: 'new Promise(r => setTimeout(r, 5000))' } // 5s wait
    });

    // 4. Navigate to Wallet
    console.log('💸 Navigating to Wallet...');
    await send('tools/call', {
        name: 'stream_navigate',
        arguments: { url: 'https://autorentar.com/wallet', waitUntil: 'networkidle' }
    });

    // 5. Screenshot
    console.log('📸 Saving Proof...');
    const shot = await send('tools/call', {
        name: 'stream_screenshot',
        arguments: { fullPage: true }
    });
    console.log('Saved:', JSON.stringify(shot));

    console.log('✅ READY. Browser is open and parked at Wallet.');
    console.log('⚠️  DO NOT CLOSE THIS TERMINAL to keep browser alive.');
    
    // Keep alive loop
    setInterval(() => {
        // Heartbeat to keep connection active if needed, or just sleep
        send('notifications/ping', {}); 
    }, 60000);

  } catch (e) {
    console.error('❌ Error in daemon:', e);
  }
}

runDaemon();
