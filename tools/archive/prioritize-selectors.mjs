#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const infile = path.resolve('tests/extracted-selectors.json');
const outfile = path.resolve('tests/selector-candidates.prioritized.json');

if (!fs.existsSync(infile)) {
  console.error('Input file not found:', infile);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(infile, 'utf-8'));

// Flatten candidates with source URL
const all = [];
for (const page of raw) {
  for (const c of page.candidates || []) {
    all.push({ url: page.url, ...c });
  }
}

// Score function: prefer data-e2e, id, role, ariaLabel, then class, then tag, then text length
function score(c) {
  let s = 0;
  if (c.dataE2e) s += 1000;
  if (c.id) s += 800;
  if (c.role) s += 600;
  if (c.ariaLabel) s += 400;
  if (c.classes) s += 200;
  if (c.tag) s += 50;
  const textLen = (c.text||'').length;
  s += Math.min(100, textLen);
  return s;
}

// Deduplicate by candidate string; keep highest score
const map = new Map();
for (const c of all) {
  const key = c.candidate || [c.tag, c.id, c.classes, c.dataE2e].filter(Boolean).join('|');
  const s = score(c);
  if (!map.has(key) || (map.get(key).score < s)) {
    map.set(key, { ...c, score: s });
  }
}

const list = Array.from(map.values()).sort((a,b) => b.score - a.score);

fs.writeFileSync(outfile, JSON.stringify(list, null, 2), 'utf-8');
console.log('Wrote', outfile, 'with', list.length, 'unique candidates');

// Also print top 40 to stdout
console.log('Top 40 candidates:');
for (let i=0;i<Math.min(40, list.length); i++) {
  const it = list[i];
  console.log(i+1, it.candidate, 'score=', it.score, 'url=', it.url, it.sampleText ? '-> '+it.sampleText.replace(/\n/g,' ') : '');
}
