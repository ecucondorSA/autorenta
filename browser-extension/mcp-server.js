#!/usr/bin/env node
/**
 * MCP Server para Browser Extension
 *
 * Conecta Claude Code con la extensión de Chrome via el bridge WebSocket.
 *
 * Flujo:
 * Claude Code (stdio) → MCP Server → WebSocket → Bridge (9223) → Extension → Browser
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';

const BRIDGE_URL = 'ws://localhost:9223';
const RECONNECT_DELAY = 3000;
const ACTION_TIMEOUT = 10000;

class BrowserExtensionMCP {
  constructor() {
    this.server = new Server(
      { name: 'browser-extension', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.bridgeSocket = null;
    this.bridgeConnected = false;
    this.pendingActions = new Map();
    this.reconnectAttempts = 0;

    this.setupHandlers();
    this.connectToBridge();
  }

  // ========== Bridge Connection ==========

  connectToBridge() {
    try {
      this.bridgeSocket = new WebSocket(BRIDGE_URL, {
        headers: { 'x-client-type': 'claude-code' }
      });

      this.bridgeSocket.on('open', () => {
        this.bridgeConnected = true;
        this.reconnectAttempts = 0;
        console.error('[MCP] Connected to bridge server');

        // Handshake
        this.bridgeSocket.send(JSON.stringify({
          type: 'handshake',
          data: { clientType: 'claude-code', version: '1.0.0' }
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
        console.error('[MCP] Disconnected from bridge');

        // Reject all pending actions
        for (const [sessionId, { reject }] of this.pendingActions) {
          reject(new Error('Bridge disconnected'));
        }
        this.pendingActions.clear();

        // Reconnect
        if (this.reconnectAttempts < 5) {
          this.reconnectAttempts++;
          setTimeout(() => this.connectToBridge(), RECONNECT_DELAY);
        }
      });

      this.bridgeSocket.on('error', (error) => {
        console.error('[MCP] Bridge connection error:', error.message);
      });

    } catch (error) {
      console.error('[MCP] Failed to connect to bridge:', error.message);
      setTimeout(() => this.connectToBridge(), RECONNECT_DELAY);
    }
  }

  handleBridgeMessage(message) {
    if (message.type === 'handshake-ack') {
      console.error('[MCP] Bridge acknowledged:', message.data?.status);
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

  // ========== Send Action to Bridge ==========

  async sendAction(action) {
    if (!this.bridgeConnected || !this.bridgeSocket) {
      throw new Error('Bridge not connected. Start the bridge server: npm run bridge');
    }

    return new Promise((resolve, reject) => {
      const sessionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const timeoutId = setTimeout(() => {
        this.pendingActions.delete(sessionId);
        reject(new Error(`Action timeout: ${action.type}`));
      }, ACTION_TIMEOUT);

      this.pendingActions.set(sessionId, { resolve, reject, timeout: timeoutId });

      this.bridgeSocket.send(JSON.stringify({
        type: 'action',
        sessionId,
        action,
        timeout: ACTION_TIMEOUT
      }));
    });
  }

  // ========== MCP Handlers ==========

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'browser_status',
          description: 'Check browser extension connection status',
          inputSchema: { type: 'object', properties: {} }
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
              text: { type: 'string', description: 'Text to type' }
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
          description: 'Take a screenshot of the current page',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_wait',
          description: 'Wait for a specified time',
          inputSchema: {
            type: 'object',
            properties: {
              ms: { type: 'number', description: 'Milliseconds to wait (default: 1000)' }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'browser_status':
            result = {
              bridgeConnected: this.bridgeConnected,
              bridgeUrl: BRIDGE_URL,
              pendingActions: this.pendingActions.size,
              message: this.bridgeConnected
                ? 'Extension ready'
                : 'Bridge not connected - run: npm run bridge'
            };
            break;

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
              value: args.text
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

          case 'browser_screenshot':
            result = await this.sendAction({
              type: 'screenshot'
            });
            break;

          case 'browser_wait':
            await new Promise(resolve => setTimeout(resolve, args.ms || 1000));
            result = { waited: args.ms || 1000 };
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              tool: name,
              hint: error.message.includes('Bridge')
                ? 'Start bridge server: cd browser-extension && npm run bridge'
                : 'Check if extension is loaded in Chrome'
            }, null, 2)
          }],
          isError: true
        };
      }
    });
  }

  // ========== Start Server ==========

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[MCP] Browser Extension MCP Server started');
    console.error('[MCP] Connecting to bridge at', BRIDGE_URL);
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
