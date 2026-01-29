import { spawn } from 'child_process';
const SERVER_PATH = '/home/edu/autorenta/tools/patchright-streaming-mcp/server.js';
const LOG = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function run() {
  const proc = spawn('node', [SERVER_PATH], {
    cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
    env: { ...process.env, HEADLESS: 'false', DISPLAY: ':0' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Pipe server logs to stderr so we see them
  // proc.stderr.pipe(process.stderr);

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
     await send('initialize', { capabilities: {}, clientInfo: { name: 'check-login', version: '1' } });
     
     LOG('Checking Wallet Access...');
     await send('tools/call', { name: 'stream_navigate', arguments: { url: 'https://autorentar.com/wallet', waitUntil: 'networkidle' } });
     
     await new Promise(r => setTimeout(r, 5000));
     
     const res = await send('tools/call', { name: 'stream_evaluate', arguments: { script: 'window.location.href' } });
     const text = res.content[0].text;
     LOG(`Current URL: ${text}`);
     
     if (text.includes('/wallet')) {
         LOG('✅ ALREADY LOGGED IN. Session Active.');
         await send('tools/call', { name: 'stream_screenshot', arguments: { fullPage: true } });
     } else {
         LOG('❌ Redirected (likely to login). Need to login.');
         // TODO: Trigger login flow here if needed, but for now report status
     }

  } catch(e) { console.error(e); }
  
  LOG('Holding...');
  setInterval(() => {}, 10000);
}

run();
