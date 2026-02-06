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

// ========== AI Configuration ==========
const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'gemini', // 'gemini' or 'openai'
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: process.env.AI_MODEL || 'gemini-3-flash-preview',
  maxTokens: 4096,
  temperature: 0.1, // Low temperature for precise actions
  // Google Cloud config (for service account auth)
  useVertexAI: process.env.USE_VERTEX_AI === 'true' || (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY),
  gcpProject: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0858183694',
  gcpLocation: process.env.GCP_LOCATION || 'global',
};

/**
 * Get access token from Google Cloud Application Default Credentials
 * @returns {Promise<string>} Access token
 */
async function getGoogleAccessToken() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('gcloud auth print-access-token 2>/dev/null');
    return stdout.trim();
  } catch (e) {
    throw new Error('Failed to get Google Cloud access token. Run: gcloud auth application-default login');
  }
}

/**
 * Call Gemini Vision API to analyze screenshot and determine action.
 * Supports both API key auth and Google Cloud service account auth.
 * @param {string} base64Image - Base64 encoded screenshot
 * @param {string} prompt - User instruction (e.g., "click the login button")
 * @param {string} systemPrompt - System context
 * @returns {Promise<Object>} Parsed AI response
 */
async function callGeminiVision(base64Image, prompt, systemPrompt = '') {
  let url, headers;

  if (AI_CONFIG.useVertexAI || !AI_CONFIG.geminiApiKey) {
    // Use Vertex AI with service account auth
    const accessToken = await getGoogleAccessToken();
    const project = AI_CONFIG.gcpProject;
    const location = AI_CONFIG.gcpLocation;
    const model = AI_CONFIG.model;

    // Global region uses different URL format
    const baseUrl = location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`;
    url = `${baseUrl}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
    console.error(`[AI] Using Vertex AI: ${location}/${model}`);
  } else {
    // Use Generative Language API with API key
    url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent?key=${AI_CONFIG.geminiApiKey}`;
    headers = { 'Content-Type': 'application/json' };
    console.error(`[AI] Using API Key: ${AI_CONFIG.model}`);
  }

  const payload = {
    contents: [{
      role: 'user',
      parts: [
        {
          text: `${systemPrompt}\n\nUser instruction: ${prompt}\n\nAnalyze the screenshot and respond with a JSON object. Be precise with coordinates.`
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]
    }],
    generationConfig: {
      temperature: AI_CONFIG.temperature,
      maxOutputTokens: AI_CONFIG.maxTokens,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    // Clean potential markdown code blocks
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[AI] Failed to parse response:', text);
    return { error: 'Failed to parse AI response', raw: text };
  }
}

/**
 * System prompts for different AI actions
 */
const AI_PROMPTS = {
  act: `You are a browser automation assistant. Analyze the screenshot and determine how to perform the user's action.

Respond with JSON in this exact format:
{
  "action": "click" | "fill" | "select" | "scroll" | "hover" | "none",
  "target": {
    "x": <center X coordinate of element>,
    "y": <center Y coordinate of element>,
    "description": "<what you're targeting>"
  },
  "value": "<text to type, if action is fill>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}

Rules:
- Coordinates must be precise pixel values based on the screenshot dimensions
- For buttons/links, target the CENTER of the element
- If element is not visible, set action to "scroll" with direction
- If action cannot be performed, set action to "none" with reasoning
- Confidence < 0.5 means uncertain, suggest alternatives`,

  extract: `You are a data extraction assistant. Analyze the screenshot and extract the requested information.

Respond with JSON matching the user's requested schema. If a field cannot be found, use null.
Include a "_meta" field with:
{
  "_meta": {
    "confidence": <0.0-1.0>,
    "fieldsFound": <number>,
    "fieldsTotal": <number>
  }
}`,

  observe: `You are a page analysis assistant. Describe what you see on the page.

Respond with JSON:
{
  "pageType": "<login|dashboard|form|article|search|checkout|error|other>",
  "title": "<page title or main heading>",
  "mainElements": [
    { "type": "button|link|input|text|image", "text": "<visible text>", "position": "top|middle|bottom", "x": <approx x>, "y": <approx y> }
  ],
  "interactiveElements": <count>,
  "hasErrors": <boolean>,
  "errorMessage": "<if any>",
  "suggestedActions": ["<what user might want to do>"]
}`,

  // ========== NEW AI PROMPTS FOR LEVEL 2 FEATURES ==========

  plan: `You are a browser automation planning assistant. Given a high-level goal, create a detailed step-by-step plan to achieve it.

Respond with JSON:
{
  "goal": "<restated goal>",
  "assumptions": ["<assumption about current state>"],
  "steps": [
    {
      "id": "step_1",
      "action": "navigate|click|fill|type|scroll|wait|extract|assert",
      "description": "<what this step does>",
      "args": {
        "url": "<for navigate>",
        "instruction": "<for click/fill - natural language describing the target>",
        "text": "<for fill/type>",
        "assertion": "<for assert>"
      },
      "expectedResult": "<what should happen>",
      "fallback": "<what to do if this fails>"
    }
  ],
  "successCriteria": "<how to know the goal is achieved>",
  "estimatedSteps": <number>,
  "confidence": <0.0-1.0>,
  "risks": ["<potential issues>"]
}

Rules:
- Break down complex goals into atomic actions
- Each step should be independently executable
- Include assertions to verify progress
- Consider error cases and fallbacks
- Use natural language instructions that AI can interpret visually`,

  assert: `You are a visual assertion assistant. Analyze the screenshot and verify if the assertion is true.

Respond with JSON:
{
  "assertion": "<restated assertion>",
  "passed": <boolean>,
  "confidence": <0.0-1.0>,
  "evidence": {
    "found": ["<what was found that supports/refutes the assertion>"],
    "expected": "<what was expected>",
    "actual": "<what was actually observed>"
  },
  "details": {
    "elementVisible": <boolean or null if not applicable>,
    "textMatch": <boolean or null>,
    "countMatch": <boolean or null>,
    "locationCorrect": <boolean or null>
  },
  "screenshot_region": {
    "x": <x of relevant area>,
    "y": <y of relevant area>,
    "description": "<what's in this region>"
  },
  "suggestion": "<if failed, what might fix it>"
}

Rules:
- Be strict with assertions - only pass if clearly true
- Provide specific evidence from the screenshot
- If partially true, still fail but explain what's missing
- Consider semantic meaning, not just literal text matching`,

  wait: `You are a page readiness analyzer. Determine if the page is ready for interaction based on visual cues.

Respond with JSON:
{
  "ready": <boolean>,
  "confidence": <0.0-1.0>,
  "loadingIndicators": [
    {
      "type": "spinner|skeleton|progress|overlay|text",
      "location": {"x": <x>, "y": <y>},
      "description": "<what it looks like>"
    }
  ],
  "blockers": ["<what's preventing interaction>"],
  "readyElements": ["<elements that are ready for interaction>"],
  "recommendation": "wait|proceed|scroll",
  "estimatedWaitMs": <milliseconds to wait if not ready>,
  "reasoning": "<why the page is/isn't ready>"
}

Rules:
- Look for: spinners, loading text, skeleton screens, progress bars, overlays
- Check if main content is visible and not covered
- Consider if input fields are enabled/disabled
- A page with loading indicators is NOT ready
- An empty page or error page is considered "ready" (but note it in reasoning)`,

  heal: `You are a selector healing assistant. The original CSS selector failed. Find an alternative way to locate the element based on its visual description.

Respond with JSON:
{
  "found": <boolean>,
  "target": {
    "x": <center X coordinate>,
    "y": <center Y coordinate>,
    "description": "<what element you found>"
  },
  "alternativeSelectors": [
    "<css selector that might work>",
    "<another option>"
  ],
  "confidence": <0.0-1.0>,
  "reasoning": "<how you identified the element>",
  "visualDescription": "<describe the element for future reference>"
}

Rules:
- The user will describe what element they were trying to find
- Look for elements matching that description visually
- Provide precise coordinates for clicking
- Suggest alternative CSS selectors if possible
- If multiple matches exist, pick the most likely one and explain`
};

// ========== Helpers ==========
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Retry an async function with exponential backoff.
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 500)
 * @param {number} options.maxDelay - Max delay in ms (default: 5000)
 * @param {Function} options.shouldRetry - Predicate to determine if error is retryable
 * @param {string} options.operation - Operation name for logging
 * @returns {Promise<any>}
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 500,
    maxDelay = 5000,
    shouldRetry = (err) => {
      // Retry on network errors, timeouts, and transient failures
      const msg = err.message?.toLowerCase() || '';
      return msg.includes('timeout') ||
             msg.includes('net::') ||
             msg.includes('target closed') ||
             msg.includes('session closed') ||
             msg.includes('connection') ||
             msg.includes('navigation') && msg.includes('interrupted');
    },
    operation = 'operation'
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = Math.random() * delay * 0.2; // 20% jitter
      const totalDelay = Math.round(delay + jitter);

      console.error(`[Retry] ${operation} failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${totalDelay}ms...`);
      await sleep(totalDelay);
    }
  }

  throw lastError;
}

/**
 * Validate required fields in arguments object.
 * @param {Object} args - Arguments to validate
 * @param {string[]} required - Required field names
 * @param {string} toolName - Tool name for error message
 * @throws {Error} If required fields are missing
 */
function validateArgs(args, required, toolName) {
  const missing = required.filter(field => args?.[field] === undefined || args?.[field] === null);
  if (missing.length > 0) {
    throw new Error(`${toolName}: Missing required arguments: ${missing.join(', ')}`);
  }
}

/**
 * Validate argument types.
 * @param {Object} args - Arguments to validate
 * @param {Object} schema - Schema: { fieldName: 'string'|'number'|'boolean'|'array'|'object' }
 * @param {string} toolName - Tool name for error message
 */
function validateArgTypes(args, schema, toolName) {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (args?.[field] === undefined) continue; // Skip optional fields

    const actualType = Array.isArray(args[field]) ? 'array' : typeof args[field];
    if (actualType !== expectedType) {
      throw new Error(`${toolName}: Argument '${field}' must be ${expectedType}, got ${actualType}`);
    }
  }
}

/**
 * Moves the mouse to (x, y) following a human-like path with gravity and wind simulation.
 * Uses a more advanced algorithm than simple Bezier curves to mimic human motor control.
 *
 * @param {import('playwright').Page} page
 * @param {number} targetX
 * @param {number} targetY
 * @param {{x: number, y: number}} mousePos - Current mouse position (mutated with final position)
 * @returns {Promise<{x: number, y: number}>} Final mouse position
 */
async function humanMove(page, targetX, targetY, mousePos = { x: 0, y: 0 }) {
  const startX = mousePos.x;
  const startY = mousePos.y;

  // Fitts's Law parameters (simplified)
  const distance = Math.hypot(targetX - startX, targetY - startY);

  // Skip movement if already at target (within 2px tolerance)
  if (distance < 2) {
    return mousePos;
  }

  // More steps for longer distances, fewer for short movements
  const steps = Math.max(15, Math.min(80, Math.floor(distance / 8)));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;

    // Easing function (easeOutQuad) - fast start, slow end
    const easeT = t * (2 - t);

    // Linear interpolation base
    let nextX = startX + (targetX - startX) * easeT;
    let nextY = startY + (targetY - startY) * easeT;

    // Add noise/deviation (simulating hand tremor/correction)
    const deviation = Math.sin(t * Math.PI) * (distance * 0.03); // Max 3% deviation
    nextX += deviation * (Math.random() - 0.5);
    nextY += deviation * (Math.random() - 0.5);

    // Overshoot at the end (common human behavior) - only for longer movements
    if (distance > 100 && i === steps - 3) {
      nextX += (targetX - startX) * 0.015;
      nextY += (targetY - startY) * 0.015;
    }

    await page.mouse.move(nextX, nextY);

    // Variable timing (slower at the end for precision)
    const delay = (1 - t) * 4 + Math.random() * 2;
    await page.waitForTimeout(delay);
  }

  // Final correction to exact pixel
  await page.mouse.move(targetX, targetY);

  // Update and return position
  mousePos.x = targetX;
  mousePos.y = targetY;
  return mousePos;
}

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
  profilePath: process.env.BROWSER_PROFILE || '/home/edu/.autorenta-bot-profile',
  channel: 'chrome', // Use installed Google Chrome (not bundled Chromium which crashes)
  eventBufferSize: 100,
  compactOutput: true,
  maxEventSummary: 5,

  // Timeouts (ms)
  navigationTimeoutMs: Number(process.env.NAVIGATION_TIMEOUT_MS || 60000),
  selectorTimeoutMs: Number(process.env.SELECTOR_TIMEOUT_MS || 10000),
  screenshotTimeoutMs: Number(process.env.SCREENSHOT_TIMEOUT_MS || 30000),
  postActionDelayMs: Number(process.env.POST_ACTION_DELAY_MS || 100),
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
      if (data.selfHealed) {
        return `🩹 Self-Healed Click: ${data.clicked}\n🎯 Visual Match: "${data.matchedText}" at [${data.coords.x}, ${data.coords.y}]\n📊 Events: ${data.eventsTriggered}`;
      }
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
    this.ensureBrowserInFlight = null;

    // Mouse position tracking for human-like movement
    this.mousePos = { x: 0, y: 0 };

    // Serialize page operations (avoids overlapping click/fill/navigate)
    this.pageOpInFlight = Promise.resolve();

    // Track all pages for cleanup
    this.trackedPages = new Set();

    // Health check state
    this._lastHealthCheck = 0;
    this._healthCheckInterval = 30000; // 30 seconds
    this._isHealthy = true;

    // Event streaming (NO CDP - just page events)
    this.eventBuffer = [];
    this.lastEventId = 0;

    // ========== Workflow Engine Storage ==========
    this.workflows = new Map();  // name -> workflow definition
    this.workflowRuns = new Map();  // runId -> execution state
    this.workflowsPath = process.env.WORKFLOWS_PATH || '/tmp/patchright-workflows';

    // ========== Live Monitor WebSocket ==========
    this.wsServer = null;
    this.wsClients = new Set();
    this.monitorPort = parseInt(process.env.MONITOR_PORT || '8765');
    this.lastScreenshot = null;
    this.monitorState = {
      url: '',
      title: '',
      status: 'idle',
      workflow: null,
      workflowStep: null,
      lastAction: null,
    };

    // ========== Session Persistence ==========
    this.sessionsPath = process.env.SESSIONS_PATH || '/tmp/patchright-sessions';
    this.currentSession = null;

    // ========== Self-Healing Selectors Cache ==========
    this.selectorCache = new Map();  // originalSelector -> { healed: selector, visualDesc, lastUsed }
    this.healingEnabled = true;

    // ========== AI Planning State ==========
    this.currentPlan = null;
    this.planHistory = [];

    // Load saved workflows on startup
    this._loadWorkflows();

    // Start WebSocket server for Live Monitor
    this._startMonitorServer();

    this.setupHandlers();
  }

  // ========== Live Monitor Methods ==========

  async _startMonitorServer() {
    try {
      const { WebSocketServer } = await import('ws');

      this.wsServer = new WebSocketServer({ port: this.monitorPort });

      this.wsServer.on('connection', (ws) => {
        console.error(`[Monitor] Client connected (total: ${this.wsServer.clients.size})`);
        this.wsClients.add(ws);

        // Send current state to new client
        ws.send(JSON.stringify({
          type: 'init',
          state: this.monitorState,
          screenshot: this.lastScreenshot,
          timestamp: Date.now(),
        }));

        ws.on('close', () => {
          this.wsClients.delete(ws);
          console.error(`[Monitor] Client disconnected (total: ${this.wsServer.clients.size})`);
        });

        ws.on('message', async (data) => {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'request_screenshot') {
              await this._captureAndBroadcastScreenshot();
            }
          } catch (e) {}
        });
      });

      console.error(`[Monitor] WebSocket server started on ws://localhost:${this.monitorPort}`);
    } catch (e) {
      console.error(`[Monitor] Failed to start WebSocket server: ${e.message}`);
    }
  }

  broadcast(event) {
    if (!this.wsServer || this.wsClients.size === 0) return;

    const message = JSON.stringify({
      ...event,
      timestamp: Date.now(),
    });

    for (const client of this.wsClients) {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      } catch (e) {}
    }
  }

  async _captureAndBroadcastScreenshot() {
    try {
      if (!this.page || this.page.isClosed()) return;

      const buffer = await this.page.screenshot({
        type: 'jpeg',
        quality: 60,
      });
      this.lastScreenshot = buffer.toString('base64');

      this.broadcast({
        type: 'screenshot',
        data: this.lastScreenshot,
      });
    } catch (e) {}
  }

  broadcastAction(action, details = {}) {
    // Update state
    this.monitorState.lastAction = { action, ...details };
    if (details.url) this.monitorState.url = details.url;
    if (details.title) this.monitorState.title = details.title;

    // Broadcast event
    this.broadcast({
      type: 'action',
      action,
      details,
      state: this.monitorState,
    });

    // Auto-capture screenshot after visual actions
    const visualActions = ['navigate', 'click', 'type', 'fill', 'scroll', 'select'];
    if (visualActions.includes(action)) {
      setTimeout(() => this._captureAndBroadcastScreenshot(), 500);
    }
  }

  broadcastWorkflowStatus(status, workflow = null, step = null) {
    this.monitorState.status = status;
    this.monitorState.workflow = workflow;
    this.monitorState.workflowStep = step;

    this.broadcast({
      type: 'workflow',
      status,
      workflow,
      step,
      state: this.monitorState,
    });
  }

  // ========== Workflow Engine Methods ==========

  async _loadWorkflows() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      if (fs.existsSync(this.workflowsPath)) {
        const files = fs.readdirSync(this.workflowsPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(this.workflowsPath, file), 'utf-8');
            const workflow = JSON.parse(content);
            this.workflows.set(workflow.name, workflow);
            console.error(`[Workflow] Loaded: ${workflow.name}`);
          } catch (e) {
            console.error(`[Workflow] Failed to load ${file}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.error(`[Workflow] Load error: ${e.message}`);
    }
  }

  async _saveWorkflow(workflow) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      if (!fs.existsSync(this.workflowsPath)) {
        fs.mkdirSync(this.workflowsPath, { recursive: true });
      }
      const filename = workflow.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
      fs.writeFileSync(path.join(this.workflowsPath, filename), JSON.stringify(workflow, null, 2));
      console.error(`[Workflow] Saved: ${workflow.name}`);
    } catch (e) {
      console.error(`[Workflow] Save error: ${e.message}`);
    }
  }

  _interpolateVariables(obj, variables) {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this._interpolateVariables(item, variables));
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this._interpolateVariables(value, variables);
      }
      return result;
    }
    return obj;
  }

  async _executeWorkflowStep(step, variables, runState) {
    const actionMap = {
      'navigate': 'stream_navigate',
      'click': 'stream_click',
      'type': 'stream_type',
      'fill': 'stream_fill',
      'wait': 'stream_wait_for',
      'screenshot': 'stream_screenshot',
      'evaluate': 'stream_evaluate',
      'act': 'stream_act',
      'extract': 'stream_extract',
      'observe': 'stream_observe',
      'scroll': 'stream_scroll',
      'hover': 'stream_hover',
      'select': 'stream_select',
      'keyboard': 'stream_keyboard',
      'mouse': 'stream_mouse',
      'sleep': null,  // Special case
      'set_variable': null,  // Special case
      'condition': null,  // Special case
    };

    const toolName = actionMap[step.action];

    // Handle special actions
    if (step.action === 'sleep') {
      const ms = step.args?.ms || step.args?.duration || 1000;
      await new Promise(r => setTimeout(r, ms));
      return { success: true, action: 'sleep', duration: ms };
    }

    if (step.action === 'set_variable') {
      const { name, value, fromExtract } = step.args;
      if (fromExtract && runState.lastExtract) {
        variables[name] = runState.lastExtract[fromExtract] || runState.lastExtract;
      } else if (value !== undefined) {
        variables[name] = this._interpolateVariables(value, variables);
      }
      return { success: true, action: 'set_variable', name, value: variables[name] };
    }

    if (step.action === 'condition') {
      const { variable, equals, notEquals, contains, goto, gotoElse } = step.args;
      const val = variables[variable];
      let conditionMet = false;

      if (equals !== undefined) conditionMet = val === equals;
      else if (notEquals !== undefined) conditionMet = val !== notEquals;
      else if (contains !== undefined) conditionMet = String(val).includes(contains);

      return {
        success: true,
        action: 'condition',
        variable,
        value: val,
        conditionMet,
        nextStep: conditionMet ? goto : gotoElse,
      };
    }

    if (!toolName) {
      throw new Error(`Unknown workflow action: ${step.action}`);
    }

    // Interpolate variables in args
    const interpolatedArgs = this._interpolateVariables(step.args || {}, variables);

    // Execute the tool using internal method
    const result = await this._executeTool(toolName, interpolatedArgs);

    // Store extraction results
    if (step.action === 'extract' && result.extracted) {
      runState.lastExtract = result.extracted;
    }

    return result;
  }

  async _executeTool(name, args) {
    // This method allows internal execution of tools
    // It duplicates some logic from the handler but avoids the MCP overhead
    const startTime = Date.now();

    try {
      // Simplified tool execution for common actions
      const { page } = await this.ensureBrowser();

      switch (name) {
        case 'stream_navigate':
          await page.goto(args.url, {
            waitUntil: args.waitUntil || 'domcontentloaded',
            timeout: args.timeout || 30000,
          });
          return { success: true, url: args.url, elapsed: Date.now() - startTime };

        case 'stream_click':
          await page.click(args.selector, { timeout: args.timeout || 10000, force: args.force });
          return { success: true, clicked: args.selector, elapsed: Date.now() - startTime };

        case 'stream_type':
          await page.type(args.selector, args.text, { delay: args.delay || 50 });
          return { success: true, typed: args.text.length + ' chars', elapsed: Date.now() - startTime };

        case 'stream_fill':
          await page.fill(args.selector, args.value);
          return { success: true, filled: args.selector, elapsed: Date.now() - startTime };

        case 'stream_wait_for':
          if (args.selector) {
            await page.waitForSelector(args.selector, { timeout: args.timeout || 30000, state: args.state });
          } else if (args.timeout) {
            await page.waitForTimeout(args.timeout);
          }
          return { success: true, waited: args.selector || args.timeout, elapsed: Date.now() - startTime };

        case 'stream_screenshot':
          const buffer = await page.screenshot({ type: args.compress ? 'jpeg' : 'png', quality: args.compress ? 70 : undefined, fullPage: args.fullPage });
          return { success: true, size: buffer.length, elapsed: Date.now() - startTime };

        case 'stream_evaluate':
          const evalResult = await page.evaluate(args.script);
          return { success: true, result: evalResult, elapsed: Date.now() - startTime };

        case 'stream_scroll':
          const direction = args.direction || 'down';
          const scrollAmount = args.amount || 500;
          await page.evaluate(({ dir, amt }) => {
            window.scrollBy(0, dir === 'down' ? amt : -amt);
          }, { dir: direction, amt: scrollAmount });
          return { success: true, scrolled: direction, amount: scrollAmount, elapsed: Date.now() - startTime };

        case 'stream_hover':
          await page.hover(args.selector);
          return { success: true, hovered: args.selector, elapsed: Date.now() - startTime };

        case 'stream_select':
          await page.selectOption(args.selector, args.value);
          return { success: true, selected: args.value, elapsed: Date.now() - startTime };

        case 'stream_keyboard':
          await page.keyboard.press(args.key);
          return { success: true, pressed: args.key, elapsed: Date.now() - startTime };

        case 'stream_mouse':
          if (args.action === 'click') {
            await page.mouse.click(args.x, args.y);
          } else if (args.action === 'move') {
            await page.mouse.move(args.x, args.y);
          }
          return { success: true, mouse: args.action, x: args.x, y: args.y, elapsed: Date.now() - startTime };

        default:
          throw new Error(`Tool not implemented for workflow: ${name}`);
      }
    } catch (error) {
      return { success: false, error: error.message, elapsed: Date.now() - startTime };
    }
  }

  async withPageLock(fn) {
    const run = async () => await fn();
    const p = this.pageOpInFlight.then(run, run);
    // Keep the chain alive even if p rejects
    this.pageOpInFlight = p.then(() => undefined, () => undefined);
    return p;
  }

  // ========== Health & Validation ==========

  /**
   * Check if the browser and page are healthy and responsive.
   * @returns {Promise<{healthy: boolean, reason?: string}>}
   */
  async checkHealth() {
    try {
      if (!this.context) {
        return { healthy: false, reason: 'no_context' };
      }

      if (!this.page) {
        return { healthy: false, reason: 'no_page' };
      }

      if (typeof this.page.isClosed === 'function' && this.page.isClosed()) {
        return { healthy: false, reason: 'page_closed' };
      }

      // Try a simple evaluation to verify responsiveness
      const startTime = Date.now();
      await Promise.race([
        this.page.evaluate('1+1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('health_check_timeout')), 5000))
      ]);
      const responseTime = Date.now() - startTime;

      this._lastHealthCheck = Date.now();
      this._isHealthy = true;

      return { healthy: true, responseTime };
    } catch (error) {
      this._isHealthy = false;
      return { healthy: false, reason: error.message };
    }
  }

  /**
   * Ensure page is valid before operations. Auto-recovers if possible.
   * @throws {Error} If page cannot be recovered
   */
  async ensureValidPage() {
    // Quick check if we need a full health check
    const now = Date.now();
    if (now - this._lastHealthCheck < this._healthCheckInterval && this._isHealthy) {
      // Still within healthy window, do quick validation
      if (this.page && (typeof this.page.isClosed !== 'function' || !this.page.isClosed())) {
        return this.page;
      }
    }

    const health = await this.checkHealth();

    if (health.healthy) {
      return this.page;
    }

    // Try to recover
    console.error(`[MCP] Page unhealthy (${health.reason}). Attempting recovery...`);

    if (health.reason === 'page_closed' && this.context) {
      // Try to get another page or create one
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
        await this.setupPageListeners(this.page);
        console.error('[MCP] Recovered by switching to existing page');
        return this.page;
      } else {
        this.page = await this.context.newPage();
        await this.setupPageListeners(this.page);
        console.error('[MCP] Recovered by creating new page');
        return this.page;
      }
    }

    if (health.reason === 'no_context' || health.reason === 'no_page') {
      // Full browser restart needed
      console.error('[MCP] Full browser restart required');
      await this.closeBrowser({ clearEvents: false });
      const { page } = await this.ensureBrowser();
      return page;
    }

    throw new Error(`Browser unhealthy and recovery failed: ${health.reason}`);
  }

  /**
   * Track a page for cleanup when closed.
   * @param {import('playwright').Page} page
   */
  trackPage(page) {
    if (this.trackedPages.has(page)) return;

    this.trackedPages.add(page);

    page.once('close', () => {
      this.trackedPages.delete(page);
      console.error(`[MCP] Page closed and untracked. Active pages: ${this.trackedPages.size}`);

      // If this was our active page, clear the reference
      if (this.page === page) {
        this.page = null;
        this.mousePos = { x: 0, y: 0 };
      }
    });
  }

  /**
   * Cleanup all tracked pages that are closed.
   */
  cleanupClosedPages() {
    for (const page of this.trackedPages) {
      if (typeof page.isClosed === 'function' && page.isClosed()) {
        this.trackedPages.delete(page);
      }
    }
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
    if (this.ensureBrowserInFlight) return this.ensureBrowserInFlight;

    this.ensureBrowserInFlight = (async () => {
      // If we have a page reference, ensure it's still open
      if (this.page) {
        try {
          if (typeof this.page.isClosed === 'function' && this.page.isClosed()) {
            this.page = null;
          }
        } catch {
          this.page = null;
        }
      }

      // If we have a context reference, try to reuse it (keeps cookies/session)
      if (this.context) {
        try {
          const pages = this.context.pages();
          if (!this.page) {
            this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
            this.page.on('close', () => {
              this.page = null;
              this.pushEvent(EventType.ERROR, { message: 'page_closed' });
            });
            await this.setupPageListeners();
          }

          // Validate page is usable
          await this.page.title();
          return { context: this.context, page: this.page };
        } catch {
          // Stale/closed context. Close it to release the profile lock.
          await this.closeBrowser();
        }
      }

      console.error('[MCP] Launching PATCHRIGHT browser with persistent profile...');
      console.error(`[MCP] Profile: ${CONFIG.profilePath}`);

      // 🧹 CLEANUP: Remove stale locks if browser is not running
      // This prevents "SingletonLock" errors after hard crashes
      const fs = await import('fs');
      const path = await import('path');
      const lockFile = path.join(CONFIG.profilePath, 'SingletonLock');
      
      try {
        // Simple heuristic: if we are just starting and nobody holds the lock (flock check is hard in node without deps),
        // we assume it might be stale if the PID in 'SingletonLock' doesn't exist.
        // For now, we'll just log a warning if it exists. A forceful cleanup script is safer separate.
        if (fs.existsSync(lockFile)) {
             console.error('[MCP] ⚠️ Warning: SingletonLock found in profile. If launch fails, the profile might be locked by a zombie process.');
             // Optional: fs.unlinkSync(lockFile); // Risky if another instance is actually running
        }
      } catch (e) {}

      const launch = async () => {
        const os = await import('os');
        // Video dir requires a persistent path to save files
        this.videoDir = path.join(os.tmpdir(), 'mcp-videos');
        if (!fs.existsSync(this.videoDir)) fs.mkdirSync(this.videoDir, { recursive: true });

        // Determine if this is a Chrome profile (needs special handling)
        const chromeBaseDir = path.join(os.homedir(), '.config/google-chrome');
        const isExistingChromeProfile = CONFIG.profilePath.startsWith(chromeBaseDir) &&
                                         CONFIG.profilePath !== chromeBaseDir;

        let userDataDir = CONFIG.profilePath;
        const extraArgs = [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--window-size=1920,1080',
          '--start-maximized',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];

        // For existing Chrome profiles, use base dir + profile-directory arg
        if (isExistingChromeProfile) {
          const profileName = path.basename(CONFIG.profilePath);
          userDataDir = chromeBaseDir;
          extraArgs.push(`--profile-directory=${profileName}`);
          console.error(`[MCP] Using Chrome profile: ${profileName}`);
        }

        this.context = await chromium.launchPersistentContext(userDataDir, {
          headless: CONFIG.headless,
          channel: CONFIG.channel,
          viewport: { width: 1280, height: 720 },
          recordVideo: {
            dir: this.videoDir,
            size: { width: 1280, height: 720 }
          },
          args: extraArgs,
          ignoreDefaultArgs: ['--enable-automation'],
        });

        // 🛡️ MILITARY GRADE STEALTH INJECTION V2 (Enhanced WebGL/Audio/Canvas)
        await this.context.addInitScript(() => {
            // 1. Spoof WebGL Vendor/Renderer (Intel Iris OpenGL Engine)
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
                return getParameter.apply(this, [parameter]);
            };

            // 2. Spoof Navigator Hardware
            Object.defineProperties(navigator, {
                hardwareConcurrency: { get: () => 8 },
                deviceMemory: { get: () => 8 },
                webdriver: { get: () => undefined },
            });

            // 3. AudioContext Fingerprint Noise
            const originalCreateOscillator = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function() {
                const oscillator = originalCreateOscillator.apply(this, arguments);
                const originalStart = oscillator.start;
                oscillator.start = function(when = 0) {
                    return originalStart.apply(this, [when + (Math.random() * 1e-6)]);
                };
                return oscillator;
            };

            // 4. Mock chrome.runtime
            if (!window.chrome) { window.chrome = {}; }
            if (!window.chrome.runtime) { window.chrome.runtime = {}; }

            // 5. Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
            );

            // 6. Mock plugins & languages
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es', 'en-US', 'en'] });
        });

        this.context.on('close', () => {
          this.context = null;
          this.page = null;
          this.pushEvent(EventType.ERROR, { message: 'browser_context_closed' });
        });

        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

        // Track all existing pages
        for (const p of this.context.pages()) {
          this.trackPage(p);
        }

        // Track new pages created in this context
        this.context.on('page', (newPage) => {
          this.trackPage(newPage);
          this.setupPageListeners(newPage).catch(e => {
            console.error(`[MCP] Failed to setup listeners for new page: ${e.message}`);
          });
        });

        await this.setupPageListeners(this.page);
      };

      try {
        await launch();
      } catch {
        // One retry after cleanup (handles transient profile/context issues)
        await this.closeBrowser();
        await launch();
      }

      this.pushEvent(EventType.PAGE_LOAD, { status: 'patchright_ready', profile: CONFIG.profilePath });
      return { context: this.context, page: this.page };
    })();

    try {
      return await this.ensureBrowserInFlight;
    } finally {
      this.ensureBrowserInFlight = null;
    }
  }

  /**
   * Attach event listeners to a page. Can be called on any page (main or popup).
   * @param {import('playwright').Page} targetPage - The page to attach listeners to
   */
  async setupPageListeners(targetPage = this.page) {
    if (!targetPage) return;
    if (targetPage._mcpListenersAttached) return;
    targetPage._mcpListenersAttached = true;

    const pageLabel = targetPage === this.page ? 'main' : 'popup';

    // Console messages
    targetPage.on('console', msg => {
      this.pushEvent(EventType.CONSOLE, {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        page: pageLabel,
      });
    });

    // Page errors
    targetPage.on('pageerror', error => {
      this.pushEvent(EventType.ERROR, {
        message: error.message,
        stack: error.stack,
        page: pageLabel,
      });
    });

    // Navigation
    targetPage.on('framenavigated', frame => {
      if (frame === targetPage.mainFrame()) {
        this.pushEvent(EventType.NAVIGATION, {
          url: frame.url(),
          name: frame.name(),
          page: pageLabel,
        });
      }
    });

    // Dialogs
    targetPage.on('dialog', dialog => {
      this.pushEvent(EventType.DIALOG, {
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue(),
        page: pageLabel,
      });
    });

    // Network requests
    targetPage.on('request', request => {
      this.pushEvent(EventType.NETWORK_REQUEST, {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        page: pageLabel,
      });
    });

    // Network responses
    targetPage.on('response', response => {
      this.pushEvent(EventType.NETWORK_RESPONSE, {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        page: pageLabel,
      });
    });

    // Popups (new tabs/windows) - attach listeners recursively
    targetPage.on('popup', async popup => {
      try {
        await popup.waitForLoadState('domcontentloaded', { timeout: 10000 });
        const title = await popup.title().catch(() => 'New Tab');

        // Attach listeners to the new popup page
        await this.setupPageListeners(popup);

        this.pushEvent('popup', {
          url: popup.url(),
          title: title,
          fromPage: pageLabel,
        });
        console.error(`[MCP] New tab opened: ${title} (${popup.url()})`);
      } catch (e) {
        this.pushEvent('popup_error', { error: e.message, fromPage: pageLabel });
      }
    });

    // Downloads
    targetPage.on('download', async download => {
      const suggested = download.suggestedFilename();
      this.pushEvent('download_started', { filename: suggested, url: download.url(), page: pageLabel });
      try {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');
        const downloadPath = await download.path();
        if (downloadPath) {
          const dest = path.join(os.tmpdir(), `mcp-download-${Date.now()}-${suggested}`);
          await download.saveAs(dest);
          this.pushEvent('download_completed', { filename: suggested, path: dest, page: pageLabel });
        }
      } catch (e) {
        this.pushEvent('download_error', { error: e.message, page: pageLabel });
      }
    });

    console.error(`[MCP] Page listeners attached to ${pageLabel} (no CDP - stealth mode)`);
  }

  async closeBrowser(options = {}) {
    const { clearEvents = true, reason = 'manual' } = options;

    console.error(`[MCP] Closing browser (reason: ${reason})...`);

    // Clear all tracked pages
    this.trackedPages.clear();

    // Close context (which closes all pages)
    if (this.context) {
      try {
        await Promise.race([
          this.context.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('close_timeout')), 10000))
        ]);
      } catch (e) {
        console.error(`[MCP] Browser close warning: ${e.message}`);
      }
      this.context = null;
      this.page = null;
    }

    if (clearEvents) {
      this.clearEvents();
    }

    // Reset all state
    this.mousePos = { x: 0, y: 0 };
    this._resourceBlockHandler = null;
    this._blockedResourceTypes = null;
    this._isHealthy = false;
    this._lastHealthCheck = 0;
    this.routes = [];
    this.popupHandlers = [];

    console.error('[MCP] Browser closed and state reset');
  }

  // ========== SESSION PERSISTENCE METHODS ==========

  async _saveSession(name, options = {}) {
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true });
    }

    const sessionDir = path.join(this.sessionsPath, name.replace(/[^a-zA-Z0-9_-]/g, '_'));
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const sessionData = {
      name,
      savedAt: new Date().toISOString(),
      url: this.page ? this.page.url() : null,
      title: this.page ? await this.page.title().catch(() => '') : null,
    };

    // Save cookies
    if (this.context) {
      const cookies = await this.context.cookies();
      fs.writeFileSync(path.join(sessionDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
      sessionData.cookieCount = cookies.length;
    }

    // Save localStorage and sessionStorage
    if (this.page && !this.page.isClosed()) {
      try {
        const storage = await this.page.evaluate(() => {
          const local = {};
          const session = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            local[key] = localStorage.getItem(key);
          }
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            session[key] = sessionStorage.getItem(key);
          }
          return { localStorage: local, sessionStorage: session };
        });
        fs.writeFileSync(path.join(sessionDir, 'storage.json'), JSON.stringify(storage, null, 2));
        sessionData.localStorageKeys = Object.keys(storage.localStorage).length;
        sessionData.sessionStorageKeys = Object.keys(storage.sessionStorage).length;
      } catch (e) {
        console.error(`[Session] Could not save storage: ${e.message}`);
      }
    }

    // Save metadata
    fs.writeFileSync(path.join(sessionDir, 'metadata.json'), JSON.stringify(sessionData, null, 2));

    this.currentSession = name;
    console.error(`[Session] Saved: ${name}`);
    return sessionData;
  }

  async _loadSession(name) {
    const fs = await import('fs');
    const path = await import('path');

    const sessionDir = path.join(this.sessionsPath, name.replace(/[^a-zA-Z0-9_-]/g, '_'));

    if (!fs.existsSync(sessionDir)) {
      throw new Error(`Session not found: ${name}`);
    }

    const metadataPath = path.join(sessionDir, 'metadata.json');
    const cookiesPath = path.join(sessionDir, 'cookies.json');
    const storagePath = path.join(sessionDir, 'storage.json');

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const result = { ...metadata, restored: {} };

    // Ensure browser is running
    await this.ensureBrowser();

    // Restore cookies
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await this.context.addCookies(cookies);
      result.restored.cookies = cookies.length;
    }

    // Navigate to saved URL first (needed for storage restoration)
    if (metadata.url && metadata.url !== 'about:blank') {
      await this.page.goto(metadata.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    // Restore storage
    if (fs.existsSync(storagePath)) {
      const storage = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
      try {
        await this.page.evaluate((storageData) => {
          for (const [key, value] of Object.entries(storageData.localStorage || {})) {
            localStorage.setItem(key, value);
          }
          for (const [key, value] of Object.entries(storageData.sessionStorage || {})) {
            sessionStorage.setItem(key, value);
          }
        }, storage);
        result.restored.localStorage = Object.keys(storage.localStorage || {}).length;
        result.restored.sessionStorage = Object.keys(storage.sessionStorage || {}).length;
      } catch (e) {
        console.error(`[Session] Could not restore storage: ${e.message}`);
      }
    }

    // Refresh page to apply cookies
    if (metadata.url && metadata.url !== 'about:blank') {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    this.currentSession = name;
    console.error(`[Session] Loaded: ${name}`);
    return result;
  }

  async _listSessions() {
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(this.sessionsPath)) {
      return [];
    }

    const sessions = [];
    const dirs = fs.readdirSync(this.sessionsPath);

    for (const dir of dirs) {
      const metadataPath = path.join(this.sessionsPath, dir, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          sessions.push(metadata);
        } catch (e) {}
      }
    }

    return sessions.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }

  async _deleteSession(name) {
    const fs = await import('fs');
    const path = await import('path');

    const sessionDir = path.join(this.sessionsPath, name.replace(/[^a-zA-Z0-9_-]/g, '_'));

    if (!fs.existsSync(sessionDir)) {
      throw new Error(`Session not found: ${name}`);
    }

    fs.rmSync(sessionDir, { recursive: true });
    if (this.currentSession === name) {
      this.currentSession = null;
    }
    console.error(`[Session] Deleted: ${name}`);
    return { deleted: name };
  }

  // ========== AI PLANNING METHODS ==========

  async _aiPlan(goal, context = {}) {
    const { page } = await this.ensureBrowser();

    // Take screenshot for context
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 70 });
    const base64Image = screenshotBuffer.toString('base64');

    // Get current page info
    const pageInfo = {
      url: page.url(),
      title: await page.title().catch(() => ''),
    };

    const fullPrompt = `Current page: ${pageInfo.url}\nTitle: ${pageInfo.title}\n\nGoal: ${goal}\n\nAdditional context: ${JSON.stringify(context)}`;

    const plan = await callGeminiVision(base64Image, fullPrompt, AI_PROMPTS.plan);

    // Store the plan
    this.currentPlan = {
      goal,
      plan,
      createdAt: new Date().toISOString(),
      status: 'created',
      currentStep: 0,
      results: [],
    };

    this.planHistory.push(this.currentPlan);
    console.error(`[AI Plan] Created plan with ${plan.steps?.length || 0} steps for: ${goal}`);

    return plan;
  }

  async _aiExecutePlan(options = {}) {
    const { stopOnError = true, maxSteps = 50 } = options;

    if (!this.currentPlan || !this.currentPlan.plan?.steps) {
      throw new Error('No plan to execute. Call stream_ai_plan first.');
    }

    const plan = this.currentPlan;
    plan.status = 'running';
    const results = [];

    for (let i = plan.currentStep; i < plan.plan.steps.length && i < maxSteps; i++) {
      const step = plan.plan.steps[i];
      plan.currentStep = i;

      console.error(`[AI Plan] Executing step ${i + 1}/${plan.plan.steps.length}: ${step.description}`);
      this.broadcastWorkflowStatus('running', plan.goal, step.description);

      try {
        let stepResult;

        switch (step.action) {
          case 'navigate':
            stepResult = await this._executeTool('stream_navigate', { url: step.args?.url });
            break;

          case 'click':
          case 'fill':
          case 'type':
            // Use AI action for natural language instructions
            stepResult = await this._executeTool('stream_act', {
              instruction: step.args?.instruction || step.description,
            });
            break;

          case 'scroll':
            stepResult = await this._executeTool('stream_scroll', {
              direction: step.args?.direction || 'down',
              amount: step.args?.amount || 500,
            });
            break;

          case 'wait':
            stepResult = await this._aiSmartWait(step.args?.condition || 'page ready');
            break;

          case 'extract':
            stepResult = await this._executeTool('stream_extract', {
              prompt: step.args?.prompt || step.description,
            });
            break;

          case 'assert':
            stepResult = await this._aiAssert(step.args?.assertion || step.description);
            if (!stepResult.passed) {
              throw new Error(`Assertion failed: ${stepResult.evidence?.actual || 'unknown'}`);
            }
            break;

          default:
            stepResult = { skipped: true, reason: `Unknown action: ${step.action}` };
        }

        results.push({ step: i, action: step.action, success: true, result: stepResult });
        await sleep(500); // Brief pause between steps

      } catch (error) {
        const errorResult = { step: i, action: step.action, success: false, error: error.message };
        results.push(errorResult);

        if (stopOnError) {
          plan.status = 'failed';
          plan.results = results;
          return { status: 'failed', completedSteps: i, error: error.message, results };
        }
      }
    }

    plan.status = 'completed';
    plan.results = results;
    this.broadcastWorkflowStatus('completed', plan.goal, null);

    return {
      status: 'completed',
      completedSteps: plan.plan.steps.length,
      results,
      successCriteria: plan.plan.successCriteria,
    };
  }

  // ========== AI VISUAL ASSERTION METHODS ==========

  async _aiAssert(assertion) {
    const { page } = await this.ensureBrowser();

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
    const base64Image = screenshotBuffer.toString('base64');

    const pageInfo = {
      url: page.url(),
      title: await page.title().catch(() => ''),
    };

    const prompt = `Page URL: ${pageInfo.url}\nPage Title: ${pageInfo.title}\n\nAssertion to verify: ${assertion}`;

    const result = await callGeminiVision(base64Image, prompt, AI_PROMPTS.assert);

    // Broadcast for monitor
    this.broadcastAction('assert', {
      assertion,
      passed: result.passed,
      confidence: result.confidence,
    });

    console.error(`[AI Assert] "${assertion}" => ${result.passed ? '✅ PASSED' : '❌ FAILED'} (${Math.round(result.confidence * 100)}%)`);

    return result;
  }

  // ========== AI SMART WAIT METHODS ==========

  async _aiSmartWait(condition = 'page is ready for interaction', options = {}) {
    const { maxWaitMs = 30000, pollIntervalMs = 1000 } = options;
    const { page } = await this.ensureBrowser();

    const startTime = Date.now();
    let attempts = 0;
    let lastResult = null;

    while (Date.now() - startTime < maxWaitMs) {
      attempts++;

      // Take screenshot
      const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 60 });
      const base64Image = screenshotBuffer.toString('base64');

      const prompt = `Condition to check: ${condition}\n\nIs the page ready? Look for loading indicators, spinners, skeleton screens, or anything blocking interaction.`;

      lastResult = await callGeminiVision(base64Image, prompt, AI_PROMPTS.wait);

      if (lastResult.ready) {
        console.error(`[AI Wait] Ready after ${attempts} checks (${Date.now() - startTime}ms): ${lastResult.reasoning}`);
        return {
          ready: true,
          waitedMs: Date.now() - startTime,
          attempts,
          ...lastResult,
        };
      }

      console.error(`[AI Wait] Not ready (attempt ${attempts}): ${lastResult.reasoning || 'checking...'}`);

      // Wait before next check (use AI suggestion if available)
      const waitTime = Math.min(lastResult.estimatedWaitMs || pollIntervalMs, pollIntervalMs * 2);
      await sleep(waitTime);
    }

    console.error(`[AI Wait] Timeout after ${maxWaitMs}ms`);
    return {
      ready: false,
      timedOut: true,
      waitedMs: Date.now() - startTime,
      attempts,
      ...lastResult,
    };
  }

  // ========== SELF-HEALING SELECTOR METHODS ==========

  async _healSelector(originalSelector, description, action = 'click') {
    const { page } = await this.ensureBrowser();

    // Check cache first
    const cached = this.selectorCache.get(originalSelector);
    if (cached && Date.now() - cached.lastUsed < 3600000) { // 1 hour cache
      console.error(`[Heal] Using cached selector for: ${originalSelector}`);
      return { healed: true, fromCache: true, ...cached };
    }

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
    const base64Image = screenshotBuffer.toString('base64');

    const prompt = `Original CSS selector that failed: ${originalSelector}\nWhat we're looking for: ${description || originalSelector}\nAction to perform: ${action}\n\nFind this element visually and provide coordinates to ${action} it.`;

    const result = await callGeminiVision(base64Image, prompt, AI_PROMPTS.heal);

    if (result.found && result.target) {
      // Cache the result
      this.selectorCache.set(originalSelector, {
        healed: result.alternativeSelectors?.[0] || null,
        visualDesc: result.visualDescription,
        target: result.target,
        lastUsed: Date.now(),
      });

      console.error(`[Heal] Found element at (${result.target.x}, ${result.target.y}): ${result.target.description}`);
    }

    return result;
  }

  async _clickWithHealing(selector, options = {}) {
    const { page } = await this.ensureBrowser();
    const { timeout = CONFIG.selectorTimeoutMs, force = false, description } = options;

    try {
      // Try normal click first
      await page.click(selector, { timeout, force });
      return { clicked: selector, healed: false };
    } catch (error) {
      if (!this.healingEnabled) {
        throw error;
      }

      console.error(`[Heal] Selector failed: ${selector}, attempting healing...`);

      // Try to heal
      const healed = await this._healSelector(selector, description);

      if (healed.found && healed.target) {
        // Click using coordinates
        await humanMove(page, healed.target.x, healed.target.y, this.mousePos);
        await page.mouse.click(healed.target.x, healed.target.y);

        return {
          clicked: selector,
          healed: true,
          healedTo: healed.alternativeSelectors?.[0],
          target: healed.target,
          visualDescription: healed.visualDescription,
        };
      }

      throw new Error(`Self-healing failed for: ${selector}. ${healed.reasoning || ''}`);
    }
  }

  async _fillWithHealing(selector, text, options = {}) {
    const { page } = await this.ensureBrowser();
    const { timeout = CONFIG.selectorTimeoutMs, description } = options;

    try {
      // Try normal fill first
      await page.fill(selector, text, { timeout });
      return { filled: selector, text, healed: false };
    } catch (error) {
      if (!this.healingEnabled) {
        throw error;
      }

      console.error(`[Heal] Selector failed for fill: ${selector}, attempting healing...`);

      // Try to heal
      const healed = await this._healSelector(selector, description || `input field for ${text}`, 'fill');

      if (healed.found && healed.target) {
        // Click to focus, then type
        await humanMove(page, healed.target.x, healed.target.y, this.mousePos);
        await page.mouse.click(healed.target.x, healed.target.y);
        await sleep(100);

        // Clear existing content and type new text
        await page.keyboard.press('Control+a');
        await page.keyboard.type(text, { delay: 30 });

        return {
          filled: selector,
          text,
          healed: true,
          healedTo: healed.alternativeSelectors?.[0],
          target: healed.target,
        };
      }

      throw new Error(`Self-healing failed for fill: ${selector}. ${healed.reasoning || ''}`);
    }
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
              url: { type: 'string', description: 'URL to navigate to' },
              waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle', 'commit'], description: 'Wait condition (default: domcontentloaded)' },
              timeout: { type: 'number', description: 'Timeout in ms' }
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
              selector: { type: 'string', description: 'CSS selector' },
              timeout: { type: 'number', description: 'Custom timeout in ms' },
              force: { type: 'boolean', description: 'Force click (bypass checks)' }
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
        // === Tab Management ===
        {
          name: 'stream_list_tabs',
          description: 'List all open tabs/pages',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'stream_switch_tab',
          description: 'Switch control to another tab by index or title/url matching',
          inputSchema: {
             type: 'object',
             properties: {
                 index: { type: 'number', description: 'Tab index (0-based)' },
                 match: { type: 'string', description: 'String to match in title or URL' }
             }
          }
        },
        // === Resource Optimization ===
        {
            name: 'stream_block_resources',
            description: 'Block resource types (images, fonts) to speed up loading',
            inputSchema: {
                type: 'object',
                properties: {
                    types: { 
                        type: 'array', 
                        items: { type: 'string', enum: ['image', 'font', 'stylesheet', 'media', 'script'] },
                        description: 'Resource types to block'
                    },
                    enable: { type: 'boolean', description: 'Enable or disable blocking (default: true)' }
                },
                required: ['enable']
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
            properties: {
              launch: { type: 'boolean', description: 'If true, launches browser if closed (default: false)' }
            }
          }
        },
        {
          name: 'stream_health',
          description: 'Deep health check of browser and page responsiveness',
          inputSchema: {
            type: 'object',
            properties: {
              repair: { type: 'boolean', description: 'If true, attempt to repair unhealthy state (default: false)' }
            }
          }
        },
        {
          name: 'stream_reset',
          description: 'Close and relaunch persistent browser context (keeps profile on disk)',
          inputSchema: {
            type: 'object',
            properties: {
              keepEvents: { type: 'boolean', description: 'If true, keeps the current event buffer (default: false)' }
            }
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
        // === Video & Evidence ===
        {
          name: 'stream_video',
          description: 'Manage video recording (get current video path, start/stop not supported yet as it is auto-on)',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['get_path', 'save'], description: 'Action' },
              savePath: { type: 'string', description: 'Path to save video to (for save action)' }
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
        },
        {
          name: 'stream_list_profiles',
          description: 'List available Chrome profiles. Use this before launching to let the user choose which profile to use.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stream_set_profile',
          description: 'Set the Chrome profile to use. Call this before launching the browser. Use stream_list_profiles to see available options.',
          inputSchema: {
            type: 'object',
            properties: {
              profile: { type: 'string', description: 'Profile path or name (e.g., "Default", "Profile 2", or full path)' }
            },
            required: ['profile']
          }
        },
        // ========== AI-POWERED TOOLS ==========
        {
          name: 'stream_act',
          description: 'AI-powered action using natural language. Takes a screenshot, analyzes it with Gemini Vision, and executes the action. Example: "click the blue login button", "fill the email field with test@example.com"',
          inputSchema: {
            type: 'object',
            properties: {
              instruction: { type: 'string', description: 'Natural language instruction (e.g., "click the search button", "fill email with john@test.com")' },
              maxRetries: { type: 'number', description: 'Max attempts if action fails (default: 2)' },
              debug: { type: 'boolean', description: 'If true, returns AI reasoning without executing (default: false)' }
            },
            required: ['instruction']
          }
        },
        {
          name: 'stream_extract',
          description: 'AI-powered data extraction. Analyzes the page and extracts structured data based on your schema. Example: extract product prices, form values, table data.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'What to extract (e.g., "extract all product names and prices")' },
              schema: { type: 'object', description: 'Optional JSON schema for the output structure' }
            },
            required: ['prompt']
          }
        },
        {
          name: 'stream_observe',
          description: 'AI-powered page analysis. Describes what is visible on the page, identifies interactive elements, and suggests possible actions.',
          inputSchema: {
            type: 'object',
            properties: {
              focus: { type: 'string', description: 'Optional: focus area (e.g., "navigation", "forms", "errors")' }
            }
          }
        },
        {
          name: 'stream_ai_status',
          description: 'Check AI configuration status and test connectivity',
          inputSchema: {
            type: 'object',
            properties: {
              test: { type: 'boolean', description: 'If true, sends a test request to verify API key (default: false)' }
            }
          }
        },
        // ========== WORKFLOW ENGINE TOOLS ==========
        {
          name: 'stream_workflow_create',
          description: 'Create or update a workflow definition. Workflows are reusable automation sequences with steps, variables, and error handling.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Unique workflow name (e.g., "login-flow", "checkout-test")' },
              description: { type: 'string', description: 'Human-readable description' },
              variables: { type: 'object', description: 'Default variables (e.g., { "email": "test@example.com", "password": "..." })' },
              steps: {
                type: 'array',
                description: 'Array of steps to execute',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Step ID for reference in conditions/gotos' },
                    action: { type: 'string', enum: ['navigate', 'click', 'type', 'fill', 'wait', 'screenshot', 'evaluate', 'act', 'extract', 'observe', 'scroll', 'hover', 'select', 'keyboard', 'mouse', 'sleep', 'set_variable', 'condition'], description: 'Action type' },
                    args: { type: 'object', description: 'Arguments for the action' },
                    onError: { type: 'string', enum: ['stop', 'continue', 'screenshot', 'retry'], description: 'Error handling (default: stop)' },
                    maxRetries: { type: 'number', description: 'Max retries if onError is retry' },
                    description: { type: 'string', description: 'Step description for logging' }
                  },
                  required: ['action']
                }
              },
              save: { type: 'boolean', description: 'Save to disk for persistence (default: true)' }
            },
            required: ['name', 'steps']
          }
        },
        {
          name: 'stream_workflow_run',
          description: 'Execute a workflow by name. Supports variable overrides and starting from specific steps.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Workflow name to execute' },
              variables: { type: 'object', description: 'Override default variables' },
              startFromStep: { type: 'string', description: 'Step ID to start from (for resuming)' },
              stopAtStep: { type: 'string', description: 'Step ID to stop at (for debugging)' },
              dryRun: { type: 'boolean', description: 'If true, only validates steps without executing' }
            },
            required: ['name']
          }
        },
        {
          name: 'stream_workflow_list',
          description: 'List all available workflows',
          inputSchema: {
            type: 'object',
            properties: {
              includeSteps: { type: 'boolean', description: 'Include step details in response' }
            }
          }
        },
        {
          name: 'stream_workflow_get',
          description: 'Get a workflow definition by name',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Workflow name' }
            },
            required: ['name']
          }
        },
        {
          name: 'stream_workflow_delete',
          description: 'Delete a workflow',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Workflow name to delete' }
            },
            required: ['name']
          }
        },
        {
          name: 'stream_workflow_export',
          description: 'Export a workflow as JSON for sharing',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Workflow name' },
              savePath: { type: 'string', description: 'Optional: save to file path' }
            },
            required: ['name']
          }
        },
        {
          name: 'stream_workflow_import',
          description: 'Import a workflow from JSON',
          inputSchema: {
            type: 'object',
            properties: {
              json: { type: 'string', description: 'Workflow JSON string' },
              path: { type: 'string', description: 'Or: path to JSON file' },
              overwrite: { type: 'boolean', description: 'Overwrite if exists (default: false)' }
            }
          }
        },
        // ========== SESSION PERSISTENCE TOOLS ==========
        {
          name: 'stream_session_save',
          description: 'Save current browser session (cookies, localStorage, sessionStorage) for later restoration. Useful for maintaining login state across runs.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Session name (e.g., "mercadopago-logged-in", "google-auth")' }
            },
            required: ['name']
          }
        },
        {
          name: 'stream_session_load',
          description: 'Load a previously saved session. Restores cookies and storage, then reloads the page.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Session name to load' }
            },
            required: ['name']
          }
        },
        {
          name: 'stream_session_list',
          description: 'List all saved sessions with their metadata.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stream_session_delete',
          description: 'Delete a saved session.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Session name to delete' }
            },
            required: ['name']
          }
        },
        // ========== AI PLANNING TOOLS ==========
        {
          name: 'stream_ai_plan',
          description: 'AI creates a step-by-step plan to achieve a high-level goal. Example: "buy the cheapest laptop on Amazon", "login and check my balance". The AI analyzes the current page and generates executable steps.',
          inputSchema: {
            type: 'object',
            properties: {
              goal: { type: 'string', description: 'High-level goal in natural language' },
              context: { type: 'object', description: 'Additional context (e.g., { "email": "user@test.com", "maxPrice": 500 })' }
            },
            required: ['goal']
          }
        },
        {
          name: 'stream_ai_execute_plan',
          description: 'Execute the current plan created by stream_ai_plan. Runs each step sequentially with AI-powered actions.',
          inputSchema: {
            type: 'object',
            properties: {
              stopOnError: { type: 'boolean', description: 'Stop execution if a step fails (default: true)' },
              maxSteps: { type: 'number', description: 'Maximum steps to execute (default: 50)' }
            }
          }
        },
        {
          name: 'stream_ai_plan_status',
          description: 'Get the status of the current plan and execution progress.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        // ========== AI VISUAL ASSERTION TOOLS ==========
        {
          name: 'stream_ai_assert',
          description: 'AI-powered visual assertion. Verifies conditions based on what is visible on the page. Example: "the cart shows 3 items", "user is logged in", "error message is displayed".',
          inputSchema: {
            type: 'object',
            properties: {
              assertion: { type: 'string', description: 'Assertion to verify in natural language' },
              strict: { type: 'boolean', description: 'If true, requires high confidence to pass (default: true)' }
            },
            required: ['assertion']
          }
        },
        // ========== AI SMART WAIT TOOLS ==========
        {
          name: 'stream_ai_wait',
          description: 'AI-powered smart wait. Waits until the page is ready based on visual analysis - detects spinners, loading states, skeleton screens, etc. Much smarter than fixed sleep() calls.',
          inputSchema: {
            type: 'object',
            properties: {
              condition: { type: 'string', description: 'Condition to wait for (default: "page is ready for interaction")' },
              maxWaitMs: { type: 'number', description: 'Maximum wait time in ms (default: 30000)' },
              pollIntervalMs: { type: 'number', description: 'How often to check in ms (default: 1000)' }
            }
          }
        },
        // ========== SELF-HEALING TOOLS ==========
        {
          name: 'stream_healing_status',
          description: 'Get self-healing status and cached selector mappings.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stream_healing_toggle',
          description: 'Enable or disable self-healing selectors.',
          inputSchema: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', description: 'Enable or disable self-healing' }
            },
            required: ['enabled']
          }
        },
        {
          name: 'stream_healing_clear_cache',
          description: 'Clear the selector healing cache.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        // ========== NATURAL LANGUAGE (ENHANCED) ==========
        {
          name: 'stream_do',
          description: 'Execute ANY action using natural language. This is the most powerful tool - it understands complex instructions like "scroll down and click the blue Add to Cart button", "fill the email field with test@example.com and press Enter", "navigate to Amazon and search for laptops under $500".',
          inputSchema: {
            type: 'object',
            properties: {
              instruction: { type: 'string', description: 'Natural language instruction (can be complex multi-step)' },
              verify: { type: 'boolean', description: 'If true, takes screenshot after and verifies the action succeeded (default: false)' }
            },
            required: ['instruction']
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
            if (args?.launch) {
              const { page } = await this.ensureBrowser();
              result = {
                browserOpen: Boolean(this.context),
                pageOpen: Boolean(page) && (typeof page.isClosed !== 'function' || !page.isClosed()),
                pageUrl: page.url(),
                title: await page.title().catch(() => ''),
                eventsInBuffer: this.eventBuffer.length,
                lastEventId: this.lastEventId,
                profilePath: CONFIG.profilePath,
                headless: CONFIG.headless,
                engine: 'patchright (CDP bypass)',
              };
            } else {
              let pageUrl = null;
              let title = '';
              let pageOpen = false;
              let responsive = false;

              try {
                if (this.page && (typeof this.page.isClosed !== 'function' || !this.page.isClosed())) {
                  pageOpen = true;
                  // Proactive health check: try to execute simple JS
                  try {
                      await this.page.evaluate('1+1', { timeout: 1000 });
                      responsive = true;
                  } catch (e) {
                      responsive = false;
                  }

                  if (responsive) {
                      pageUrl = this.page.url();
                      title = await this.page.title().catch(() => '');
                  }
                }
              } catch {
                // ignore
              }

              result = {
                browserOpen: Boolean(this.context),
                pageOpen,
                responsive,
                pageUrl,
                title,
                eventsInBuffer: this.eventBuffer.length,
                lastEventId: this.lastEventId,
                profilePath: CONFIG.profilePath,
                headless: CONFIG.headless,
                engine: 'patchright (CDP bypass)',
              };
            }
            break;
          }

          case 'stream_list_profiles': {
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            const chromeDir = path.join(os.homedir(), '.config/google-chrome');
            const profiles = [];

            // Add dedicated automation profile
            profiles.push({
              name: '🤖 Automatización (dedicado)',
              path: '/home/edu/.patchright-profile',
              description: 'Perfil separado para automatización. No conflicta con Chrome abierto.',
              recommended: true,
              current: CONFIG.profilePath === '/home/edu/.patchright-profile'
            });

            // Scan Chrome profiles
            if (fs.existsSync(chromeDir)) {
              const entries = fs.readdirSync(chromeDir);
              for (const entry of entries) {
                if (entry === 'Default' || entry.startsWith('Profile ')) {
                  const profilePath = path.join(chromeDir, entry);
                  const prefsPath = path.join(profilePath, 'Preferences');

                  let profileName = entry;
                  try {
                    if (fs.existsSync(prefsPath)) {
                      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
                      profileName = prefs?.profile?.name || entry;
                    }
                  } catch {}

                  profiles.push({
                    name: profileName,
                    path: profilePath,
                    description: `Chrome profile: ${entry}`,
                    recommended: false,
                    current: CONFIG.profilePath === profilePath
                  });
                }
              }
            }

            result = {
              profiles,
              currentProfile: CONFIG.profilePath,
              note: '⚠️ Usar perfiles de Chrome requiere que Chrome esté cerrado. El perfil de Automatización es independiente.'
            };
            break;
          }

          case 'stream_set_profile': {
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            let newProfilePath = args.profile;

            // Handle short names like "Default", "Profile 2", "eduardo"
            if (!newProfilePath.startsWith('/')) {
              const chromeDir = path.join(os.homedir(), '.config/google-chrome');

              // Check if it's a directory name
              const directPath = path.join(chromeDir, newProfilePath);
              if (fs.existsSync(directPath)) {
                newProfilePath = directPath;
              } else {
                // Search by profile name
                const entries = fs.readdirSync(chromeDir);
                for (const entry of entries) {
                  if (entry === 'Default' || entry.startsWith('Profile ')) {
                    const profilePath = path.join(chromeDir, entry);
                    const prefsPath = path.join(profilePath, 'Preferences');
                    try {
                      if (fs.existsSync(prefsPath)) {
                        const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
                        if (prefs?.profile?.name?.toLowerCase() === args.profile.toLowerCase()) {
                          newProfilePath = profilePath;
                          break;
                        }
                      }
                    } catch {}
                  }
                }
              }
            }

            // Special case for automation profile
            if (args.profile.toLowerCase().includes('automat') || args.profile.toLowerCase().includes('dedicado')) {
              newProfilePath = '/home/edu/.patchright-profile';
            }

            // Validate path exists or can be created
            if (!fs.existsSync(newProfilePath)) {
              // If it's the automation profile, that's OK - it will be created
              if (newProfilePath !== '/home/edu/.patchright-profile') {
                result = { error: `Profile path not found: ${newProfilePath}` };
                break;
              }
            }

            // Close current browser if open
            if (this.context) {
              await this.closeBrowser();
            }

            // Update config
            CONFIG.profilePath = newProfilePath;

            result = {
              success: true,
              profilePath: newProfilePath,
              message: `Perfil cambiado a: ${newProfilePath}. Usá stream_status con launch:true para iniciar.`
            };
            break;
          }

          case 'stream_health': {
            const health = await this.checkHealth();

            if (!health.healthy && args?.repair) {
              console.error(`[MCP] Health check failed (${health.reason}), attempting repair...`);
              try {
                await this.ensureValidPage();
                const recheck = await this.checkHealth();
                result = {
                  ...recheck,
                  repaired: recheck.healthy,
                  originalReason: health.reason,
                  trackedPages: this.trackedPages.size,
                  eventsInBuffer: this.eventBuffer.length,
                };
              } catch (repairError) {
                result = {
                  healthy: false,
                  reason: health.reason,
                  repaired: false,
                  repairError: repairError.message,
                  trackedPages: this.trackedPages.size,
                  eventsInBuffer: this.eventBuffer.length,
                };
              }
            } else {
              result = {
                ...health,
                trackedPages: this.trackedPages.size,
                eventsInBuffer: this.eventBuffer.length,
                lastHealthCheck: this._lastHealthCheck ? new Date(this._lastHealthCheck).toISOString() : null,
              };
            }
            break;
          }

          case 'stream_reset': {
            await this.closeBrowser({ clearEvents: args?.keepEvents !== true, reason: 'reset' });
            const { page } = await this.ensureBrowser();
            result = {
              reset: true,
              keepEvents: args?.keepEvents === true,
              browserOpen: true,
              pageOpen: true,
              pageUrl: page.url(),
              title: await page.title().catch(() => ''),
              profilePath: CONFIG.profilePath,
              headless: CONFIG.headless,
              engine: 'patchright (CDP bypass)',
            };
            break;
          }

          case 'stream_navigate': {
            validateArgs(args, ['url'], 'stream_navigate');
            validateArgTypes(args, { url: 'string', timeout: 'number' }, 'stream_navigate');

            this.broadcastAction('navigate', { url: args.url, status: 'starting' });

            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              const eventsBefore = this.lastEventId;

              await withRetry(
                async () => {
                  await page.goto(args.url, {
                    waitUntil: args.waitUntil || 'domcontentloaded',
                    timeout: args.timeout || CONFIG.navigationTimeoutMs,
                  });
                },
                { operation: `navigate to ${args.url}`, maxRetries: 2 }
              );

              const title = await page.title().catch(() => '');
              const finalUrl = page.url();

              this.broadcastAction('navigate', { url: finalUrl, title, status: 'completed' });

              return {
                url: finalUrl,
                title,
                eventsTriggered: this.lastEventId - eventsBefore,
                recentEvents: this.getEventsSince(eventsBefore).slice(-5),
              };
            });
            break;
          }

          case 'stream_click': {
            validateArgs(args, ['selector'], 'stream_click');
            validateArgTypes(args, { selector: 'string', timeout: 'number', force: 'boolean' }, 'stream_click');

            this.broadcastAction('click', { selector: args.selector, status: 'starting' });

            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              const eventsBefore = this.lastEventId;

              // 🤖 10/10 STEALTH CLICK with Visual Self-Healing
              try {
                // 1. Try standard selector with visibility check
                const el = await page.waitForSelector(args.selector, {
                    timeout: args.timeout || CONFIG.selectorTimeoutMs,
                    state: 'visible'
                });
                
                await el.scrollIntoViewIfNeeded();
                const box = await el.boundingBox();
                
                if (box) {
                    const targetX = box.x + box.width / 2;
                    const targetY = box.y + box.height / 2;
                    await humanMove(page, targetX, targetY, this.mousePos);
                    await page.mouse.click(targetX, targetY);
                    this.broadcastAction('click', { selector: args.selector, x: Math.round(targetX), y: Math.round(targetY), status: 'completed' });
                } else {
                    await page.click(args.selector, { force: args.force });
                    this.broadcastAction('click', { selector: args.selector, status: 'completed' });
                }

                return {
                    clicked: args.selector,
                    eventsTriggered: this.lastEventId - eventsBefore,
                    recentEvents: this.getEventsSince(eventsBefore).slice(-5),
                };
              } catch (e) {
                 // 🧠 SELF-HEALING FALLBACK: Visual Heuristic
                 console.error(`[Self-Healing] Selector "${args.selector}" failed. Trying visual heuristic...`);
                 
                 const visualTarget = await page.evaluate((sel) => {
                     // Extract readable text from selector (e.g., "button.login" -> "login")
                     const cleanText = sel.replace(/[#\.\[\]]/g, ' ').replace(/text=/i, '').replace(/['"]/g, '').trim().split(/\s+/).pop();
                     if (!cleanText || cleanText.length < 2) return null;

                     const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"], h1, h2, h3'));
                     
                     // 1. Exact match
                     let match = candidates.find(el => 
                         (el.innerText || '').toLowerCase().trim() === cleanText.toLowerCase() ||
                         (el.getAttribute('aria-label') || '').toLowerCase().trim() === cleanText.toLowerCase()
                     );

                     // 2. Partial match if no exact match
                     if (!match) {
                        match = candidates.find(el => 
                            (el.innerText || '').toLowerCase().includes(cleanText.toLowerCase()) ||
                            (el.getAttribute('aria-label') || '').toLowerCase().includes(cleanText.toLowerCase())
                        );
                     }

                     if (match) {
                         const rect = match.getBoundingClientRect();
                         if (rect.width > 0 && rect.height > 0) {
                             return { 
                                 x: rect.left + rect.width / 2, 
                                 y: rect.top + rect.height / 2, 
                                 text: (match.innerText || match.getAttribute('aria-label') || '').substring(0, 30)
                             };
                         }
                     }
                     return null;
                 }, args.selector);

                 if (visualTarget) {
                     console.error(`[Self-Healing] 🎯 Found visual match: "${visualTarget.text}" at ${Math.round(visualTarget.x)}, ${Math.round(visualTarget.y)}`);

                     // Use human move to coordinates
                     await humanMove(page, visualTarget.x, visualTarget.y, this.mousePos);
                     await page.mouse.click(visualTarget.x, visualTarget.y);
                     
                     return {
                        clicked: args.selector,
                        selfHealed: true,
                        healingStrategy: 'visual_text_match',
                        matchedText: visualTarget.text,
                        coords: { x: Math.round(visualTarget.x), y: Math.round(visualTarget.y) },
                        eventsTriggered: this.lastEventId - eventsBefore,
                        recentEvents: this.getEventsSince(eventsBefore).slice(-5),
                     };
                 }
                 
                 // Last resort: standard click (might throw the original error)
                 console.error(`[Self-Healing] Failed to find visual match for "${args.selector}".`);
                 await page.click(args.selector, {
                    timeout: 2000, // Short timeout for final attempt
                    force: args.force || false
                 });

                 // Post-action delay for page to settle
                 await page.waitForTimeout(CONFIG.postActionDelayMs);

                 return {
                    clicked: args.selector,
                    eventsTriggered: this.lastEventId - eventsBefore,
                 };
              }
            });
            break;
          }

          case 'stream_type': {
            validateArgs(args, ['selector', 'text'], 'stream_type');
            validateArgTypes(args, { selector: 'string', text: 'string' }, 'stream_type');

            const shouldRedact = typeof args?.selector === 'string' && /password|\[type\s*=\s*"?password"?\]/i.test(args.selector);

            this.broadcastAction('type', { selector: args.selector, text: shouldRedact ? '[REDACTED]' : args.text.substring(0, 50), status: 'starting' });

            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              const eventsBefore = this.lastEventId;

              await page.fill(args.selector, args.text, { timeout: CONFIG.selectorTimeoutMs });

              this.broadcastAction('type', { selector: args.selector, chars: args.text.length, status: 'completed' });

              return {
                typed: shouldRedact ? '[REDACTED]' : args.text,
                selector: args.selector,
                redacted: shouldRedact,
                eventsTriggered: this.lastEventId - eventsBefore,
              };
            });
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
            result = await this.withPageLock(async () => {
              const { page } = await this.ensureBrowser();

              let snapshot;
              if (page.accessibility && typeof page.accessibility.snapshot === 'function') {
                snapshot = await page.accessibility.snapshot();
              } else {
                const title = await page.title().catch(() => '');
                const keyElements = await page.evaluate(() => {
                  const MAX = 30;
                  const items = [];

                  const getName = (el) => {
                    const ariaLabel = el.getAttribute('aria-label');
                    const placeholder = el.getAttribute('placeholder');
                    const nameAttr = el.getAttribute('name');
                    const text = (el.textContent || '').trim();
                    return (text || placeholder || nameAttr || ariaLabel || '').trim();
                  };

                  const push = (role, el) => {
                    if (items.length >= MAX) return;
                    const name = getName(el);
                    if (!name) return;
                    items.push({ role, name });
                  };

                  document.querySelectorAll('h1,h2,h3,[role="heading"]').forEach(el => push('heading', el));
                  document.querySelectorAll('button,[role="button"]').forEach(el => push('button', el));
                  document.querySelectorAll('a[href],[role="link"]').forEach(el => push('link', el));
                  document.querySelectorAll('input,textarea,[role="textbox"]').forEach(el => push('textbox', el));

                  return items.slice(0, MAX);
                });

                snapshot = {
                  role: 'document',
                  name: title,
                  children: keyElements.map((e) => ({ role: e.role, name: e.name, children: [] })),
                };
              }

              return {
                url: page.url(),
                title: await page.title().catch(() => ''),
                snapshot,
                recentEvents: this.eventBuffer.slice(-10),
                lastEventId: this.lastEventId,
              };
            });
            break;
          }

          case 'stream_screenshot': {
            validateArgTypes(args, { fullPage: 'boolean', compress: 'boolean' }, 'stream_screenshot');

            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              const fsMod = await import('fs');
              const pathMod = await import('path');
              const osMod = await import('os');

              const timestamp = Date.now();
              const shouldCompress = args?.compress !== false;

              const buffer = await page.screenshot({
                fullPage: args?.fullPage || false,
                type: shouldCompress ? 'jpeg' : 'png',
                quality: shouldCompress ? 50 : undefined,
                timeout: CONFIG.screenshotTimeoutMs,
              });

              const ext = shouldCompress ? 'jpg' : 'png';
              const filepath = pathMod.join(osMod.tmpdir(), `screenshot-${timestamp}.${ext}`);
              fsMod.writeFileSync(filepath, buffer);

              return {
                path: filepath,
                mime: shouldCompress ? 'image/jpeg' : 'image/png',
                bytes: buffer.length,
                sizeKB: Math.round(buffer.length / 1024),
                compressed: shouldCompress,
              };
            });
            break;
          }

          case 'stream_evaluate': {
            validateArgs(args, ['script'], 'stream_evaluate');
            validateArgTypes(args, { script: 'string' }, 'stream_evaluate');

            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              const evalResult = await page.evaluate(args.script);
              return { result: evalResult };
            });
            break;
          }

          case 'stream_wait_for': {
            validateArgs(args, ['selector'], 'stream_wait_for');
            validateArgTypes(args, { selector: 'string', timeout: 'number' }, 'stream_wait_for');

            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              const eventsBefore = this.lastEventId;

              await page.waitForSelector(args.selector, {
                timeout: args.timeout || CONFIG.selectorTimeoutMs,
              });

              return {
                found: true,
                selector: args.selector,
                eventsTriggered: this.lastEventId - eventsBefore,
                recentEvents: this.getEventsSince(eventsBefore).slice(-3),
              };
            });
            break;
          }

          case 'stream_list_tabs': {
            const { context, page: currentPage } = await this.ensureBrowser();
            const pages = context.pages();
            const list = await Promise.all(pages.map(async (p, i) => ({
                index: i,
                url: p.url(),
                title: await p.title().catch(() => 'Err'),
                isActive: p === currentPage
            })));
            result = { tabs: list, count: list.length };
            break;
          }

          case 'stream_switch_tab': {
             const { context } = await this.ensureBrowser();
             const pages = context.pages();
             let targetPage = null;
             let method = '';

             if (typeof args.index === 'number') {
                 if (args.index >= 0 && args.index < pages.length) {
                     targetPage = pages[args.index];
                     method = `index ${args.index}`;
                 }
             } else if (args.match) {
                 for (const p of pages) {
                     const url = p.url();
                     const title = await p.title().catch(() => '');
                     if (url.includes(args.match) || title.includes(args.match)) {
                         targetPage = p;
                         method = `match "${args.match}"`;
                         break;
                     }
                 }
             }

             if (targetPage) {
                 this.page = targetPage;
                 await targetPage.bringToFront();
                 await this.setupPageListeners(targetPage); // Ensure listeners are attached to new page
                 // Reset mouse position when switching tabs (mouse context is per-page)
                 this.mousePos = { x: 0, y: 0 };
                 result = { switched: true, method, url: targetPage.url() };
             } else {
                 throw new Error(`Tab not found (count: ${pages.length})`);
             }
             break;
          }

          case 'stream_block_resources': {
              const { context } = await this.ensureBrowser();
              if (args.enable) {
                  const types = args.types || ['image', 'font', 'media'];

                  // Store handler reference for later removal
                  this._resourceBlockHandler = async (route) => {
                    if (types.includes(route.request().resourceType())) {
                      await route.abort();
                    } else {
                      await route.fallback();
                    }
                  };
                  this._blockedResourceTypes = types;

                  await context.route('**/*', this._resourceBlockHandler);
                  result = { blocked: true, types };
              } else {
                  // Only remove our specific handler, preserve other routes
                  if (this._resourceBlockHandler) {
                    await context.unroute('**/*', this._resourceBlockHandler);
                    this._resourceBlockHandler = null;
                    this._blockedResourceTypes = null;
                  }
                  result = { blocked: false };
              }
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
                // Update tracked position
                this.mousePos = { x: args.x, y: args.y };
                break;
              case 'dblclick':
                await page.mouse.dblclick(args.x, args.y, { button: btn });
                this.mousePos = { x: args.x, y: args.y };
                break;
              case 'move':
                await page.mouse.move(args.x, args.y);
                this.mousePos = { x: args.x, y: args.y };
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
            result = { action: args.action, x: args.x, y: args.y, mousePos: this.mousePos };
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
            validateArgs(args, ['selector', 'text'], 'stream_fill');
            validateArgTypes(args, { selector: 'string', text: 'string' }, 'stream_fill');

            const shouldRedact = typeof args?.selector === 'string' && /password|\[type\s*=\s*"?password"?\]/i.test(args.selector);
            result = await this.withPageLock(async () => {
              await this.ensureValidPage();
              const { page } = await this.ensureBrowser();
              await page.fill(args.selector, args.text, { timeout: CONFIG.selectorTimeoutMs });
              return { filled: args.selector, text: shouldRedact ? '[REDACTED]' : args.text, redacted: shouldRedact };
            });
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

          case 'stream_video': {
              const { page } = await this.ensureBrowser();
              const video = page.video();
              if (video) {
                  const currentPath = await video.path();
                  if (args.action === 'save' && args.savePath) {
                      const fs = await import('fs');
                      // Note: Video file is locked until page closes.
                      // We must await page close to save fully, OR copy what we have.
                      // For now, we return the temp path.
                      await video.saveAs(args.savePath); // Playwright handles this even if open
                      result = { saved: args.savePath };
                  } else {
                      result = { path: currentPath, status: 'recording' };
                  }
              } else {
                  result = { error: 'Video recording not enabled or available' };
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

          // ========== AI-POWERED TOOL HANDLERS ==========

          case 'stream_ai_status': {
            const status = {
              provider: AI_CONFIG.provider,
              model: AI_CONFIG.model,
              authMethod: AI_CONFIG.useVertexAI ? 'vertex-ai-service-account' : 'api-key',
              geminiApiKeyConfigured: Boolean(AI_CONFIG.geminiApiKey),
              vertexAIConfigured: AI_CONFIG.useVertexAI,
              gcpProject: AI_CONFIG.useVertexAI ? AI_CONFIG.gcpProject : undefined,
              gcpLocation: AI_CONFIG.useVertexAI ? AI_CONFIG.gcpLocation : undefined,
              openaiConfigured: Boolean(AI_CONFIG.openaiApiKey),
            };

            if (args?.test) {
              try {
                // Simple text-only test (no image required for connectivity test)
                const accessToken = AI_CONFIG.useVertexAI ? await getGoogleAccessToken() : null;

                if (AI_CONFIG.useVertexAI && accessToken) {
                  // For Vertex AI, just verify we can get a token
                  status.testResult = { status: 'ok', tokenLength: accessToken.length };
                  status.apiConnected = true;
                } else if (AI_CONFIG.geminiApiKey) {
                  // For API key, make a simple text request
                  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent?key=${AI_CONFIG.geminiApiKey}`;
                  const testResponse = await fetch(testUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ role: 'user', parts: [{ text: 'Say ok' }] }]
                    })
                  });

                  if (testResponse.ok) {
                    status.testResult = { status: 'ok' };
                    status.apiConnected = true;
                  } else {
                    const errorText = await testResponse.text();
                    status.testResult = { error: errorText };
                    status.apiConnected = false;
                  }
                }
              } catch (e) {
                status.testResult = { error: e.message };
                status.apiConnected = false;
              }
            }

            result = status;
            break;
          }

          case 'stream_act': {
            validateArgs(args, ['instruction'], 'stream_act');

            const maxRetries = args.maxRetries || 2;
            let lastError = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                await this.ensureValidPage();
                const { page } = await this.ensureBrowser();

                // 1. Take screenshot
                const screenshotBuffer = await page.screenshot({
                  type: 'jpeg',
                  quality: 80,
                  fullPage: false,
                });
                const base64Screenshot = screenshotBuffer.toString('base64');

                // 2. Get viewport size for coordinate context
                const viewport = page.viewportSize();
                const contextPrompt = `Screenshot dimensions: ${viewport.width}x${viewport.height} pixels. Coordinates should be within these bounds.`;

                // 3. Call Gemini Vision
                console.error(`[AI] Analyzing: "${args.instruction}" (attempt ${attempt}/${maxRetries})`);
                const aiResponse = await callGeminiVision(
                  base64Screenshot,
                  args.instruction,
                  AI_PROMPTS.act + '\n\n' + contextPrompt
                );

                console.error(`[AI] Response:`, JSON.stringify(aiResponse));

                // Debug mode - return without executing
                if (args.debug) {
                  result = {
                    debug: true,
                    instruction: args.instruction,
                    aiResponse,
                    viewport,
                    wouldExecute: aiResponse.action !== 'none',
                  };
                  break;
                }

                // 4. Validate response
                if (!aiResponse.action || aiResponse.action === 'none') {
                  result = {
                    success: false,
                    reason: aiResponse.reasoning || 'AI could not determine action',
                    aiResponse,
                  };
                  break;
                }

                if (aiResponse.confidence < 0.5) {
                  console.error(`[AI] Low confidence (${aiResponse.confidence}): ${aiResponse.reasoning}`);
                }

                // 5. Execute action
                const { action, target, value } = aiResponse;
                const eventsBefore = this.lastEventId;

                switch (action) {
                  case 'click':
                    if (target?.x && target?.y) {
                      await humanMove(page, target.x, target.y, this.mousePos);
                      await page.mouse.click(target.x, target.y);
                      await sleep(200);
                    }
                    break;

                  case 'fill':
                    if (target?.x && target?.y && value) {
                      await humanMove(page, target.x, target.y, this.mousePos);
                      await page.mouse.click(target.x, target.y);
                      await sleep(100);
                      // Clear existing content and type
                      await page.keyboard.press('Control+a');
                      await page.keyboard.type(value, { delay: 30 });
                    }
                    break;

                  case 'scroll':
                    const scrollAmount = target?.y > viewport.height / 2 ? 300 : -300;
                    await page.mouse.wheel(0, scrollAmount);
                    await sleep(300);
                    break;

                  case 'hover':
                    if (target?.x && target?.y) {
                      await humanMove(page, target.x, target.y, this.mousePos);
                    }
                    break;

                  default:
                    throw new Error(`Unknown AI action: ${action}`);
                }

                result = {
                  success: true,
                  action,
                  target: target?.description || `(${target?.x}, ${target?.y})`,
                  value: action === 'fill' ? value : undefined,
                  confidence: aiResponse.confidence,
                  reasoning: aiResponse.reasoning,
                  eventsTriggered: this.lastEventId - eventsBefore,
                  attempt,
                };
                break;

              } catch (e) {
                lastError = e;
                console.error(`[AI] Attempt ${attempt} failed: ${e.message}`);
                if (attempt === maxRetries) {
                  result = {
                    success: false,
                    error: e.message,
                    attempts: attempt,
                  };
                }
                await sleep(500);
              }
            }
            break;
          }

          case 'stream_extract': {
            validateArgs(args, ['prompt'], 'stream_extract');

            await this.ensureValidPage();
            const { page } = await this.ensureBrowser();

            // Take screenshot
            const screenshotBuffer = await page.screenshot({
              type: 'jpeg',
              quality: 85,
              fullPage: args.fullPage || false,
            });
            const base64Screenshot = screenshotBuffer.toString('base64');

            // Build extraction prompt
            let extractPrompt = AI_PROMPTS.extract;
            if (args.schema) {
              extractPrompt += `\n\nExpected output schema:\n${JSON.stringify(args.schema, null, 2)}`;
            }

            console.error(`[AI] Extracting: "${args.prompt}"`);
            const aiResponse = await callGeminiVision(
              base64Screenshot,
              args.prompt,
              extractPrompt
            );

            result = {
              extracted: true,
              data: aiResponse,
              prompt: args.prompt,
            };
            break;
          }

          case 'stream_observe': {
            await this.ensureValidPage();
            const { page } = await this.ensureBrowser();

            // Take screenshot
            const screenshotBuffer = await page.screenshot({
              type: 'jpeg',
              quality: 80,
              fullPage: false,
            });
            const base64Screenshot = screenshotBuffer.toString('base64');

            const viewport = page.viewportSize();
            const url = page.url();
            const title = await page.title();

            let observePrompt = AI_PROMPTS.observe;
            if (args.focus) {
              observePrompt += `\n\nFocus specifically on: ${args.focus}`;
            }
            observePrompt += `\n\nPage URL: ${url}\nPage Title: ${title}\nViewport: ${viewport.width}x${viewport.height}`;

            console.error(`[AI] Observing page...`);
            const aiResponse = await callGeminiVision(
              base64Screenshot,
              'Describe what you see on this page',
              observePrompt
            );

            result = {
              url,
              title,
              viewport,
              observation: aiResponse,
            };
            break;
          }

          // ========== WORKFLOW ENGINE HANDLERS ==========

          case 'stream_workflow_create': {
            validateArgs(args, ['name', 'steps'], 'stream_workflow_create');

            const workflow = {
              name: args.name,
              description: args.description || '',
              variables: args.variables || {},
              steps: args.steps,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Validate steps
            for (let i = 0; i < workflow.steps.length; i++) {
              const step = workflow.steps[i];
              if (!step.action) {
                throw new Error(`Step ${i + 1} missing 'action' field`);
              }
              // Assign default IDs if not provided
              if (!step.id) {
                step.id = `step_${i + 1}`;
              }
            }

            this.workflows.set(workflow.name, workflow);

            // Save to disk if requested (default: true)
            if (args.save !== false) {
              await this._saveWorkflow(workflow);
            }

            console.error(`[Workflow] Created: ${workflow.name} (${workflow.steps.length} steps)`);

            result = {
              created: workflow.name,
              steps: workflow.steps.length,
              variables: Object.keys(workflow.variables),
            };
            break;
          }

          case 'stream_workflow_run': {
            validateArgs(args, ['name'], 'stream_workflow_run');

            const workflow = this.workflows.get(args.name);
            if (!workflow) {
              throw new Error(`Workflow not found: ${args.name}`);
            }

            const runId = `run_${Date.now()}`;
            const variables = { ...workflow.variables, ...args.variables };
            const runState = {
              runId,
              workflowName: args.name,
              startedAt: new Date().toISOString(),
              status: 'running',
              currentStep: 0,
              results: [],
              errors: [],
              lastExtract: null,
            };

            this.workflowRuns.set(runId, runState);
            console.error(`[Workflow] Starting: ${args.name} (${runId})`);

            // Dry run mode
            if (args.dryRun) {
              result = {
                dryRun: true,
                workflow: args.name,
                steps: workflow.steps.map((s, i) => ({
                  index: i,
                  id: s.id,
                  action: s.action,
                  description: s.description,
                  argsWouldBe: this._interpolateVariables(s.args || {}, variables),
                })),
                variables,
              };
              break;
            }

            // Find start step if specified
            let startIndex = 0;
            if (args.startFromStep) {
              const idx = workflow.steps.findIndex(s => s.id === args.startFromStep);
              if (idx === -1) throw new Error(`Step not found: ${args.startFromStep}`);
              startIndex = idx;
            }

            // Execute steps
            let stopIndex = workflow.steps.length;
            if (args.stopAtStep) {
              const idx = workflow.steps.findIndex(s => s.id === args.stopAtStep);
              if (idx !== -1) stopIndex = idx + 1;
            }

            this.broadcastWorkflowStatus('running', args.name, { index: 0, total: workflow.steps.length });

            for (let i = startIndex; i < stopIndex; i++) {
              const step = workflow.steps[i];
              runState.currentStep = i;

              console.error(`[Workflow] Step ${i + 1}/${workflow.steps.length}: ${step.action} ${step.description || step.id || ''}`);
              this.broadcastWorkflowStatus('running', args.name, {
                index: i + 1,
                total: workflow.steps.length,
                stepId: step.id,
                action: step.action,
                description: step.description
              });

              let stepResult;
              let retries = 0;
              const maxRetries = step.maxRetries || 1;

              while (retries < maxRetries) {
                try {
                  stepResult = await this._executeWorkflowStep(step, variables, runState);
                  runState.results.push({
                    stepId: step.id,
                    index: i,
                    action: step.action,
                    success: stepResult.success !== false,
                    result: stepResult,
                    timestamp: new Date().toISOString(),
                  });

                  // Handle condition jumps
                  if (step.action === 'condition' && stepResult.nextStep) {
                    const jumpIdx = workflow.steps.findIndex(s => s.id === stepResult.nextStep);
                    if (jumpIdx !== -1) {
                      i = jumpIdx - 1; // -1 because loop will increment
                    }
                  }

                  break; // Success, exit retry loop
                } catch (error) {
                  retries++;
                  console.error(`[Workflow] Step ${i + 1} error (attempt ${retries}/${maxRetries}): ${error.message}`);

                  if (retries >= maxRetries) {
                    const errorInfo = {
                      stepId: step.id,
                      index: i,
                      action: step.action,
                      error: error.message,
                      timestamp: new Date().toISOString(),
                    };
                    runState.errors.push(errorInfo);

                    // Handle error based on onError setting
                    const onError = step.onError || 'stop';

                    if (onError === 'screenshot') {
                      try {
                        const { page } = await this.ensureBrowser();
                        const errScreenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
                        errorInfo.screenshot = errScreenshot.toString('base64').substring(0, 100) + '...(truncated)';
                      } catch (e) { /* ignore */ }
                    }

                    if (onError === 'stop') {
                      runState.status = 'failed';
                      runState.failedAt = new Date().toISOString();
                      throw new Error(`Workflow failed at step ${i + 1} (${step.id}): ${error.message}`);
                    }
                    // onError === 'continue' - just continue to next step
                  }
                }
              }
            }

            runState.status = 'completed';
            runState.completedAt = new Date().toISOString();

            console.error(`[Workflow] Completed: ${args.name}`);
            this.broadcastWorkflowStatus('completed', args.name, { stepsExecuted: runState.results.length });

            result = {
              runId,
              workflow: args.name,
              status: runState.status,
              stepsExecuted: runState.results.length,
              errors: runState.errors.length,
              duration: Date.now() - new Date(runState.startedAt).getTime(),
              results: runState.results.slice(-5), // Last 5 results
              variables: Object.keys(variables),
            };
            break;
          }

          case 'stream_workflow_list': {
            const workflows = Array.from(this.workflows.entries()).map(([name, wf]) => {
              const info = {
                name,
                description: wf.description,
                stepsCount: wf.steps.length,
                variables: Object.keys(wf.variables),
                createdAt: wf.createdAt,
                updatedAt: wf.updatedAt,
              };

              if (args.includeSteps) {
                info.steps = wf.steps.map(s => ({
                  id: s.id,
                  action: s.action,
                  description: s.description,
                }));
              }

              return info;
            });

            result = {
              count: workflows.length,
              workflows,
            };
            break;
          }

          case 'stream_workflow_get': {
            validateArgs(args, ['name'], 'stream_workflow_get');

            const workflow = this.workflows.get(args.name);
            if (!workflow) {
              throw new Error(`Workflow not found: ${args.name}`);
            }

            result = workflow;
            break;
          }

          case 'stream_workflow_delete': {
            validateArgs(args, ['name'], 'stream_workflow_delete');

            if (!this.workflows.has(args.name)) {
              throw new Error(`Workflow not found: ${args.name}`);
            }

            this.workflows.delete(args.name);

            // Delete from disk
            try {
              const fs = await import('fs');
              const path = await import('path');
              const filename = args.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
              const filepath = path.join(this.workflowsPath, filename);
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }
            } catch (e) { /* ignore */ }

            console.error(`[Workflow] Deleted: ${args.name}`);

            result = { deleted: args.name };
            break;
          }

          case 'stream_workflow_export': {
            validateArgs(args, ['name'], 'stream_workflow_export');

            const workflow = this.workflows.get(args.name);
            if (!workflow) {
              throw new Error(`Workflow not found: ${args.name}`);
            }

            const json = JSON.stringify(workflow, null, 2);

            if (args.savePath) {
              const fs = await import('fs');
              fs.writeFileSync(args.savePath, json);
              result = { exported: args.name, savedTo: args.savePath };
            } else {
              result = { exported: args.name, json };
            }
            break;
          }

          case 'stream_workflow_import': {
            let workflow;

            if (args.path) {
              const fs = await import('fs');
              const content = fs.readFileSync(args.path, 'utf-8');
              workflow = JSON.parse(content);
            } else if (args.json) {
              workflow = JSON.parse(args.json);
            } else {
              throw new Error('Must provide json or path');
            }

            if (!workflow.name || !workflow.steps) {
              throw new Error('Invalid workflow: missing name or steps');
            }

            if (this.workflows.has(workflow.name) && !args.overwrite) {
              throw new Error(`Workflow "${workflow.name}" already exists. Use overwrite: true to replace.`);
            }

            workflow.updatedAt = new Date().toISOString();
            if (!workflow.createdAt) workflow.createdAt = workflow.updatedAt;

            this.workflows.set(workflow.name, workflow);
            await this._saveWorkflow(workflow);

            console.error(`[Workflow] Imported: ${workflow.name}`);

            result = {
              imported: workflow.name,
              steps: workflow.steps.length,
              variables: Object.keys(workflow.variables || {}),
            };
            break;
          }

          // ========== SESSION PERSISTENCE HANDLERS ==========

          case 'stream_session_save': {
            validateArgs(args, ['name'], 'stream_session_save');
            result = await this._saveSession(args.name);
            break;
          }

          case 'stream_session_load': {
            validateArgs(args, ['name'], 'stream_session_load');
            result = await this._loadSession(args.name);
            break;
          }

          case 'stream_session_list': {
            const sessions = await this._listSessions();
            result = {
              sessions,
              count: sessions.length,
              currentSession: this.currentSession,
            };
            break;
          }

          case 'stream_session_delete': {
            validateArgs(args, ['name'], 'stream_session_delete');
            result = await this._deleteSession(args.name);
            break;
          }

          // ========== AI PLANNING HANDLERS ==========

          case 'stream_ai_plan': {
            validateArgs(args, ['goal'], 'stream_ai_plan');
            result = await this._aiPlan(args.goal, args.context || {});
            break;
          }

          case 'stream_ai_execute_plan': {
            result = await this._aiExecutePlan({
              stopOnError: args.stopOnError !== false,
              maxSteps: args.maxSteps || 50,
            });
            break;
          }

          case 'stream_ai_plan_status': {
            if (!this.currentPlan) {
              result = { status: 'no_plan', message: 'No plan created. Use stream_ai_plan first.' };
            } else {
              result = {
                goal: this.currentPlan.goal,
                status: this.currentPlan.status,
                totalSteps: this.currentPlan.plan?.steps?.length || 0,
                currentStep: this.currentPlan.currentStep,
                completedSteps: this.currentPlan.results?.filter(r => r.success).length || 0,
                failedSteps: this.currentPlan.results?.filter(r => !r.success).length || 0,
                createdAt: this.currentPlan.createdAt,
                results: this.currentPlan.results,
              };
            }
            break;
          }

          // ========== AI VISUAL ASSERTION HANDLERS ==========

          case 'stream_ai_assert': {
            validateArgs(args, ['assertion'], 'stream_ai_assert');
            const assertResult = await this._aiAssert(args.assertion);

            // Apply strict mode (default true)
            const strict = args.strict !== false;
            if (strict && assertResult.confidence < 0.7) {
              assertResult.passed = false;
              assertResult.reason = `Confidence too low (${Math.round(assertResult.confidence * 100)}%) for strict mode`;
            }

            result = assertResult;
            break;
          }

          // ========== AI SMART WAIT HANDLERS ==========

          case 'stream_ai_wait': {
            result = await this._aiSmartWait(
              args.condition || 'page is ready for interaction',
              {
                maxWaitMs: args.maxWaitMs || 30000,
                pollIntervalMs: args.pollIntervalMs || 1000,
              }
            );
            break;
          }

          // ========== SELF-HEALING HANDLERS ==========

          case 'stream_healing_status': {
            const cached = [];
            for (const [selector, data] of this.selectorCache) {
              cached.push({
                original: selector,
                healed: data.healed,
                visualDesc: data.visualDesc,
                lastUsed: new Date(data.lastUsed).toISOString(),
              });
            }
            result = {
              enabled: this.healingEnabled,
              cachedSelectors: cached.length,
              cache: cached,
            };
            break;
          }

          case 'stream_healing_toggle': {
            validateArgs(args, ['enabled'], 'stream_healing_toggle');
            this.healingEnabled = Boolean(args.enabled);
            result = {
              enabled: this.healingEnabled,
              message: `Self-healing ${this.healingEnabled ? 'enabled' : 'disabled'}`,
            };
            break;
          }

          case 'stream_healing_clear_cache': {
            const count = this.selectorCache.size;
            this.selectorCache.clear();
            result = {
              cleared: count,
              message: `Cleared ${count} cached selectors`,
            };
            break;
          }

          // ========== NATURAL LANGUAGE (ENHANCED) HANDLER ==========

          case 'stream_do': {
            validateArgs(args, ['instruction'], 'stream_do');
            const { page } = await this.ensureBrowser();

            // Take screenshot for AI analysis
            const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
            const base64Image = screenshotBuffer.toString('base64');

            const pageInfo = {
              url: page.url(),
              title: await page.title().catch(() => ''),
            };

            // Parse complex instruction using AI
            const parsePrompt = `You are a browser automation parser. Convert the natural language instruction into a sequence of actions.

Current page: ${pageInfo.url}
Title: ${pageInfo.title}

Instruction: ${args.instruction}

Respond with JSON:
{
  "actions": [
    {
      "type": "navigate|click|fill|type|scroll|wait|assert",
      "target": { "x": <x>, "y": <y>, "description": "<what>" },
      "value": "<for fill/type>",
      "url": "<for navigate>",
      "direction": "<for scroll>",
      "assertion": "<for assert>"
    }
  ],
  "reasoning": "<why these actions>"
}

Rules:
- Break complex instructions into atomic actions
- Provide precise coordinates for click/fill targets
- If navigation is needed, include it first
- Use scroll if content might be below the fold`;

            const parsed = await callGeminiVision(base64Image, parsePrompt, '');

            const results = [];

            for (const action of (parsed.actions || [])) {
              try {
                let actionResult;

                switch (action.type) {
                  case 'navigate':
                    actionResult = await this._executeTool('stream_navigate', { url: action.url });
                    break;

                  case 'click':
                    if (action.target?.x && action.target?.y) {
                      await humanMove(page, action.target.x, action.target.y, this.mousePos);
                      await page.mouse.click(action.target.x, action.target.y);
                      actionResult = { clicked: action.target.description, coords: action.target };
                    }
                    break;

                  case 'fill':
                  case 'type':
                    if (action.target?.x && action.target?.y) {
                      await humanMove(page, action.target.x, action.target.y, this.mousePos);
                      await page.mouse.click(action.target.x, action.target.y);
                      await sleep(100);
                      if (action.type === 'fill') {
                        await page.keyboard.press('Control+a');
                      }
                      await page.keyboard.type(action.value || '', { delay: 30 });
                      actionResult = { typed: action.value, target: action.target.description };
                    }
                    break;

                  case 'scroll':
                    const scrollAmount = 500;
                    if (action.direction === 'down') {
                      await page.mouse.wheel(0, scrollAmount);
                    } else if (action.direction === 'up') {
                      await page.mouse.wheel(0, -scrollAmount);
                    }
                    actionResult = { scrolled: action.direction };
                    break;

                  case 'wait':
                    actionResult = await this._aiSmartWait(action.condition || 'page ready');
                    break;

                  case 'assert':
                    actionResult = await this._aiAssert(action.assertion);
                    break;
                }

                results.push({ action: action.type, success: true, result: actionResult });

                // Brief pause between actions
                await sleep(300);

              } catch (e) {
                results.push({ action: action.type, success: false, error: e.message });
              }
            }

            // Verify if requested
            let verification = null;
            if (args.verify) {
              await sleep(500);
              verification = await this._aiAssert(`The instruction "${args.instruction}" was successfully completed`);
            }

            this.broadcastAction('do', {
              instruction: args.instruction,
              actionsExecuted: results.length,
              success: results.every(r => r.success),
            });

            result = {
              instruction: args.instruction,
              actionsPlanned: parsed.actions?.length || 0,
              actionsExecuted: results.length,
              results,
              verification,
              reasoning: parsed.reasoning,
            };
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const elapsed = Date.now() - startTime;
        const formatType = name.replace('stream_', '');

        if (formatType === 'screenshot') {
          return {
            content: [
              {
                type: 'text',
                text: formatCompact(result, formatType) + `\n⏱️ ${elapsed}ms`,
              },
              {
                type: 'text',
                text: JSON.stringify({ tool: name, ...result }),
              },
            ],
          };
        }

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

// Graceful shutdown with timeout
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.error(`[MCP] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  console.error(`[MCP] Received ${signal}, initiating graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('[MCP] Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 15000); // 15 second max shutdown time

  try {
    await mcp.closeBrowser({ reason: signal });
    clearTimeout(shutdownTimeout);
    console.error('[MCP] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error(`[MCP] Shutdown error: ${error.message}`);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error(`[MCP] Uncaught exception: ${error.message}`);
  console.error(error.stack);
  await gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[MCP] Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});
