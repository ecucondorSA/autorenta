#!/usr/bin/env bun
/**
 * Patchright MCP Server for Claude Code
 * Provides browser automation tools using Patchright (undetected Playwright)
 */
import { chromium, type BrowserContext, type Page } from 'patchright';

const PROFILE_DIR = '/home/edu/.patchright-profile';

let context: BrowserContext | null = null;
let page: Page | null = null;

async function ensureBrowser(): Promise<Page> {
  if (!context) {
    console.error('[MCP] Launching browser with persistent profile...');
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1280, height: 900 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    });
    page = context.pages()[0] || await context.newPage();
    console.error('[MCP] Browser ready');
  }
  return page!;
}

// MCP Protocol Handler
async function handleRequest(request: { method: string; params?: Record<string, unknown> }) {
  const { method, params } = request;

  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'patchright-mcp', version: '1.0.0' },
      };

    case 'tools/list':
      return {
        tools: [
          {
            name: 'browser_navigate',
            description: 'Navigate to a URL',
            inputSchema: {
              type: 'object',
              properties: { url: { type: 'string', description: 'URL to navigate to' } },
              required: ['url'],
            },
          },
          {
            name: 'browser_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'browser_click',
            description: 'Click on an element by selector or text',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS selector or text to click' },
              },
              required: ['selector'],
            },
          },
          {
            name: 'browser_type',
            description: 'Type text into an input field',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS selector of input' },
                text: { type: 'string', description: 'Text to type' },
              },
              required: ['selector', 'text'],
            },
          },
          {
            name: 'browser_get_text',
            description: 'Get visible text content of the page or an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'Optional CSS selector' },
              },
            },
          },
          {
            name: 'browser_close',
            description: 'Close the browser',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };

    case 'tools/call': {
      const toolName = params?.name as string;
      const args = (params?.arguments || {}) as Record<string, string>;

      try {
        const p = await ensureBrowser();

        switch (toolName) {
          case 'browser_navigate': {
            await p.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const title = await p.title();
            return { content: [{ type: 'text', text: `Navigated to: ${args.url}\nTitle: ${title}` }] };
          }

          case 'browser_screenshot': {
            const buffer = await p.screenshot({ type: 'png', fullPage: false });
            const base64 = buffer.toString('base64');
            return {
              content: [
                { type: 'image', data: base64, mimeType: 'image/png' },
                { type: 'text', text: `Screenshot taken. Page: ${await p.title()}` },
              ],
            };
          }

          case 'browser_click': {
            const selector = args.selector;
            // Try CSS selector first, then text
            try {
              await p.click(selector, { timeout: 5000 });
            } catch {
              await p.getByText(selector, { exact: false }).first().click({ timeout: 5000 });
            }
            await p.waitForTimeout(500);
            return { content: [{ type: 'text', text: `Clicked: ${selector}` }] };
          }

          case 'browser_type': {
            await p.fill(args.selector, args.text);
            return { content: [{ type: 'text', text: `Typed "${args.text}" into ${args.selector}` }] };
          }

          case 'browser_get_text': {
            let text: string;
            if (args.selector) {
              text = await p.locator(args.selector).innerText();
            } else {
              text = await p.locator('body').innerText();
            }
            // Truncate if too long
            if (text.length > 5000) {
              text = text.substring(0, 5000) + '\n... (truncated)';
            }
            return { content: [{ type: 'text', text }] };
          }

          case 'browser_close': {
            if (context) {
              await context.close();
              context = null;
              page = null;
            }
            return { content: [{ type: 'text', text: 'Browser closed' }] };
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
      }
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// STDIO MCP Transport
async function main() {
  console.error('[MCP] Patchright MCP Server starting...');

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk);

    // Process complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const request = JSON.parse(line);
        const response = await handleRequest(request);
        const result = { jsonrpc: '2.0', id: request.id, result: response };
        console.log(JSON.stringify(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[MCP] Error:', message);
      }
    }
  }
}

main().catch(console.error);
