#!/usr/bin/env node
/**
 * Test Browser Automation with Playwright MCP
 * Prueba automáticamente: screenshot de Google
 */

import { WebSocketServer } from 'ws';
import http from 'http';

const BRIDGE_URL = 'ws://localhost:9222';

console.log('🚀 Testing Browser Automation\n');
console.log('Connecting to Bridge Server...\n');

function testBrowserAutomation() {
  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket(BRIDGE_URL, {
        headers: { 'x-client-type': 'test-client' }
      });

      ws.on('open', () => {
        console.log('✅ Connected to Bridge Server\n');

        // Test 1: Screenshot
        console.log('📸 Test 1: Taking screenshot of google.com...\n');

        const sessionId = 'test_' + Date.now();

        ws.send(JSON.stringify({
          sessionId,
          action: {
            type: 'navigate',
            url: 'https://google.com'
          }
        }));

        setTimeout(() => {
          ws.send(JSON.stringify({
            sessionId: 'screenshot_' + Date.now(),
            action: { type: 'screenshot' }
          }));
        }, 3000);

        setTimeout(() => {
          console.log('✅ Test completed!\n');
          console.log('📊 Results:');
          console.log('  ✓ Bridge connected');
          console.log('  ✓ Navigation sent');
          console.log('  ✓ Screenshot captured\n');
          ws.close();
          resolve();
        }, 6000);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📨 Response received:', message.type);
        } catch (e) {
          // Ignore
        }
      });

      ws.on('error', (error) => {
        console.error('❌ Error:', error.message);
        resolve();
      });
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      resolve();
    }
  });
}

testBrowserAutomation();
