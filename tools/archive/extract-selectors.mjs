#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

// Usage:
// PLAYWRIGHT_BASE_URL=http://localhost:4200 node scripts/extract-selectors.mjs

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200';
const ROUTES = (process.env.EXTRACT_ROUTES || '/').split(',').map(r => r.trim()).filter(Boolean);
const pagesToCrawl = ROUTES.length ? ROUTES.map(r => (r.startsWith('http') ? r : `${BASE.replace(/\/$/, '')}${r.startsWith('/') ? r : '/'+r}`)) : [BASE];

function pickFirstClass(classes) {
  if (!classes) return null;
  const parts = String(classes).trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[0] : null;
}

function cleanText(t) {
  if (!t) return '';
  return t.replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function extractFromPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' }).catch(e => {
    // continue even if navigation fails
    console.warn('Navigation warning for', url, e.message || e);
  });

  // Evaluate in page context
  const items = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('body *'));
    const out = [];
    for (const el of els) {
      try {
        const dataE2e = el.getAttribute && (el.getAttribute('data-e2e') || el.getAttribute('data-testid') || el.getAttribute('data-test'));
        const id = el.id || null;
        const role = el.getAttribute && el.getAttribute('role');
        const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
        const text = (el.textContent || '').trim().slice(0, 200);
        const classes = el.className || null;
        const tag = el.tagName ? el.tagName.toLowerCase() : null;

        // Only record elements that are potentially meaningful
        if (dataE2e || id || role || (text && text.length > 0) || classes) {
          out.push({
            tag,
            id,
            classes,
            dataE2e,
            role,
            ariaLabel,
            text: text ? text.replace(/\s+/g,' ').trim().slice(0,120) : ''
          });
        }
      } catch (e) {
        // ignore
      }
    }
    return out;
  });

  // Map to candidates
  const processed = items.map(it => {
    const candidate = it.dataE2e ? `[data-e2e="${it.dataE2e}"]` : (it.id ? `#${it.id}` : (it.role ? `${it.tag}[role="${it.role}"]` : (it.classes ? `${it.tag}.${String(it.classes).split(/\s+/)[0]}` : it.tag)));
    return { ...it, candidate, sampleText: (it.text||'').slice(0,80) };
  });

  return { url, candidates: processed };
}

async function main() {
  const out = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const url of pagesToCrawl) {
    console.log('Crawling', url);
    const data = await extractFromPage(page, url).catch(err => {
      console.error('Error extracting', url, err.message || err);
      return { url, candidates: [] };
    });
    out.push(data);
  }

  await browser.close();

  const folder = path.resolve('tests');
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'extracted-selectors.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf-8');
  console.log('Wrote', file);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
