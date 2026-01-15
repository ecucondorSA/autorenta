import { spawn } from 'child_process';
import fs from 'fs';

const SERVER_PATH = '/home/edu/autorenta/tools/patchright-streaming-mcp/server.js';
const LOG = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function run() {
  const proc = spawn('node', [SERVER_PATH], {
    cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
    env: { ...process.env, HEADLESS: 'false', DISPLAY: ':0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  proc.stderr.on('data', d => process.stderr.write(d));
  
  let id = 0;
  const send = (m, p) => {
    return new Promise((res, rej) => {
      const listener = (d) => {
         const lines = d.toString().split('\n');
         for(const line of lines) { 
             try { 
                const j = JSON.parse(line); 
                if(j.id === id) { proc.stdout.off('data', listener); res(j.result); }
             } catch(e){} 
         }
      };
      proc.stdout.on('data', listener);
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++id, method: m, params: p }) + '\n');
    });
  };

  try {
     await send('initialize', { capabilities: {}, clientInfo: { name: 'v4', version: '1' } });
     
     LOG('Navigating...');
     await send('tools/call', { name: 'stream_navigate', arguments: { url: 'https://autorentar.com/auth/login', waitUntil: 'networkidle' } });
     
     LOG('Typing Email...');
     await send('tools/call', { name: 'stream_click', arguments: { selector: 'input[formcontrolname="email"]' } });
     await send('tools/call', { name: 'stream_type', arguments: { selector: 'input[formcontrolname="email"]', text: 'eduardomarques@campus.fmed.uba.ar' } });

     LOG('Typing Password...');
     await send('tools/call', { name: 'stream_click', arguments: { selector: 'input[type="password"]' } });
     await send('tools/call', { name: 'stream_type', arguments: { selector: 'input[type="password"]', text: 'Ab.12345' } });

     LOG('Submitting...');
     await send('tools/call', { name: 'stream_press_key', arguments: { key: 'Enter' } });
     
     // Fallback click
     await new Promise(r => setTimeout(r, 1000));
     await send('tools/call', { name: 'stream_click', arguments: { selector: 'button[type="submit"]' } });

     LOG('Waiting for redirect...');
     for(let i=0; i<10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await send('tools/call', { name: 'stream_evaluate', arguments: { script: 'window.location.href' } });
        const text = res.content[0].text;
        LOG(`Url: ${text}`);
        if(text.includes('/wallet')) {
            LOG('SUCCESS! Logged in.');
            // Screenshot
            await send('tools/call', { name: 'stream_screenshot', arguments: { fullPage: true } });
            break;
        }
     }
  } catch(e) { console.error(e); }
  
  LOG('Done. Holding process.');
  setInterval(() => {}, 10000);
}

run();
