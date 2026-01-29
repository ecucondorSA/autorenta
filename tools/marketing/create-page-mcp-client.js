#!/usr/bin/env node
/**
 * MCP Client to Create AutoRentar Facebook Page
 * Connects to patchright-streaming-mcp server via stdio
 */

import { spawn } from 'child_process';

class MCPClient {
  constructor() {
    this.requestId = 0;
    this.pending = new Map();
    this.buffer = '';
  }

  async start() {
    console.log('🚀 Starting Patchright MCP Server...');

    this.proc = spawn('node', ['server.js'], {
      cwd: '/home/edu/autorenta/tools/patchright-streaming-mcp',
      env: {
        ...process.env,
        BROWSER_PROFILE: '/tmp/patchright-temp-profile',
        HEADLESS: 'false',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stdout.on('data', (data) => this.onStdout(data));
    this.proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (!msg.includes('[MCP]')) {
        process.stderr.write(msg);
      }
    });

    await this.sleep(1000);

    // Initialize MCP
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'create-page-client', version: '1.0.0' },
    });

    console.log('✅ MCP Server ready\n');
  }

  async request(method, params = {}) {
    const id = ++this.requestId;
    const msg = { jsonrpc: '2.0', id, method, params };

    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, 60000);
    });

    this.proc.stdin.write(JSON.stringify(msg) + '\n');
    return promise;
  }

  async callTool(name, args = {}) {
    const result = await this.request('tools/call', { name, arguments: args });
    return result.content?.[0]?.text ? JSON.parse(result.content[0].text) : result;
  }

  onStdout(data) {
    this.buffer += data.toString();

    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx === -1) break;

      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);

      if (!line) continue;

      try {
        const msg = JSON.parse(line);

        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);

          if (msg.error) {
            reject(new Error(msg.error.message || 'MCP Error'));
          } else {
            resolve(msg.result);
          }
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async shutdown() {
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
  }
}

async function createPage() {
  const client = new MCPClient();

  try {
    await client.start();

    // Navigate to Pages settings
    console.log('📍 Navigating to Pages settings...');
    await client.callTool('stream_navigate', {
      url: 'https://business.facebook.com/latest/settings/pages?business_id=2790781111081252',
    });
    await client.sleep(5000);

    // Take screenshot
    console.log('📸 Taking screenshot...');
    const screenshot1 = await client.callTool('stream_screenshot', { compress: true });
    console.log(`   Saved: ${screenshot1.path}`);

    // Get snapshot to see what's on page
    console.log('🔍 Getting page snapshot...');
    const snapshot = await client.callTool('stream_snapshot');
    console.log('   Current page:', snapshot.url);

    // Try clicking Add button
    console.log('➕ Clicking Add button...');
    try {
      await client.callTool('stream_click', { selector: 'button:has-text("Adicionar")' });
      await client.sleep(2000);
      console.log('✅ Clicked Add');
    } catch (e) {
      console.log('⚠️  Add button not found via selector, trying alternatives...');

      // Try by aria-label
      try {
        await client.callTool('stream_click', { selector: '[aria-label="Adicionar"]' });
        await client.sleep(2000);
      } catch (e2) {
        console.log('   Could not click Add button');
      }
    }

    // Screenshot after clicking
    const screenshot2 = await client.callTool('stream_screenshot', { compress: true });
    console.log(`📸 After click: ${screenshot2.path}`);

    // Try clicking "Create new page"
    console.log('📄 Clicking Create Page option...');
    try {
      await client.callTool('stream_click', { selector: 'text=Criar uma nova' });
      await client.sleep(3000);
      console.log('✅ Clicked Create Page');
    } catch (e) {
      console.log('⚠️  Create option not found');
    }

    // Final screenshot
    const screenshot3 = await client.callTool('stream_screenshot', { compress: true });
    console.log(`📸 Final state: ${screenshot3.path}`);

    console.log('\n' + '═'.repeat(60));
    console.log('📋 Browser is open - complete the form manually:');
    console.log('   1. Enter page name: AutoRentar');
    console.log('   2. Select category: Aluguel de carros');
    console.log('   3. Click "Criar"');
    console.log('   4. Copy the Page ID from the URL');
    console.log('═'.repeat(60));
    console.log('\nBrowser will stay open for 3 minutes...\n');

    await client.sleep(180000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.shutdown();
  }
}

createPage().catch(console.error);
