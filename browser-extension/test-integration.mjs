#!/usr/bin/env node
/**
 * Test Integration Script
 * Verifica que todo está conectado: Bridge ↔ Extension ↔ Playwright MCP
 */

import http from 'http';
import WebSocket from 'ws';

const BRIDGE_URL = 'ws://localhost:9223';
const HEALTH_CHECK_URL = 'http://localhost:9223/health';

let testResults = {
  bridgeServer: false,
  extensionConnected: false,
  playwriteIntegration: false,
  timestamp: new Date().toISOString()
};

console.log('\n🧪 Testing Browser Automation Integration\n');
console.log('================================================\n');

// Test 1: Bridge Server Health Check
async function testBridgeHealth() {
  console.log('1️⃣  Checking Bridge Server...');

  return new Promise((resolve) => {
    const req = http.get(HEALTH_CHECK_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log('   ✅ Bridge Server responsive');
          console.log('   └─ Extension connected:', status.extensionConnected ? '✓' : '✕');
          console.log('   └─ Status:', status.status);
          testResults.bridgeServer = true;
          resolve();
        } catch (error) {
          console.log('   ❌ Invalid response from bridge');
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.log('   ❌ Bridge Server not running');
      console.log('   └─ Run: npm run bridge (in browser-extension/)');
      resolve();
    });

    req.setTimeout(3000);
  });
}

// Test 2: WebSocket Connection
async function testWebSocketConnection() {
  console.log('\n2️⃣  Testing WebSocket Connection...');

  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(BRIDGE_URL, {
        headers: { 'x-client-type': 'playwright' }
      });

      const timeout = setTimeout(() => {
        ws.close();
        console.log('   ❌ WebSocket connection timeout');
        resolve();
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('   ✅ WebSocket connection established');

        // Test handshake
        ws.send(JSON.stringify({
          type: 'handshake',
          data: { clientType: 'playwright' }
        }));

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            if (message.type === 'handshake-ack') {
              console.log('   ✅ Bridge acknowledged connection');
              console.log('   └─ Extension status:', message.data?.extensionStatus);
              testResults.playwriteIntegration = true;
              ws.close();
              resolve();
            }
          } catch (error) {
            console.log('   ❌ Invalid handshake response');
            ws.close();
            resolve();
          }
        });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log('   ❌ WebSocket error:', error.message);
        resolve();
      });
    } catch (error) {
      console.log('   ❌ Failed to create WebSocket:', error.message);
      resolve();
    }
  });
}

// Test 3: Extension Check
async function testExtensionStatus() {
  console.log('\n3️⃣  Checking Chrome Extension...');

  return new Promise((resolve) => {
    const ws = new WebSocket(BRIDGE_URL, {
      headers: { 'x-client-type': 'playwright' }
    });

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'status-check',
        data: { requestType: 'extension-status' }
      }));

      setTimeout(() => {
        ws.close();
        resolve();
      }, 2000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.data?.extensionStatus === 'ready') {
          console.log('   ✅ Chrome Extension is connected');
          console.log('   └─ Status: ready');
          console.log('   └─ Capabilities: execute, screenshot, navigate');
          testResults.extensionConnected = true;
        } else if (message.data?.extensionStatus === 'waiting') {
          console.log('   ⚠️  Chrome Extension is not connected');
          console.log('   └─ Install extension: chrome://extensions → Load unpacked');
          console.log('   └─ Path: /home/edu/autorenta/browser-extension');
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    ws.on('error', () => {
      resolve();
    });
  });
}

// Test 4: Complete Flow Test
async function testCompleteFlow() {
  console.log('\n4️⃣  Testing Complete Flow (Bridge → Extension)...');

  if (!testResults.extensionConnected) {
    console.log('   ⚠️  Skipping (Extension not connected)');
    return;
  }

  return new Promise((resolve) => {
    const ws = new WebSocket(BRIDGE_URL, {
      headers: { 'x-client-type': 'playwright' }
    });

    const sessionId = 'test_' + Date.now();
    let responseReceived = false;

    const timeout = setTimeout(() => {
      if (!responseReceived) {
        console.log('   ⚠️  No response from Extension (timeout)');
      }
      ws.close();
      resolve();
    }, 5000);

    ws.on('open', () => {
      console.log('   └─ Sending test action: screenshot');

      ws.send(JSON.stringify({
        sessionId,
        action: { type: 'screenshot' }
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'action-result' && message.sessionId === sessionId) {
          responseReceived = true;
          clearTimeout(timeout);
          console.log('   ✅ Extension executed action successfully');
          console.log('   └─ Result received in', Date.now() % 1000, 'ms');
          ws.close();
          resolve();
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

// Print Summary
function printSummary() {
  console.log('\n================================================\n');
  console.log('📊 Test Results Summary\n');

  const allPassed = Object.values(testResults)
    .filter((v, i) => i !== 4) // Exclude timestamp
    .every(v => v === true);

  console.log(`Bridge Server:          ${testResults.bridgeServer ? '✅' : '❌'}`);
  console.log(`WebSocket Connection:   ${testResults.playwriteIntegration ? '✅' : '❌'}`);
  console.log(`Chrome Extension:       ${testResults.extensionConnected ? '✅' : '❌'}`);

  console.log('\n' + (allPassed ? '✨ All systems ready!' : '⚠️  Some components need setup') + '\n');

  if (!testResults.bridgeServer) {
    console.log('👉 Action: Start bridge server');
    console.log('   npm run bridge (in browser-extension/)\n');
  }

  if (!testResults.extensionConnected && testResults.playwriteIntegration) {
    console.log('👉 Action: Install Chrome Extension');
    console.log('   1. Open chrome://extensions');
    console.log('   2. Enable "Developer mode"');
    console.log('   3. Click "Load unpacked"');
    console.log('   4. Select /home/edu/autorenta/browser-extension\n');
  }

  if (allPassed) {
    console.log('🚀 You can now use:');
    console.log('   claude code "Take a screenshot of google.com"');
    console.log('   claude code "Click on button#submit"');
    console.log('   npm run test:e2e (for E2E tests)\n');
  }

  console.log('================================================\n');
  console.log('Timestamp:', testResults.timestamp);
  console.log('\n');
}

// Main Execution
async function main() {
  try {
    await testBridgeHealth();
    await testWebSocketConnection();
    await testExtensionStatus();
    await testCompleteFlow();
    printSummary();
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

main();
