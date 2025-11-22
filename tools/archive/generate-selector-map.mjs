#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const extractedFile = path.resolve('tests/extracted-selectors.json');
const prioritizedFile = path.resolve('tests/selector-candidates.prioritized.json');
const outFile = path.resolve('tests/selector-map.json');
const TOP_N = Number(process.env.TOP_N) || 12;

if (!fs.existsSync(extractedFile)) {
  console.error('Missing', extractedFile);
  process.exit(2);
}

const extracted = JSON.parse(fs.readFileSync(extractedFile, 'utf-8'));
const prioritized = fs.existsSync(prioritizedFile) ? JSON.parse(fs.readFileSync(prioritizedFile, 'utf-8')) : null;

// Build map by url -> candidates
const byUrl = new Map();
for (const page of extracted) {
  byUrl.set(page.url, page.candidates || []);
}

const map = {};

for (const [url, candidates] of byUrl.entries()) {
  // Sort candidates by presence in prioritized list (if available) then heuristics
  let sorted = candidates.slice();
  if (prioritized) {
    const priIndex = new Map(prioritized.map((p, i) => [p.candidate, i]));
    sorted.sort((a,b) => {
      const ia = priIndex.has(a.candidate) ? priIndex.get(a.candidate) : Number.MAX_SAFE_INTEGER;
      const ib = priIndex.has(b.candidate) ? priIndex.get(b.candidate) : Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      // fallback: prefer data-e2e, id, then class
      if (!!a.dataE2e !== !!b.dataE2e) return !!b.dataE2e - !!a.dataE2e;
      if (!!a.id !== !!b.id) return !!b.id - !!a.id;
      return (b.classes ? 1 : 0) - (a.classes ? 1 : 0);
    });
  } else {
    sorted.sort((a,b) => (!!b.dataE2e - !!a.dataE2e) || (!!b.id - !!a.id) || ((b.classes?1:0)-(a.classes?1:0)) );
  }

  const top = sorted.slice(0, TOP_N);

  // Create keys: prefer semantic id or data-e2e; otherwise generate a friendly key
  const obj = {};
  for (const c of top) {
    let key = null;
    if (c.dataE2e) key = c.dataE2e.replace(/[^\w\-]/g, '_');
    else if (c.id) key = c.id.replace(/[^\w\-]/g, '_');
    else if (c.role) key = `${c.tag}_${c.role}`;
    else if (c.classes) key = `${c.tag}_${String(c.classes).split(/\s+/)[0]}`;
    else key = `${c.tag}_auto_${Math.random().toString(36).slice(2,7)}`;

    // ensure unique key per page
    let base = key;
    let i=1;
    while (obj[key]) { key = `${base}_${i++}`; }

    obj[key] = { selector: c.candidate, sampleText: c.sampleText || c.text || '', url };
  }

  // Use a short page key derived from URL path
  const urlKey = url.replace(/^https?:\/\//, '').replace(/[\/\.:]/g, '_');
  map[urlKey] = { url, selectors: obj };
}

fs.writeFileSync(outFile, JSON.stringify(map, null, 2), 'utf-8');
console.log('Wrote', outFile);
