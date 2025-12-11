#!/usr/bin/env node
/**
 * Patchright Streaming MCP Server v1.0
 *
 * Uses PATCHRIGHT instead of Playwright to bypass CDP detection
 * that triggers anti-bot verification (like MercadoPago QR).
 *
 * Key differences from playwright-streaming:
 * - Uses patchright (patched chromium without CDP leaks)
 * - Uses persistent context (preserves sessions/cookies)
 * - NO CDP session (that's what triggers detection!)
 * - Tracks events via page listeners only
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'patchright';
import fs from 'fs';

// ========== Helper ==========
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ========== MercadoPago Transfer ==========
async function mpTransfer(page, alias, amount, expectedName) {
  const log = (msg) => console.error(`[MP] ${msg}`);

  try {
    // 1. Home
    await page.goto('https://www.mercadopago.com.ar/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);
    log('Home loaded');

    // 2. Click Transferir
    await page.waitForSelector('text=Transferir', { timeout: 15000 });
    await page.click('text=Transferir');
    await sleep(2000);
    log('Clicked Transferir');

    // 3. Click CBU/CVU/alias
    await page.waitForSelector('text=Con CBU, CVU o alias', { timeout: 10000 });
    await page.click('text=Con CBU, CVU o alias');
    await sleep(1500);
    log('Selected CBU/CVU/alias');

    // 4. Enter alias
    await page.waitForSelector('input', { timeout: 10000 });
    await page.fill('input', alias);
    await sleep(500);
    await page.click('text=Continuar');
    log(`Entered: ${alias}`);

    // 5. Confirm account
    await page.waitForSelector('text=Confirmar cuenta', { timeout: 15000 });
    await sleep(500);

    // 5.1 Validate recipient name
    const recipientName = await page.evaluate(() => {
      const lines = document.body.innerText.split('\\n').map(l => l.trim()).filter(l => l);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('nombre y apellido') && i + 1 < lines.length) return lines[i + 1];
      }
      return '';
    });
    log(`Recipient: ${recipientName}`);

    if (expectedName) {
      const normalize = (s) => s.toUpperCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').split(/\\s+/).sort().join(' ');
      const exp = normalize(expectedName).split(' ');
      const act = normalize(recipientName);
      const match = exp.filter(w => act.includes(w)).length;
      const sim = Math.round((match / exp.length) * 100);
      if (sim < 60) return { success: false, error: `Name mismatch: "${expectedName}" vs "${recipientName}" (${sim}%)` };
      log(`Name OK (${sim}%)`);
    }

    await page.click('text=Confirmar cuenta');
    log('Confirmed');

    // 6. Amount input
    await sleep(2000);
    await page.waitForSelector('#amount-field-input', { timeout: 10000 });

    // 7. Type amount
    const amtStr = amount.toFixed(2).replace('.', ',');
    await page.click('#amount-field-input', { clickCount: 3 });
    await sleep(300);
    await page.keyboard.press('Backspace');
    await sleep(200);
    for (const c of amtStr) { await page.keyboard.press(c); await sleep(100); }
    await sleep(500);
    log(`Amount: ${amtStr}`);

    // 8. Wait for Continuar
    for (let i = 0; i < 20; i++) {
      const dis = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Continuar'));
        return btn?.disabled ?? true;
      });
      if (!dis) break;
      await sleep(500);
    }
    await page.click('text=Continuar');
    await page.waitForSelector('text=Revisá si está todo bien', { timeout: 15000 });
    log('Review page');

    // 9. Final click
    await sleep(500);
    const btn = await page.$('button:has-text("Transferir"):not(:has-text("Volver"))');
    if (btn) {
      const box = await btn.boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      // Fallback: Use specific XPath if generic button not found
      try {
        await page.click('xpath=/html/body/div[2]/main/section/div/div/div[3]/button[2]/span');
      } catch (e) {
        log('Final Transferir button not found (generic or xpath)');
      }
    }
    log('Clicked Transferir');
    await sleep(4000);

    // 10. Result
    if (await page.$('text=Escaneá el QR')) return { success: false, qrRequired: true };
    if (await page.$('text=Le transferiste')) return { success: true };
    return { success: false, error: 'Unknown state' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ========== Configuration ==========
const CONFIG = {
  headless: process.env.HEADLESS === 'true', // Default to false (visible) unless HEADLESS=true
  profilePath: process.env.BROWSER_PROFILE || '/home/edu/.mercadopago-browser-profile',
  executablePath: undefined, // Use bundled Chromium (most stable)
  eventBufferSize: 100,
  compactOutput: true,
  maxEventSummary: 5,
};

// Force DISPLAY for GUI apps if missing (assumes local user session)
if (!process.env.DISPLAY) {
  process.env.DISPLAY = ':0';
  console.error('[MCP] DISPLAY environment variable not set. Defaulting to :0 to support visible browser.');
}

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
      return `📸 Screenshot captured\n📁 Path: ${data.path}`;

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
  const MAX = 15;
  if (!snapshot || state.count >= MAX) return '';

  const lines = [];
  const role = snapshot.role || '';
  const name = (snapshot.name || '').trim();

  if (name && ['button', 'link', 'textbox', 'heading'].includes(role) && state.count < MAX) {
    const short = name.length > 30 ? name.substring(0, 30) + '…' : name;
    const icon = role === 'heading' ? '📌' : role === 'button' ? '🔘' : role === 'link' ? '🔗' : '📝';
    lines.push(`${icon} ${short}`);
    state.count++;
  }

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
      lines.push(`  📡 ${type}: ${evts.length} requests`);
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
  NETWORK_REQUEST: 'network_request',
  NETWORK_RESPONSE: 'network_response',
  CONSOLE: 'console',
  PAGE_LOAD: 'page_load',
  NAVIGATION: 'navigation',
  DIALOG: 'dialog',
  ERROR: 'error',
};

// ========== Patchright MCP Server ==========
class PatchrightStreamingMCP {
  constructor() {
    this.server = new Server(
      { name: 'patchright-streaming', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    // Browser state
    this.context = null;  // Persistent context (browser + context combined)
    this.page = null;

    // Event streaming (NO CDP - just page events)
    this.eventBuffer = [];
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

    if (this.eventBuffer.length > CONFIG.eventBufferSize) {
      this.eventBuffer.shift();
    }

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
    if (this.context && this.page) {
      // Check if page is still valid
      try {
        await this.page.title();
        return { context: this.context, page: this.page };
      } catch {
        // Page closed, need to reopen
        this.page = null;
      }
    }

    console.error('[MCP] Launching PATCHRIGHT browser with persistent profile...');
    console.error(`[MCP] Profile: ${CONFIG.profilePath}`);

    // Patchright with persistent context (maintains session!)
    this.context = await chromium.launchPersistentContext(
      CONFIG.profilePath,
      {
        headless: CONFIG.headless,
        executablePath: CONFIG.executablePath,
        viewport: null,  // Natural viewport
        // NO custom userAgent or headers (patchright recommendation)
      }
    );

    // Get existing page or create new one
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    // Setup event listeners (NO CDP!)
    await this.setupPageListeners();

    this.pushEvent(EventType.PAGE_LOAD, { status: 'patchright_ready', profile: CONFIG.profilePath });

    return { context: this.context, page: this.page };
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

    console.error('[MCP] Page listeners attached (no CDP - stealth mode)');
  }

  async closeBrowser() {
    if (this.context) {
      await this.context.close().catch(() => { });
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
                description: 'Filter by event types: network_request, network_response, console, navigation, dialog, error'
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
        },
        {
          name: 'mp_transfer',
          description: 'Execute MercadoPago transfer (full flow: navigate, enter alias, amount, confirm)',
          inputSchema: {
            type: 'object',
            properties: {
              alias: { type: 'string', description: 'Destination alias/CVU/CBU' },
              amount: { type: 'number', description: 'Amount in ARS (e.g., 20.98)' },
              expected_name: { type: 'string', description: 'Expected recipient name for validation (optional)' }
            },
            required: ['alias', 'amount']
          }
        },
        // === Advanced Tools ===
        {
          name: 'stream_keyboard',
          description: 'Send keyboard input (press keys, type text, shortcuts)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['press', 'type', 'down', 'up'], description: 'Keyboard action' },
              key: { type: 'string', description: 'Key to press (e.g., Enter, Tab, ArrowDown, Control+c)' },
              text: { type: 'string', description: 'Text to type (for action=type)' },
              delay: { type: 'number', description: 'Delay between keystrokes in ms (default: 50)' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_mouse',
          description: 'Mouse operations (move, click at coordinates, drag)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['click', 'dblclick', 'move', 'down', 'up', 'wheel'], description: 'Mouse action' },
              x: { type: 'number', description: 'X coordinate' },
              y: { type: 'number', description: 'Y coordinate' },
              button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Mouse button (default: left)' },
              deltaX: { type: 'number', description: 'Horizontal scroll amount (for wheel)' },
              deltaY: { type: 'number', description: 'Vertical scroll amount (for wheel)' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_hover',
          description: 'Hover over an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to hover' }
            },
            required: ['selector']
          }
        },
        {
          name: 'stream_select',
          description: 'Select option(s) from a dropdown',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for select element' },
              values: { type: 'array', items: { type: 'string' }, description: 'Values to select' }
            },
            required: ['selector', 'values']
          }
        },
        {
          name: 'stream_scroll',
          description: 'Scroll the page or element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'Element to scroll (optional, scrolls page if not provided)' },
              direction: { type: 'string', enum: ['up', 'down', 'left', 'right', 'top', 'bottom'], description: 'Scroll direction' },
              amount: { type: 'number', description: 'Pixels to scroll (default: 500)' }
            },
            required: ['direction']
          }
        },
        {
          name: 'stream_fill',
          description: 'Clear and fill input field (better for React controlled inputs)',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              text: { type: 'string', description: 'Text to fill' }
            },
            required: ['selector', 'text']
          }
        },
        {
          name: 'stream_check',
          description: 'Check/uncheck checkbox or radio button',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              checked: { type: 'boolean', description: 'True to check, false to uncheck (default: true)' }
            },
            required: ['selector']
          }
        },
        {
          name: 'stream_upload',
          description: 'Upload file(s) to file input',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for file input' },
              files: { type: 'array', items: { type: 'string' }, description: 'File paths to upload' }
            },
            required: ['selector', 'files']
          }
        },
        {
          name: 'stream_pdf',
          description: 'Generate PDF of current page',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Output path (default: /tmp/page-{timestamp}.pdf)' },
              format: { type: 'string', description: 'Paper format: A4, Letter, etc (default: A4)' }
            }
          }
        },
        {
          name: 'stream_cookies',
          description: 'Get or set cookies',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['get', 'set', 'clear'], description: 'Cookie action' },
              cookies: { type: 'array', description: 'Cookies to set (for action=set)' },
              urls: { type: 'array', items: { type: 'string' }, description: 'URLs to get/clear cookies for' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_storage',
          description: 'Get or set localStorage/sessionStorage',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['local', 'session'], description: 'Storage type (default: local)' },
              action: { type: 'string', enum: ['get', 'set', 'remove', 'clear'], description: 'Storage action' },
              key: { type: 'string', description: 'Storage key' },
              value: { type: 'string', description: 'Value to set' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_dialog',
          description: 'Handle dialogs (alert, confirm, prompt)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['accept', 'dismiss'], description: 'Dialog action' },
              promptText: { type: 'string', description: 'Text to enter in prompt dialog' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_frame',
          description: 'Switch to iframe by selector or index',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'Frame selector or name' },
              index: { type: 'number', description: 'Frame index (if no selector)' }
            }
          }
        },
        {
          name: 'stream_network',
          description: 'Control network (block URLs, set offline mode, throttle)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['block', 'unblock', 'offline', 'online'], description: 'Network action' },
              patterns: { type: 'array', items: { type: 'string' }, description: 'URL patterns to block' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_emulate',
          description: 'Emulate device or change viewport',
          inputSchema: {
            type: 'object',
            properties: {
              device: { type: 'string', description: 'Device name (iPhone 12, Pixel 5, etc)' },
              viewport: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' } }, description: 'Custom viewport' },
              userAgent: { type: 'string', description: 'Custom user agent' },
              locale: { type: 'string', description: 'Locale (e.g., es-AR)' },
              timezone: { type: 'string', description: 'Timezone (e.g., America/Buenos_Aires)' },
              geolocation: { type: 'object', properties: { latitude: { type: 'number' }, longitude: { type: 'number' } }, description: 'Geolocation' }
            }
          }
        },
        // === Extra Power Tools ===
        {
          name: 'stream_init_script',
          description: 'Inject JavaScript that runs BEFORE page loads (anti-detection, helpers)',
          inputSchema: {
            type: 'object',
            properties: {
              script: { type: 'string', description: 'JavaScript code to inject' },
              path: { type: 'string', description: 'Path to JS file to inject (alternative to script)' }
            }
          }
        },
        {
          name: 'stream_route',
          description: 'Intercept/modify/block network requests (ads, tracking, mock APIs)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['block', 'modify', 'mock', 'log', 'clear'], description: 'Route action' },
              pattern: { type: 'string', description: 'URL pattern to match (glob or regex)' },
              response: { type: 'object', description: 'Mock response: {status, body, headers}' },
              headers: { type: 'object', description: 'Headers to add/modify on requests' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_popup_handler',
          description: 'Auto-handle popups/overlays that appear (close cookie banners, modals)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'remove', 'clear'], description: 'Handler action' },
              selector: { type: 'string', description: 'Selector for popup/overlay element' },
              clickSelector: { type: 'string', description: 'Selector for close button (default: clicks the element)' }
            },
            required: ['action']
          }
        },
        {
          name: 'stream_drag_drop',
          description: 'Drag and drop elements (sliders, kanban, file drops)',
          inputSchema: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source element selector' },
              target: { type: 'string', description: 'Target element selector or coordinates' },
              targetX: { type: 'number', description: 'Target X coordinate (if no target selector)' },
              targetY: { type: 'number', description: 'Target Y coordinate (if no target selector)' }
            },
            required: ['source']
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
              browserOpen: !!this.context,
              pageUrl: this.page?.url() || null,
              eventsInBuffer: this.eventBuffer.length,
              lastEventId: this.lastEventId,
              profile: CONFIG.profilePath,
              engine: 'patchright (CDP bypass)',
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
            await page.waitForTimeout(100);

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

            const timestamp = Date.now();
            const shouldCompress = args?.compress !== false;

            const buffer = await page.screenshot({
              fullPage: args?.fullPage || false,
              type: shouldCompress ? 'jpeg' : 'png',
              quality: shouldCompress ? 50 : undefined,
            });

            const ext = shouldCompress ? 'jpg' : 'png';
            const filepath = path.join(os.tmpdir(), `screenshot-${timestamp}.${ext}`);
            fs.writeFileSync(filepath, buffer);

            const sizeKB = Math.round(buffer.length / 1024);
            const elapsed = Date.now() - startTime;

            return {
              content: [{
                type: 'text',
                text: `📸 Screenshot saved (${sizeKB}KB)\n📁 Path: ${filepath}\n⏱️ ${elapsed}ms`
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

          case 'mp_transfer': {
            const { page } = await this.ensureBrowser();
            const transferResult = await mpTransfer(page, args.alias, args.amount, args.expected_name);

            const elapsed = Date.now() - startTime;
            let statusText;
            if (transferResult.success) {
              statusText = `✅ Transfer successful!\n💸 $${args.amount} -> ${args.alias}`;
            } else if (transferResult.qrRequired) {
              statusText = `⚠️ QR verification required\n📱 Scan with MercadoPago app`;
            } else {
              statusText = `❌ Transfer failed: ${transferResult.error}`;
            }

            return {
              content: [{
                type: 'text',
                text: `${statusText}\n⏱️ ${elapsed}ms`
              }]
            };
          }

          // ========== Advanced Tool Handlers ==========

          case 'stream_keyboard': {
            const { page } = await this.ensureBrowser();
            const delay = args.delay || 50;

            switch (args.action) {
              case 'press':
                await page.keyboard.press(args.key);
                break;
              case 'type':
                await page.keyboard.type(args.text || '', { delay });
                break;
              case 'down':
                await page.keyboard.down(args.key);
                break;
              case 'up':
                await page.keyboard.up(args.key);
                break;
            }
            result = { action: args.action, key: args.key, text: args.text };
            break;
          }

          case 'stream_mouse': {
            const { page } = await this.ensureBrowser();
            const btn = args.button || 'left';

            switch (args.action) {
              case 'click':
                await page.mouse.click(args.x, args.y, { button: btn });
                break;
              case 'dblclick':
                await page.mouse.dblclick(args.x, args.y, { button: btn });
                break;
              case 'move':
                await page.mouse.move(args.x, args.y);
                break;
              case 'down':
                await page.mouse.down({ button: btn });
                break;
              case 'up':
                await page.mouse.up({ button: btn });
                break;
              case 'wheel':
                await page.mouse.wheel(args.deltaX || 0, args.deltaY || 0);
                break;
            }
            result = { action: args.action, x: args.x, y: args.y };
            break;
          }

          case 'stream_hover': {
            const { page } = await this.ensureBrowser();
            await page.hover(args.selector);
            result = { hovered: args.selector };
            break;
          }

          case 'stream_select': {
            const { page } = await this.ensureBrowser();
            const selected = await page.selectOption(args.selector, args.values);
            result = { selector: args.selector, selected };
            break;
          }

          case 'stream_scroll': {
            const { page } = await this.ensureBrowser();
            const amt = args.amount || 500;

            if (args.selector) {
              await page.locator(args.selector).scrollIntoViewIfNeeded();
            } else {
              const scrollMap = {
                up: [0, -amt], down: [0, amt], left: [-amt, 0], right: [amt, 0],
                top: 'window.scrollTo(0, 0)',
                bottom: 'window.scrollTo(0, document.body.scrollHeight)'
              };
              const scroll = scrollMap[args.direction];
              if (typeof scroll === 'string') {
                await page.evaluate(scroll);
              } else {
                await page.mouse.wheel(scroll[0], scroll[1]);
              }
            }
            result = { direction: args.direction, amount: amt };
            break;
          }

          case 'stream_fill': {
            const { page } = await this.ensureBrowser();
            await page.fill(args.selector, args.text);
            result = { filled: args.selector, text: args.text };
            break;
          }

          case 'stream_check': {
            const { page } = await this.ensureBrowser();
            if (args.checked === false) {
              await page.uncheck(args.selector);
            } else {
              await page.check(args.selector);
            }
            result = { selector: args.selector, checked: args.checked !== false };
            break;
          }

          case 'stream_upload': {
            const { page } = await this.ensureBrowser();
            await page.setInputFiles(args.selector, args.files);
            result = { selector: args.selector, files: args.files };
            break;
          }

          case 'stream_pdf': {
            const { page } = await this.ensureBrowser();
            const path = await import('path');
            const os = await import('os');

            const pdfPath = args.path || path.join(os.tmpdir(), `page-${Date.now()}.pdf`);
            await page.pdf({ path: pdfPath, format: args.format || 'A4' });
            result = { path: pdfPath };
            break;
          }

          case 'stream_cookies': {
            const { context } = await this.ensureBrowser();

            switch (args.action) {
              case 'get':
                result = { cookies: await context.cookies(args.urls) };
                break;
              case 'set':
                await context.addCookies(args.cookies);
                result = { set: args.cookies.length };
                break;
              case 'clear':
                await context.clearCookies();
                result = { cleared: true };
                break;
            }
            break;
          }

          case 'stream_storage': {
            const { page } = await this.ensureBrowser();
            const storageType = args.type === 'session' ? 'sessionStorage' : 'localStorage';

            switch (args.action) {
              case 'get':
                if (args.key) {
                  result = { value: await page.evaluate(([t, k]) => window[t].getItem(k), [storageType, args.key]) };
                } else {
                  result = { storage: await page.evaluate(t => ({ ...window[t] }), storageType) };
                }
                break;
              case 'set':
                await page.evaluate(([t, k, v]) => window[t].setItem(k, v), [storageType, args.key, args.value]);
                result = { set: args.key };
                break;
              case 'remove':
                await page.evaluate(([t, k]) => window[t].removeItem(k), [storageType, args.key]);
                result = { removed: args.key };
                break;
              case 'clear':
                await page.evaluate(t => window[t].clear(), storageType);
                result = { cleared: storageType };
                break;
            }
            break;
          }

          case 'stream_dialog': {
            this.dialogHandler = args.action === 'accept'
              ? (dialog) => dialog.accept(args.promptText)
              : (dialog) => dialog.dismiss();
            const { page } = await this.ensureBrowser();
            page.once('dialog', this.dialogHandler);
            result = { dialogHandler: args.action };
            break;
          }

          case 'stream_frame': {
            const { page } = await this.ensureBrowser();
            let frame;
            if (args.selector) {
              frame = page.frameLocator(args.selector);
            } else if (args.index !== undefined) {
              frame = page.frames()[args.index];
            }
            this.currentFrame = frame;
            result = { frame: args.selector || `index:${args.index}` };
            break;
          }

          case 'stream_network': {
            const { context } = await this.ensureBrowser();

            switch (args.action) {
              case 'block':
                this.blockedPatterns = args.patterns || [];
                await context.route(url => this.blockedPatterns.some(p => url.toString().includes(p)), route => route.abort());
                result = { blocked: this.blockedPatterns };
                break;
              case 'unblock':
                await context.unroute(() => true);
                this.blockedPatterns = [];
                result = { unblocked: true };
                break;
              case 'offline':
                await context.setOffline(true);
                result = { offline: true };
                break;
              case 'online':
                await context.setOffline(false);
                result = { online: true };
                break;
            }
            break;
          }

          case 'stream_emulate': {
            const { page } = await this.ensureBrowser();

            if (args.viewport) {
              await page.setViewportSize(args.viewport);
            }
            if (args.geolocation) {
              await page.context().setGeolocation(args.geolocation);
            }
            if (args.locale || args.timezone) {
              // Note: locale/timezone typically set at context creation
              result = { note: 'locale/timezone require browser restart' };
            }
            result = { emulated: { viewport: args.viewport, geolocation: args.geolocation } };
            break;
          }

          // ========== Extra Power Tools ==========

          case 'stream_init_script': {
            const { context } = await this.ensureBrowser();
            const fs = await import('fs');

            if (args.path) {
              const scriptContent = fs.readFileSync(args.path, 'utf-8');
              await context.addInitScript(scriptContent);
              result = { injected: args.path };
            } else if (args.script) {
              await context.addInitScript(args.script);
              result = { injected: 'inline script', length: args.script.length };
            } else {
              // Default: inject common anti-detection
              await context.addInitScript(() => {
                // Override webdriver
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                // Override plugins
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                // Override languages
                Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es', 'en'] });
              });
              result = { injected: 'default anti-detection' };
            }
            break;
          }

          case 'stream_route': {
            const { context, page } = await this.ensureBrowser();

            // Initialize routes storage
            if (!this.routes) this.routes = [];

            switch (args.action) {
              case 'block':
                await context.route(args.pattern || '**/*', async (route) => {
                  const url = route.request().url();
                  if (!args.pattern || url.includes(args.pattern) || url.match(new RegExp(args.pattern))) {
                    await route.abort();
                  } else {
                    await route.continue();
                  }
                });
                this.routes.push({ pattern: args.pattern, action: 'block' });
                result = { blocked: args.pattern };
                break;

              case 'modify':
                await context.route(args.pattern || '**/*', async (route) => {
                  const headers = { ...route.request().headers(), ...args.headers };
                  await route.continue({ headers });
                });
                this.routes.push({ pattern: args.pattern, action: 'modify' });
                result = { modified: args.pattern, headers: args.headers };
                break;

              case 'mock':
                await context.route(args.pattern, async (route) => {
                  await route.fulfill({
                    status: args.response?.status || 200,
                    body: typeof args.response?.body === 'string' ? args.response.body : JSON.stringify(args.response?.body || {}),
                    headers: args.response?.headers || { 'Content-Type': 'application/json' }
                  });
                });
                this.routes.push({ pattern: args.pattern, action: 'mock' });
                result = { mocked: args.pattern };
                break;

              case 'log':
                page.on('request', req => console.error(`[REQ] ${req.method()} ${req.url()}`));
                page.on('response', res => console.error(`[RES] ${res.status()} ${res.url()}`));
                result = { logging: true };
                break;

              case 'clear':
                await context.unroute('**/*');
                this.routes = [];
                result = { cleared: true };
                break;
            }
            break;
          }

          case 'stream_popup_handler': {
            const { page } = await this.ensureBrowser();

            // Initialize handlers storage
            if (!this.popupHandlers) this.popupHandlers = [];

            switch (args.action) {
              case 'add':
                const handler = async () => {
                  try {
                    const clickTarget = args.clickSelector || args.selector;
                    await page.click(clickTarget, { timeout: 1000 });
                    console.error(`[Popup] Closed: ${clickTarget}`);
                  } catch { /* Element not found, ignore */ }
                };

                // Use addLocatorHandler for automatic handling
                await page.addLocatorHandler(
                  page.locator(args.selector),
                  async () => {
                    const clickTarget = args.clickSelector || args.selector;
                    await page.locator(clickTarget).click();
                  }
                );
                this.popupHandlers.push({ selector: args.selector, clickSelector: args.clickSelector });
                result = { added: args.selector };
                break;

              case 'remove':
                await page.removeLocatorHandler(page.locator(args.selector));
                this.popupHandlers = this.popupHandlers.filter(h => h.selector !== args.selector);
                result = { removed: args.selector };
                break;

              case 'clear':
                for (const h of this.popupHandlers) {
                  try {
                    await page.removeLocatorHandler(page.locator(h.selector));
                  } catch { /* ignore */ }
                }
                this.popupHandlers = [];
                result = { cleared: true };
                break;
            }
            break;
          }

          case 'stream_drag_drop': {
            const { page } = await this.ensureBrowser();

            if (args.target) {
              // Drag to element
              await page.dragAndDrop(args.source, args.target);
              result = { dragged: args.source, to: args.target };
            } else if (args.targetX !== undefined && args.targetY !== undefined) {
              // Drag to coordinates
              const sourceEl = await page.locator(args.source);
              const box = await sourceEl.boundingBox();
              if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.mouse.down();
                await page.mouse.move(args.targetX, args.targetY, { steps: 10 });
                await page.mouse.up();
                result = { dragged: args.source, toCoords: { x: args.targetX, y: args.targetY } };
              }
            } else {
              throw new Error('Must provide target selector or targetX/targetY coordinates');
            }
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const elapsed = Date.now() - startTime;
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
    console.error('[MCP] Patchright Streaming Server v1.0 started');
    console.error('[MCP] Engine: PATCHRIGHT (CDP bypass for anti-bot)');
    console.error(`[MCP] Profile: ${CONFIG.profilePath}`);
  }
}

// ========== Main ==========

const mcp = new PatchrightStreamingMCP();
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
