#!/usr/bin/env node
/**
 * Robust Login & Persist Agent
 * - Kills conflicts
 * - Cleans locks
 * - Logs in
 * - Verifies success via visible element
 * - Holds session
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SERVER_PATH = '/home/edu/autorenta/tools/patchright-streaming-mcp/server.js';
const LOG_FILE = '/home/edu/autorenta/tools/patchright-streaming-mcp/daemon.log';
const PROFILE_DIR = '/home/edu/.patchright-profile';
const LOCK_FILE = path.join(PROFILE_DIR, 'SingletonLock');

// Helpers
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function run() {
  log('🚀 Starting Login Sequence...');

  // 1. Cleanup Locks (Aggressive)
  if (fs.existsSync(LOCK_FILE)) {
    log('⚠️ Removing stale lock file...');
    try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
  }

  // 2. Spawn Server
  const proc = spawn('node', [SERVER_PATH], {
    cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
    env: { 
      ...process.env, 
      HEADLESS: 'false',
      DISPLAY: ':0',
      BROWSER_PROFILE: PROFILE_DIR 
    },
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
      } catch (e) {
          // log(`[Stream] ${line.substring(0, 100)}`); 
      }
    }
  });
  
  proc.stderr.on('data', d => process.stderr.write(d));

  const send = (method, params) => {
    const id = ++requestId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  };

  try {
    await send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'admin-login', version: '2.0' } });

    // 3. Login Flow
    log('🔐 Navigating to Login...');
    await send('tools/call', { name: 'stream_navigate', arguments: { url: 'https://autorentar.com/auth/login', waitUntil: 'networkidle' } });
    
    log('✍️  Filling Credentials (JS-injected)...');
    await send('tools/call', { 
        name: 'stream_evaluate', 
        arguments: { 
            script: `
            (async function(){
                function setVal(sel, val) {
                    const el = document.querySelector(sel);
                    if (!el) return false;
                    const native = el.tagName === 'INPUT' ? el : el.querySelector('input');
                    if (native) {
                        native.value = val;
                        native.dispatchEvent(new Event('input', { bubbles: true }));
                        native.dispatchEvent(new Event('change', { bubbles: true }));
                        native.dispatchEvent(new Event('blur', { bubbles: true }));
                    } else {
                        // fallback
                        el.value = val;
                    }
                    el.dispatchEvent(new Event('ionInput', { bubbles: true }));
                    el.dispatchEvent(new Event('ionChange', { bubbles: true }));
                    return true;
                }
                
                setVal('input[formcontrolname="email"]', 'eduardomarques@campus.fmed.uba.ar') || setVal('input[type="email"]', 'eduardomarques@campus.fmed.uba.ar');
                await new Promise(r => setTimeout(r, 500));
                setVal('input[type="password"]', 'Ab.12345');
                return "Filled";
            })()
            ` 
        } 
    });

    log('🖱️  Submitting via JS (Robust Check & Force)...');
    await send('tools/call', { 
        name: 'stream_evaluate', 
        arguments: { 
            script: `
            (function(){
                const btn = document.querySelector('button[type="submit"]') || document.querySelector('ion-button[type="submit"]');
                if(!btn) return "Button not found";
                
                // Force enable if disabled
                if(btn.disabled || btn.getAttribute('disabled') !== null) {
                    btn.disabled = false;
                    btn.removeAttribute('disabled');
                }
                
                btn.click(); 
                return "Clicked (Forced)";
            })()
            ` 
        } 
    });

    // 4. Verification Loop
    log('⏳ Waiting for Wallet Dashboard...');
    let loggedIn = false;
    for (let i = 0; i < 20; i++) {
        await send('tools/call', { name: 'stream_evaluate', arguments: { script: 'new Promise(r => setTimeout(r, 3000))' } });
        
        const toolResult = await send('tools/call', {
            name: 'stream_evaluate',
            arguments: { 
                script: `
                    (function() {
                        const url = window.location.href;
                        const hasWallet = document.querySelector('.wallet-page') !== null;
                        const hasError = document.body.innerText.includes('Error al cargar');
                        const alert = document.querySelector('.alert-danger, ion-text[color="danger"]');
                        const errorMsg = alert ? alert.innerText : null;
                        return { url, hasWallet, hasError, errorMsg };
                    })()
                ` 
            }
        });
        
        let data = { url: 'unknown' };
        try {
            const jsonText = toolResult.content[0].text;
            const match = jsonText.match(/\{.*\}/s);
            if (match) {
                data = JSON.parse(match[0]);
            } else {
                log('⚠️ Could not extract JSON from: ' + jsonText.substring(0, 50));
            }
        } catch(e) { log('   JSON Parse Error'); continue; }

        log(`   Check ${i+1}: URL=${data.url}, Wallet=${data.hasWallet}, Error=${data.errorMsg}`);
        
        if (data.url && (data.url.includes('/wallet') || data.hasWallet)) {
            loggedIn = true;
            break;
        }

        // Handle redirect loop or stuck on login
        if (data.url.includes('/auth/login')) {
             // Maybe click again if stuck?
        }
    }

    if (loggedIn) {
        log('✅ LOGIN TRIUMPH! Session Secured.');
        // Screenshot
        await send('tools/call', { name: 'stream_screenshot', arguments: { fullPage: true } });
        log('📸 Screenshot saved.');
    } else {
        log('❌ Login Verification Failed (Timeout). keeping browser open for manual inspection.');
    }

    log('⚠️  SERVER STAYING ACTIVE. Do not close.');
    
    // Heartbeat
    setInterval(() => send('notifications/ping', {}), 30000);

  } catch (err) {
    log(`❌ Fatal: ${err.message}`);
  }
}

run();
