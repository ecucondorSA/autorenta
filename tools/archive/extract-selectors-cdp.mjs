#!/usr/bin/env node
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { chromium } from 'playwright';

// Usage:
// WS endpoint can be provided via WS_ENDPOINT or the script will query http://127.0.0.1:9222/json/version
const WS = process.env.WS_ENDPOINT || null;
const baseHost = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const ROUTES = (process.env.EXTRACT_ROUTES || '/').split(',').map(r=>r.trim()).filter(Boolean);

async function resolveWsEndpoint() {
  if (WS) return WS;
  try {
    const info = await (await fetch('http://127.0.0.1:9222/json/version')).json();
    if (info && info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl;
  } catch (e) {
    console.error('Could not fetch ws endpoint from 127.0.0.1:9222:', e.message || e);
  }
  throw new Error('No ws endpoint available. Provide WS_ENDPOINT env var or run Chrome with --remote-debugging-port=9222');
}

async function extractFromPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' }).catch(e => console.warn('nav', e.message || e));
  return await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('body *'));
    const out = [];
    for (const el of els) {
      try {
        const dataE2e = el.getAttribute && (el.getAttribute('data-e2e') || el.getAttribute('data-testid') || el.getAttribute('data-test'));
        const id = el.id || null;
        const role = el.getAttribute && el.getAttribute('role');
        const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
        const text = (el.textContent || '').trim().slice(0,200);
        const classes = el.className || null;
        const tag = el.tagName ? el.tagName.toLowerCase() : null;
        if (dataE2e || id || role || (text && text.length>0) || classes) {
          out.push({ tag, id, classes, dataE2e, role, ariaLabel, text, candidate: dataE2e ? `[data-e2e="${dataE2e}"]` : (id?`#${id}`:(role?`${tag}[role="${role}"]`:(classes?`${tag}.${String(classes).split(/\s+/)[0]}`:tag))) });
        }
      } catch (e) {
        // ignore
      }
    }
    return out;
  });
}

async function main() {
  const ws = await resolveWsEndpoint();
  console.log('Connecting to CDP', ws);
  const browser = await chromium.connectOverCDP(ws);
  const contexts = browser.contexts();
  // if no contexts, create new
  const context = contexts.length ? contexts[0] : await browser.newContext();
  const page = context.pages().length ? context.pages()[0] : await context.newPage();

  const pagesToCrawl = ROUTES.map(r => (r.startsWith('http')? r : `${baseHost.replace(/\/$/,'')}${r.startsWith('/')? r : '/'+r}`));

  const out = [];
  for (const url of pagesToCrawl) {
    console.log('CDP crawling', url);
    const candidates = await extractFromPage(page, url).catch(e => { console.error(e); return []; });
    out.push({ url, candidates });
  }

  const folder = path.resolve('tests'); if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'extracted-selectors.cdp.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf-8');
  console.log('Wrote', file);
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
