#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Script para probar que los recursos se exponen correctamente
async function testResources() {
  console.log('🧪 Testing MCP Server Resources...\n');

  const server = spawn('node', ['dist/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let requestId = 0;
  let responses = [];

  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        if (response.result) {
          console.log('✅ Response:', JSON.stringify(response.result, null, 2));
        } else if (response.error) {
          console.error('❌ Error:', response.error);
        }
      } catch (e) {
        // Ignorar mensajes no-JSON
      }
    }
  });

  server.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Resources:') || msg.includes('Tools:')) {
      console.log('📊', msg.trim());
    }
  });

  // Esperar a que el servidor inicie
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 1. Initialize
  console.log('\n1️⃣  Sending initialize...');
  sendRequest(server, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. List resources
  console.log('\n2️⃣  Listing resources...');
  sendRequest(server, 'resources/list', {});

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Read platform status
  console.log('\n3️⃣  Reading platform status...');
  sendRequest(server, 'resources/read', {
    uri: 'autorenta://platform/status'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. List tools
  console.log('\n4️⃣  Listing tools...');
  sendRequest(server, 'tools/list', {});

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 5. Read available cars
  console.log('\n5️⃣  Reading available cars...');
  sendRequest(server, 'resources/read', {
    uri: 'autorenta://cars/available'
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n✅ Test completed!');
  server.kill();
  process.exit(0);
}

function sendRequest(server, method, params) {
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id: ++requestId
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

let requestId = 0;

testResources().catch(console.error);
