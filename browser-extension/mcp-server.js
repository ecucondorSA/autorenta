#!/usr/bin/env node
/**
 * MCP Server para Browser Extension
 *
 * Conecta Claude Code con la extensión de Chrome via el bridge WebSocket.
 *
 * Mejoras v1.1:
 * - Reconexión infinita con backoff exponencial
 * - Lazy connection: reconecta automáticamente en cada tool call
 * - Health check que fuerza reconexión
 * - Mejor manejo de errores
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';

const BRIDGE_URL = 'ws://localhost:9223';
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const ACTION_TIMEOUT = 15000;
const CONNECTION_TIMEOUT = 5000;

class BrowserExtensionMCP {
  constructor() {
    this.server = new Server(
      { name: 'browser-extension', version: '1.1.0' },
      { capabilities: { tools: {} } }
    );

    this.bridgeSocket = null;
    this.bridgeConnected = false;
    this.pendingActions = new Map();
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.lastConnectionAttempt = 0;

    this.setupHandlers();
    this.connectToBridge();
  }

  // ========== Bridge Connection with Exponential Backoff ==========

  getReconnectDelay() {
    // Exponential backoff: 1s, 1.5s, 2.25s, 3.4s, ... max 30s
    const delay = Math.min(
      MAX_RECONNECT_DELAY,
      BASE_RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts)
    );
    return delay;
  }

  async connectToBridge() {
    // Prevent multiple simultaneous connection attempts
    if (this.isReconnecting) return;

    // Rate limit connection attempts
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 500) return;
    this.lastConnectionAttempt = now;

    this.isReconnecting = true;

    try {
      // Close existing socket if any
      if (this.bridgeSocket) {
        try {
          this.bridgeSocket.terminate();
        } catch (e) { /* ignore */ }
        this.bridgeSocket = null;
      }

      this.bridgeSocket = new WebSocket(BRIDGE_URL, {
        headers: { 'x-client-type': 'claude-code' },
        handshakeTimeout: CONNECTION_TIMEOUT
      });

      this.bridgeSocket.on('open', () => {
        this.bridgeConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        this.isReconnecting = false;
        console.error('[MCP] ✅ Connected to bridge server');

        // Handshake
        this.bridgeSocket.send(JSON.stringify({
          type: 'handshake',
          data: { clientType: 'claude-code', version: '1.1.0' }
        }));
      });

      this.bridgeSocket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleBridgeMessage(message);
        } catch (error) {
          console.error('[MCP] Error parsing bridge message:', error);
        }
      });

      this.bridgeSocket.on('close', () => {
        this.bridgeConnected = false;
        this.isReconnecting = false;
        console.error('[MCP] ❌ Disconnected from bridge');

        // Reject all pending actions
        for (const [sessionId, { reject }] of this.pendingActions) {
          reject(new Error('Bridge disconnected'));
        }
        this.pendingActions.clear();

        // Schedule reconnection with exponential backoff
        this.scheduleReconnect();
      });

      this.bridgeSocket.on('error', (error) => {
        this.isReconnecting = false;
        // Only log if not a connection refused (expected when bridge is down)
        if (!error.message.includes('ECONNREFUSED')) {
          console.error('[MCP] Bridge error:', error.message);
        }
      });

    } catch (error) {
      this.isReconnecting = false;
      console.error('[MCP] Failed to connect:', error.message);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.getReconnectDelay();

    // Log every 5 attempts
    if (this.reconnectAttempts % 5 === 1) {
      console.error(`[MCP] Reconnecting in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts})...`);
    }

    setTimeout(() => this.connectToBridge(), delay);
  }

  // Force reconnection (called by health check)
  async forceReconnect() {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    await this.connectToBridge();

    // Wait a bit for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.bridgeConnected;
  }

  handleBridgeMessage(message) {
    if (message.type === 'handshake-ack') {
      const extensionStatus = message.data?.extensionStatus || 'unknown';
      console.error(`[MCP] Bridge acknowledged - Extension: ${extensionStatus}`);
      return;
    }

    if (message.type === 'action-result' && message.sessionId) {
      const pending = this.pendingActions.get(message.sessionId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingActions.delete(message.sessionId);

        if (message.data?.error) {
          pending.reject(new Error(message.data.error));
        } else {
          pending.resolve(message.data?.result || message.data);
        }
      }
    }

    if (message.type === 'error') {
      const pending = this.pendingActions.get(message.sessionId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingActions.delete(message.sessionId);
        pending.reject(new Error(message.error || 'Unknown error'));
      }
    }
  }

  // ========== Send Action to Bridge (with auto-reconnect) ==========

  async ensureConnection() {
    if (this.bridgeConnected && this.bridgeSocket?.readyState === WebSocket.OPEN) {
      return true;
    }

    // Try to reconnect
    console.error('[MCP] Not connected, attempting reconnection...');
    const connected = await this.forceReconnect();

    if (!connected) {
      throw new Error(
        'Bridge not connected. Ensure bridge is running:\n' +
        '  cd browser-extension && npm run bridge\n' +
        'Then load extension in Chrome:\n' +
        '  chrome://extensions → Load unpacked'
      );
    }

    return true;
  }

  async sendAction(action) {
    // Lazy connection: try to connect if not connected
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const sessionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const timeoutId = setTimeout(() => {
        this.pendingActions.delete(sessionId);
        reject(new Error(`Action timeout after ${ACTION_TIMEOUT}ms: ${action.type}`));
      }, ACTION_TIMEOUT);

      this.pendingActions.set(sessionId, { resolve, reject, timeout: timeoutId });

      try {
        this.bridgeSocket.send(JSON.stringify({
          type: 'action',
          sessionId,
          action,
          timeout: ACTION_TIMEOUT
        }));
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingActions.delete(sessionId);
        reject(new Error(`Failed to send action: ${error.message}`));
      }
    });
  }

  // ========== MCP Handlers ==========

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'browser_status',
          description: 'Check browser extension connection status and force reconnect if needed',
          inputSchema: {
            type: 'object',
            properties: {
              reconnect: {
                type: 'boolean',
                description: 'Force reconnection attempt (default: false)'
              }
            }
          }
        },
        {
          name: 'browser_navigate',
          description: 'Navigate to a URL in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to' }
            },
            required: ['url']
          }
        },
        {
          name: 'browser_click',
          description: 'Click on an element using CSS selector',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of element to click' }
            },
            required: ['selector']
          }
        },
        {
          name: 'browser_type',
          description: 'Type text into an input element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of input element' },
              text: { type: 'string', description: 'Text to type' },
              clear: { type: 'boolean', description: 'Clear field before typing (default: true)' }
            },
            required: ['selector', 'text']
          }
        },
        {
          name: 'browser_scroll',
          description: 'Scroll the page up or down',
          inputSchema: {
            type: 'object',
            properties: {
              direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
              amount: { type: 'number', description: 'Pixels to scroll (default: 500)' }
            },
            required: ['direction']
          }
        },
        {
          name: 'browser_screenshot',
          description: 'Take a screenshot of the current page (returns base64)',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_wait',
          description: 'Wait for a specified time',
          inputSchema: {
            type: 'object',
            properties: {
              ms: { type: 'number', description: 'Milliseconds to wait (default: 1000, max: 30000)' }
            }
          }
        },
        {
          name: 'browser_get_text',
          description: 'Get text content of an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of element' }
            },
            required: ['selector']
          }
        },
        {
          name: 'browser_get_url',
          description: 'Get the current page URL',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_wait_for',
          description: 'Wait for an element to appear (with intelligent polling)',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to wait for' },
              timeout: { type: 'number', description: 'Max wait time in ms (default: 10000)' }
            },
            required: ['selector']
          }
        },
        {
          name: 'browser_wait_network',
          description: 'Wait for network to be idle (no pending requests)',
          inputSchema: {
            type: 'object',
            properties: {
              idleTime: { type: 'number', description: 'Time with no requests to consider idle (default: 500ms)' },
              timeout: { type: 'number', description: 'Max wait time (default: 10000ms)' }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      try {
        let result;

        switch (name) {
          case 'browser_status': {
            // Force reconnect if requested
            if (args?.reconnect) {
              console.error('[MCP] Forcing reconnection...');
              await this.forceReconnect();
            }

            result = {
              connected: this.bridgeConnected,
              bridgeUrl: BRIDGE_URL,
              reconnectAttempts: this.reconnectAttempts,
              pendingActions: this.pendingActions.size,
              socketState: this.bridgeSocket?.readyState ?? 'none',
              message: this.bridgeConnected
                ? '✅ Bridge connected - Ready to use'
                : '❌ Bridge not connected - Use reconnect:true or start bridge server'
            };
            break;
          }

          case 'browser_navigate':
            result = await this.sendAction({
              type: 'navigate',
              value: args.url
            });
            break;

          case 'browser_click':
            result = await this.sendAction({
              type: 'click',
              selector: args.selector
            });
            break;

          case 'browser_type':
            result = await this.sendAction({
              type: 'type',
              selector: args.selector,
              value: args.text,
              clear: args.clear !== false
            });
            break;

          case 'browser_scroll':
            result = await this.sendAction({
              type: 'scroll',
              options: {
                direction: args.direction,
                amount: args.amount || 500
              }
            });
            break;

          case 'browser_screenshot': {
            const screenshotResult = await this.sendAction({ type: 'screenshot' });
            // Truncate base64 for display, but note the full data was received
            const hasScreenshot = !!screenshotResult?.screenshot;
            result = {
              success: hasScreenshot,
              format: 'base64/png',
              size: hasScreenshot ? `${Math.round(screenshotResult.screenshot.length / 1024)}KB` : 'N/A',
              preview: hasScreenshot ? screenshotResult.screenshot.substring(0, 100) + '...' : null
            };
            break;
          }

          case 'browser_wait': {
            const waitTime = Math.min(args?.ms || 1000, 30000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            result = { waited: waitTime, unit: 'ms' };
            break;
          }

          case 'browser_get_text':
            result = await this.sendAction({
              type: 'getText',
              selector: args.selector
            });
            break;

          case 'browser_get_url':
            result = await this.sendAction({
              type: 'getUrl'
            });
            break;

          case 'browser_wait_for':
            result = await this.sendAction({
              type: 'waitFor',
              selector: args.selector,
              timeout: args.timeout || 10000
            });
            break;

          case 'browser_wait_network':
            result = await this.sendAction({
              type: 'waitForNetworkIdle',
              idleTime: args.idleTime || 500,
              timeout: args.timeout || 10000
            });
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const elapsed = Date.now() - startTime;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ ...result, _elapsed: `${elapsed}ms` }, null, 2)
          }]
        };

      } catch (error) {
        const elapsed = Date.now() - startTime;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              tool: name,
              _elapsed: `${elapsed}ms`,
              hint: this.getErrorHint(error.message)
            }, null, 2)
          }],
          isError: true
        };
      }
    });
  }

  getErrorHint(errorMessage) {
    if (errorMessage.includes('Bridge not connected')) {
      return 'Run: cd browser-extension && npm run bridge';
    }
    if (errorMessage.includes('Extension not connected')) {
      return 'Load extension in Chrome: chrome://extensions → Load unpacked';
    }
    if (errorMessage.includes('Element not found')) {
      return 'Verify the CSS selector is correct and element exists on page';
    }
    if (errorMessage.includes('timeout')) {
      return 'Action took too long. Check if Chrome is responsive and not minimized';
    }
    return 'Check bridge server logs for more details';
  }

  // ========== Start Server ==========

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[MCP] Browser Extension MCP Server v1.1.0 started');
    console.error('[MCP] Features: auto-reconnect, lazy connection, exponential backoff');
  }
}

// ========== Main ==========

const mcp = new BrowserExtensionMCP();
mcp.start().catch(error => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('[MCP] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP] Shutting down...');
  process.exit(0);
});
