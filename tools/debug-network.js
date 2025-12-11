#!/usr/bin/env node
/**
 * Network error debugger - captures 404 and other HTTP errors
 */
const WebSocket = require('ws');
const http = require('http');

async function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔍 Network Error Debugger');
  console.log('========================\n');

  const targets = await getTargets();
  const target = targets.find(t =>
    t.url.includes('localhost') &&
    t.type === 'page' &&
    !t.url.includes('ngsw')
  );

  if (!target) {
    console.log('No target found');
    return;
  }

  console.log('Connected to:', target.url);
  console.log('Listening for network errors...\n');

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
  });

  const requests = new Map();

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Track request start
      if (msg.method === 'Network.requestWillBeSent') {
        requests.set(msg.params.requestId, msg.params.request.url);
      }

      // Network response with error status
      if (msg.method === 'Network.responseReceived') {
        const { response, requestId } = msg.params;
        if (response.status >= 400) {
          console.log(`❌ HTTP ${response.status}: ${response.url}`);
        }
      }

      // Loading failed
      if (msg.method === 'Network.loadingFailed') {
        const url = requests.get(msg.params.requestId) || 'unknown';
        console.log(`❌ Failed to load: ${url}`);
        console.log(`   Reason: ${msg.params.errorText}`);
      }

      // Console errors about resources
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const args = msg.params.args.map(a => a.value || a.description || '').join(' ');
        if (args.includes('404') || args.includes('Failed to load')) {
          console.log(`🔴 ${args}`);
        }
      }
    } catch (e) {}
  });
}

main().catch(console.error);
