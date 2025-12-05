#!/usr/bin/env node
/**
 * Playwright Streaming MCP Server v1.0
 *
 * Real-time browser events via Chrome DevTools Protocol (CDP)
 *
 * Features:
 * - Live DOM mutation tracking
 * - Network request monitoring
 * - Console message capture
 * - Page navigation events
 * - Real-time event buffer for polling
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';

// ========== Configuration ==========
const CONFIG = {
  headless: false,  // Visible browser
  viewport: { width: 1280, height: 720 },
  eventBufferSize: 100,  // Max events to keep in buffer
  slowMo: 50,  // Slow down actions for visibility
  compactOutput: true,  // Return concise formatted output
  maxEventSummary: 5,  // Max events to include in summaries
};

// ========== Compact Output Formatting ==========
function formatCompact(data, type) {
  if (!CONFIG.compactOutput) {
    return JSON.stringify(data, null, 2);
  }

  switch (type) {
    case 'navigate':
      return `✅ Navigated to: ${data.url}\n📄 Title: ${data.title}\n📊 Events: ${data.eventsTriggered}`;

    case 'click':
      return `✅ Clicked: ${data.clicked}\n📊 Events: ${data.eventsTriggered}`;

    case 'type':
      return `✅ Typed in: ${data.selector}\n📝 Text: "${data.typed.substring(0, 30)}${data.typed.length > 30 ? '...' : ''}"`;

    case 'wait_for':
      return data.found
        ? `✅ Found: ${data.selector}`
        : `❌ Timeout waiting for: ${data.selector}`;

    case 'snapshot': {
      const elements = extractKeyElements(data.snapshot);
      return `📍 URL: ${data.url}\n📄 Title: ${data.title}\n\n🔍 Key Elements:\n${elements}\n\n📊 Buffer: ${data.recentEvents?.length || 0} recent events`;
    }

    case 'events': {
      if (!data.events?.length) return `📭 No new events (last ID: ${data.lastEventId})`;
      const summary = summarizeEvents(data.events);
      return `📊 ${data.count} events since ID ${data.lastEventId - data.count}:\n${summary}`;
    }

    case 'status':
      return `🌐 Browser: ${data.browserOpen ? 'Open' : 'Closed'}\n📍 URL: ${data.pageUrl || 'N/A'}\n📊 Buffer: ${data.eventsInBuffer} events`;

    case 'screenshot':
      return `📸 Screenshot captured (${data.size})\n[base64 data truncated - ${data.data.length} chars]`;

    case 'evaluate':
      const resultStr = JSON.stringify(data.result);
      return `📜 Result: ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`;

    case 'close':
      return `🔒 Browser closed, events cleared`;

    case 'error':
      return `❌ Error: ${data.error}\n🔧 Tool: ${data.tool}`;

    default:
      return JSON.stringify(data, null, 2);
  }
}

function extractKeyElements(snapshot, state = { count: 0 }) {
  const MAX = 15; // Max elements to show
  if (!snapshot || state.count >= MAX) return '';

  const lines = [];
  const role = snapshot.role || '';
  const name = (snapshot.name || '').trim();

  // Only key interactive elements with names
  if (name && ['button', 'link', 'textbox', 'heading'].includes(role) && state.count < MAX) {
    const short = name.length > 30 ? name.substring(0, 30) + '…' : name;
    const icon = role === 'heading' ? '📌' : role === 'button' ? '🔘' : role === 'link' ? '🔗' : '📝';
    lines.push(`${icon} ${short}`);
    state.count++;
  }

  // Shallow recursion only
  if (snapshot.children && state.count < MAX) {
    for (const child of snapshot.children.slice(0, 10)) {
      const r = extractKeyElements(child, state);
      if (r) lines.push(r);
    }
  }

  return lines.filter(l => l).join('\n');
}

function summarizeEvents(events) {
  const grouped = {};

  for (const e of events) {
    grouped[e.type] = grouped[e.type] || [];
    grouped[e.type].push(e);
  }

  const lines = [];
  for (const [type, evts] of Object.entries(grouped)) {
    if (type === 'network_request' || type === 'network_response') {
      // Just count network events
      lines.push(`  📡 ${type}: ${evts.length} requests`);
    } else if (type === 'dom_change') {
      lines.push(`  🔄 DOM changes: ${evts.length}`);
    } else if (type === 'console') {
      const msgs = evts.slice(-3).map(e => `"${e.data.text?.substring(0, 40)}..."`);
      lines.push(`  💬 Console (${evts.length}): ${msgs.join(', ')}`);
    } else if (type === 'navigation') {
      lines.push(`  🧭 Navigation: ${evts[evts.length - 1].data.url}`);
    } else if (type === 'error') {
      lines.push(`  ❌ Errors: ${evts.map(e => e.data.message?.substring(0, 50)).join(', ')}`);
    } else {
      lines.push(`  📋 ${type}: ${evts.length}`);
    }
  }

  return lines.join('\n');
}

// ========== Event Types ==========
const EventType = {
  DOM_CHANGE: 'dom_change',
  NETWORK_REQUEST: 'network_request',
  NETWORK_RESPONSE: 'network_response',
  CONSOLE: 'console',
  PAGE_LOAD: 'page_load',
  NAVIGATION: 'navigation',
  DIALOG: 'dialog',
  ERROR: 'error',
};

// ========== Streaming MCP Server ==========
class PlaywrightStreamingMCP {
  constructor() {
    this.server = new Server(
      { name: 'playwright-streaming', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    // Browser state
    this.browser = null;
    this.context = null;
    this.page = null;
    this.cdpSession = null;

    // Event streaming
    this.eventBuffer = [];
    this.eventListeners = new Map();
    this.isStreaming = false;
    this.lastEventId = 0;

    this.setupHandlers();
  }

  // ========== Event Buffer Management ==========

  pushEvent(type, data) {
    const event = {
      id: ++this.lastEventId,
      type,
      data,
      timestamp: Date.now(),
      time: new Date().toISOString(),
    };

    this.eventBuffer.push(event);

    // Keep buffer size manageable
    if (this.eventBuffer.length > CONFIG.eventBufferSize) {
      this.eventBuffer.shift();
    }

    // Log for debugging
    if (type !== EventType.NETWORK_REQUEST) {
      console.error(`[Event] ${type}:`, JSON.stringify(data).substring(0, 100));
    }

    return event;
  }

  getEventsSince(lastId = 0) {
    return this.eventBuffer.filter(e => e.id > lastId);
  }

  clearEvents() {
    this.eventBuffer = [];
    this.lastEventId = 0;
  }

  // ========== Browser Lifecycle ==========

  async ensureBrowser() {
    if (this.browser && this.page) {
      return { browser: this.browser, page: this.page };
    }

    // Persistent profile directory for MercadoPago session
    const userDataDir = '/home/edu/.mercadopago-browser-profile';

    console.error('[MCP] Launching PERSISTENT browser for MercadoPago...');
    console.error(`[MCP] Session data saved in: ${userDataDir}`);

    // Use launchPersistentContext to save cookies, localStorage, session
    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      viewport: CONFIG.viewport,
      args: ['--start-maximized'],
    });

    // In persistent context, the context IS the browser
    this.browser = this.context;

    // Get existing page or create new one
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    // Setup event listeners
    await this.setupPageListeners();
    await this.setupCDPListeners();

    this.pushEvent(EventType.PAGE_LOAD, { status: 'browser_ready' });

    return { browser: this.browser, page: this.page };
  }

  async setupPageListeners() {
    // Console messages
    this.page.on('console', msg => {
      this.pushEvent(EventType.CONSOLE, {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
      });
    });

    // Page errors
    this.page.on('pageerror', error => {
      this.pushEvent(EventType.ERROR, {
        message: error.message,
        stack: error.stack,
      });
    });

    // Navigation
    this.page.on('framenavigated', frame => {
      if (frame === this.page.mainFrame()) {
        this.pushEvent(EventType.NAVIGATION, {
          url: frame.url(),
          name: frame.name(),
        });
      }
    });

    // Dialogs
    this.page.on('dialog', dialog => {
      this.pushEvent(EventType.DIALOG, {
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue(),
      });
    });

    // Network requests
    this.page.on('request', request => {
      this.pushEvent(EventType.NETWORK_REQUEST, {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    // Network responses
    this.page.on('response', response => {
      this.pushEvent(EventType.NETWORK_RESPONSE, {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    });
  }

  async setupCDPListeners() {
    // Get CDP session for low-level DOM events
    this.cdpSession = await this.page.context().newCDPSession(this.page);

    // Enable DOM tracking
    await this.cdpSession.send('DOM.enable');
    await this.cdpSession.send('CSS.enable');

    // DOM mutations
    this.cdpSession.on('DOM.documentUpdated', () => {
      this.pushEvent(EventType.DOM_CHANGE, { type: 'document_updated' });
    });

    this.cdpSession.on('DOM.childNodeInserted', params => {
      this.pushEvent(EventType.DOM_CHANGE, {
        type: 'node_inserted',
        parentNodeId: params.parentNodeId,
        nodeId: params.node?.nodeId,
        nodeName: params.node?.nodeName,
      });
    });

    this.cdpSession.on('DOM.childNodeRemoved', params => {
      this.pushEvent(EventType.DOM_CHANGE, {
        type: 'node_removed',
        parentNodeId: params.parentNodeId,
        nodeId: params.nodeId,
      });
    });

    this.cdpSession.on('DOM.attributeModified', params => {
      this.pushEvent(EventType.DOM_CHANGE, {
        type: 'attribute_modified',
        nodeId: params.nodeId,
        name: params.name,
        value: params.value?.substring(0, 50),
      });
    });

    console.error('[MCP] CDP listeners attached');
  }

  async closeBrowser() {
    if (this.cdpSession) {
      await this.cdpSession.detach().catch(() => {});
      this.cdpSession = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    this.clearEvents();
  }

  // ========== MCP Handlers ==========

  setupHandlers() {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'stream_navigate',
          description: 'Navigate to URL with real-time event streaming',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to' }
            },
            required: ['url']
          }
        },
        {
          name: 'stream_click',
          description: 'Click element with real-time feedback',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' }
            },
            required: ['selector']
          }
        },
        {
          name: 'stream_type',
          description: 'Type text with real-time feedback',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              text: { type: 'string', description: 'Text to type' }
            },
            required: ['selector', 'text']
          }
        },
        {
          name: 'stream_get_events',
          description: 'Get all events since last check (DOM changes, network, console)',
          inputSchema: {
            type: 'object',
            properties: {
              since_id: { type: 'number', description: 'Get events after this ID (0 for all)' },
              types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by event types: dom_change, network_request, network_response, console, navigation, dialog, error'
              }
            }
          }
        },
        {
          name: 'stream_snapshot',
          description: 'Get current page state + recent events',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stream_screenshot',
          description: 'Take screenshot - saves to temp file and returns path (compact output)',
          inputSchema: {
            type: 'object',
            properties: {
              fullPage: { type: 'boolean', description: 'Capture full page (default: false)' },
              compress: { type: 'boolean', description: 'Compress to JPEG ~10x smaller (default: true)' }
            }
          }
        },
        {
          name: 'stream_evaluate',
          description: 'Execute JavaScript in page context',
          inputSchema: {
            type: 'object',
            properties: {
              script: { type: 'string', description: 'JavaScript to execute' }
            },
            required: ['script']
          }
        },
        {
          name: 'stream_wait_for',
          description: 'Wait for selector or condition',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to wait for' },
              timeout: { type: 'number', description: 'Timeout in ms (default: 10000)' }
            },
            required: ['selector']
          }
        },
        {
          name: 'stream_close',
          description: 'Close browser and clear event buffer',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stream_status',
          description: 'Get streaming status and browser state',
          inputSchema: {
            type: 'object',
            properties: {}
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
          case 'stream_status': {
            result = {
              browserOpen: !!this.browser,
              pageUrl: this.page?.url() || null,
              eventsInBuffer: this.eventBuffer.length,
              lastEventId: this.lastEventId,
              config: CONFIG,
            };
            break;
          }

          case 'stream_navigate': {
            const { page } = await this.ensureBrowser();
            const eventsBefore = this.lastEventId;

            await page.goto(args.url, { waitUntil: 'domcontentloaded' });

            result = {
              url: page.url(),
              title: await page.title(),
              eventsTriggered: this.lastEventId - eventsBefore,
              recentEvents: this.getEventsSince(eventsBefore).slice(-5),
            };
            break;
          }

          case 'stream_click': {
            const { page } = await this.ensureBrowser();
            const eventsBefore = this.lastEventId;

            await page.click(args.selector);
            await page.waitForTimeout(100); // Let events settle

            result = {
              clicked: args.selector,
              eventsTriggered: this.lastEventId - eventsBefore,
              recentEvents: this.getEventsSince(eventsBefore).slice(-5),
            };
            break;
          }

          case 'stream_type': {
            const { page } = await this.ensureBrowser();
            const eventsBefore = this.lastEventId;

            await page.fill(args.selector, args.text);

            result = {
              typed: args.text,
              selector: args.selector,
              eventsTriggered: this.lastEventId - eventsBefore,
            };
            break;
          }

          case 'stream_get_events': {
            let events = this.getEventsSince(args?.since_id || 0);

            // Filter by types if specified
            if (args?.types?.length > 0) {
              events = events.filter(e => args.types.includes(e.type));
            }

            result = {
              events,
              count: events.length,
              lastEventId: this.lastEventId,
              bufferSize: this.eventBuffer.length,
            };
            break;
          }

          case 'stream_snapshot': {
            const { page } = await this.ensureBrowser();

            // Get accessibility snapshot (like standard Playwright MCP)
            const snapshot = await page.accessibility.snapshot();

            result = {
              url: page.url(),
              title: await page.title(),
              snapshot: snapshot,
              recentEvents: this.eventBuffer.slice(-10),
              lastEventId: this.lastEventId,
            };
            break;
          }

          case 'stream_screenshot': {
            const { page } = await this.ensureBrowser();
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');
            const { execSync } = await import('child_process');

            const shouldCompress = args?.compress !== false; // Default true
            const timestamp = Date.now();

            // Take screenshot as PNG first
            const buffer = await page.screenshot({
              fullPage: args?.fullPage || false,
              type: 'png'
            });

            const originalSizeKB = Math.round(buffer.length / 1024);
            let filepath;
            let finalSizeKB = originalSizeKB;

            if (shouldCompress) {
              // Save PNG temporarily
              const tempPng = path.join(os.tmpdir(), `screenshot-${timestamp}-temp.png`);
              fs.writeFileSync(tempPng, buffer);

              // Run Python compression script
              const scriptPath = path.join(import.meta.dirname, 'compress-screenshot.py');
              const outputJpg = path.join(os.tmpdir(), `screenshot-${timestamp}.jpg`);

              try {
                // Compress PNG to JPEG using Python script
                execSync(`python3 "${scriptPath}" --input "${tempPng}" --output "${outputJpg}" --quality 35 --max-width 1024`, {
                  timeout: 5000
                });

                filepath = outputJpg;
                const stats = fs.statSync(outputJpg);
                finalSizeKB = Math.round(stats.size / 1024);

                // Clean up temp PNG
                fs.unlinkSync(tempPng);
              } catch (compressError) {
                // Fallback to PNG if compression fails
                console.error('[MCP] Compression failed, using PNG:', compressError.message);
                filepath = path.join(os.tmpdir(), `screenshot-${timestamp}.png`);
                fs.renameSync(tempPng, filepath);
              }
            } else {
              // Save as PNG without compression
              filepath = path.join(os.tmpdir(), `screenshot-${timestamp}.png`);
              fs.writeFileSync(filepath, buffer);
            }

            const elapsed = Date.now() - startTime;
            const compressionRatio = originalSizeKB / finalSizeKB;

            // Return only path, not the image data
            return {
              content: [{
                type: 'text',
                text: `📸 Screenshot saved (${finalSizeKB}KB${shouldCompress ? ` ← ${originalSizeKB}KB, ${compressionRatio.toFixed(1)}x` : ''})\n📁 Path: ${filepath}\n⏱️ ${elapsed}ms`
              }]
            };
          }

          case 'stream_evaluate': {
            const { page } = await this.ensureBrowser();
            const evalResult = await page.evaluate(args.script);

            result = {
              result: evalResult,
            };
            break;
          }

          case 'stream_wait_for': {
            const { page } = await this.ensureBrowser();
            const eventsBefore = this.lastEventId;

            await page.waitForSelector(args.selector, {
              timeout: args.timeout || 10000
            });

            result = {
              found: true,
              selector: args.selector,
              eventsTriggered: this.lastEventId - eventsBefore,
              recentEvents: this.getEventsSince(eventsBefore).slice(-3),
            };
            break;
          }

          case 'stream_close': {
            await this.closeBrowser();
            result = { closed: true, eventsCleared: true };
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const elapsed = Date.now() - startTime;

        // Determine the format type based on tool name
        const formatType = name.replace('stream_', '');

        return {
          content: [{
            type: 'text',
            text: formatCompact(result, formatType) + `\n⏱️ ${elapsed}ms`
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: formatCompact({ error: error.message, tool: name }, 'error')
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
    console.error('[MCP] Playwright Streaming Server v1.0 started');
    console.error('[MCP] Features: CDP events, DOM mutations, network tracking');
  }
}

// ========== Main ==========

const mcp = new PlaywrightStreamingMCP();
mcp.start().catch(error => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('[MCP] Shutting down...');
  await mcp.closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[MCP] Shutting down...');
  await mcp.closeBrowser();
  process.exit(0);
});
