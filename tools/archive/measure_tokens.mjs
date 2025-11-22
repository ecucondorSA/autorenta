// Mide tokens usando tiktoken para JSON vs TOON (usa la misma heurística de json_to_toon)
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { encoding_for_model } from 'tiktoken';
function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function stringifyValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.replace(/\n/g, ' ');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
function toTOON(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
  if (obj.length > 0 && obj.every(isObject)) {
  const keys = Array.from(new Set(obj.flatMap(o => Object.keys(o))));
  let out = `${pad}count: ${obj.length}\n`;
  out += `${pad}fields: ${keys.join(' | ')}\n`;
  out += `${pad}rows:\n`;
  for (const row of obj) {
  const values = keys.map(k => stringifyValue(row[k]));
  out += `${pad}  - ${values.join(' | ')}\n`;
  }
  return out;
  }
  if (isObject(obj)) {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
  if (isObject(v) || Array.isArray(v)) {
          out += `${pad}${k}:\n` + toTOON(v, indent + 1);
  } else {
          out += `${pad}${k}: ${stringifyValue(v)}\n`;
  }
  }
  return out;
  }
  return `${pad}${stringifyValue(obj)}\n`;
}
async function main() {
  // CLI usage examples:
  //  node tools/measure_tokens.mjs "scripts/samples/**/*.json" "tests/**/*.json" --out=report.csv --exclude=node_modules
  const argv = process.argv.slice(2);
  const patterns = [];
  let outPath = null;
  const excludes = [];
  for (const a of argv) {
  if (a.startsWith('--out=')) outPath = a.split('=')[1];
  else if (a.startsWith('--exclude=')) excludes.push(a.split('=')[1]);
  else patterns.push(a);
  }
  if (!patterns.length) patterns.push('scripts/samples/*.json');
  // expand globs, dedupe
  const fileSet = new Set();
  for (const p of patterns) {
  const matched = await glob(p, { nodir: true });
  for (const f of matched) {
  // apply excludes (simple substring match against exclusion token)
  let skip = false;
  for (const ex of excludes) if (ex && f.includes(ex)) skip = true;
  if (!skip) fileSet.add(f);
  }
  }
  const files = Array.from(fileSet).sort();
  if (!files.length) {
  console.error('No files matched patterns', patterns); process.exit(1);
  }
  // use gpt-3.5-turbo encoding as baseline
  const enc = encoding_for_model('gpt-3.5-turbo');
  let totalJsonTokens = 0, totalToonTokens = 0;
  const rows = [];
  for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', f); continue; }
  const toon = toTOON(parsed);
  const jTokens = enc.encode(raw).length;
  const tTokens = enc.encode(toon).length;
  totalJsonTokens += jTokens; totalToonTokens += tTokens;
  const saved = Math.round((1 - tTokens / jTokens) * 10000) / 100;
  console.log(`File: ${f}`);
  console.log(`  JSON chars: ${Buffer.byteLength(raw,'utf8')} bytes, tokens: ${jTokens}`);
  console.log(`  TOON chars: ${Buffer.byteLength(toon,'utf8')} bytes, tokens: ${tTokens}`);
  console.log(`  Savings: ${saved}%\n`);
  rows.push({ file: f, json_bytes: Buffer.byteLength(raw,'utf8'), json_tokens: jTokens, toon_bytes: Buffer.byteLength(toon,'utf8'), toon_tokens: tTokens, saved_percent: saved });
  }
  const totalSaved = Math.round((1 - totalToonTokens / totalJsonTokens) * 10000) / 100;
  console.log('--- Summary ---');
  console.log('Total JSON tokens:', totalJsonTokens);
  console.log('Total TOON tokens:', totalToonTokens);
  console.log('Total savings in tokens:', totalSaved + '%');
  if (outPath) {
  // write CSV
  const header = 'file,json_bytes,json_tokens,toon_bytes,toon_tokens,saved_percent\n';
  const lines = rows.map(r => `${r.file},${r.json_bytes},${r.json_tokens},${r.toon_bytes},${r.toon_tokens},${r.saved_percent}`).join('\n');
  fs.writeFileSync(outPath, header + lines, 'utf8');
  console.log('Wrote report to', outPath);
  }
}

main().catch(e => { console.error(e); process.exit(2); });
// Mide tokens usando tiktoken para JSON vs TOON (usa la misma heurística de json_to_toon)
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { encoding_for_model } from 'tiktoken';

function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function stringifyValue(v) {
  #!/usr/bin/env node
  // Mide tokens usando tiktoken para JSON vs TOON (usa la misma heurística de json_to_toon)
  import fs from 'fs';
  import path from 'path';
  import { glob } from 'glob';
  import { encoding_for_model } from 'tiktoken';

  function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function stringifyValue(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v.replace(/\n/g, ' ');
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  function toTOON(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj.every(isObject)) {
        const keys = Array.from(new Set(obj.flatMap(o => Object.keys(o))));
        let out = `${pad}count: ${obj.length}\n`;
        out += `${pad}fields: ${keys.join(' | ')}\n`;
        out += `${pad}rows:\n`;
        for (const row of obj) {
          const values = keys.map(k => stringifyValue(row[k]));
          out += `${pad}  - ${values.join(' | ')}\n`;
        }
        return out;
      }
      let out = `${pad}count: ${obj.length}\n${pad}items:\n`;
      for (const item of obj) out += toTOON(item, indent + 1);
      return out;
    }
    if (isObject(obj)) {
      let out = '';
      for (const [k, v] of Object.entries(obj)) {
        if (isObject(v) || Array.isArray(v)) {
          out += `${pad}${k}:\n` + toTOON(v, indent + 1);
        } else {
          out += `${pad}${k}: ${stringifyValue(v)}\n`;
        }
      }
      return out;
    }
    return `${pad}${stringifyValue(obj)}\n`;
  }

  async function main() {
    // CLI usage examples:
    //  node tools/measure_tokens.mjs "scripts/samples/**/*.json" "tests/**/*.json" --out=report.csv --exclude=node_modules
    const argv = process.argv.slice(2);
    const patterns = [];
    let outPath = null;
    const excludes = [];

    for (const a of argv) {
      if (a.startsWith('--out=')) outPath = a.split('=')[1];
      else if (a.startsWith('--exclude=')) excludes.push(a.split('=')[1]);
      else patterns.push(a);
    }

    if (!patterns.length) patterns.push('scripts/samples/*.json');

    // expand globs, dedupe
    const fileSet = new Set();
    for (const p of patterns) {
      const matched = await glob(p, { nodir: true });
      for (const f of matched) {
        // apply excludes (simple substring match against exclusion token)
        let skip = false;
        for (const ex of excludes) if (ex && f.includes(ex)) skip = true;
        if (!skip) fileSet.add(f);
      }
    }

    const files = Array.from(fileSet).sort();
    if (!files.length) {
      console.error('No files matched patterns', patterns); process.exit(1);
    }

    // use gpt-3.5-turbo encoding as baseline
    const enc = encoding_for_model('gpt-3.5-turbo');

    let totalJsonTokens = 0, totalToonTokens = 0;
    const rows = [];

    for (const f of files) {
      const raw = fs.readFileSync(f, 'utf8');
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', f); continue; }
      const toon = toTOON(parsed);
      const jTokens = enc.encode(raw).length;
      const tTokens = enc.encode(toon).length;
      totalJsonTokens += jTokens; totalToonTokens += tTokens;
      const saved = Math.round((1 - tTokens / jTokens) * 10000) / 100;
      console.log(`File: ${f}`);
      console.log(`  JSON chars: ${Buffer.byteLength(raw,'utf8')} bytes, tokens: ${jTokens}`);
      console.log(`  TOON chars: ${Buffer.byteLength(toon,'utf8')} bytes, tokens: ${tTokens}`);
      console.log(`  Savings: ${saved}%\n`);
      rows.push({ file: f, json_bytes: Buffer.byteLength(raw,'utf8'), json_tokens: jTokens, toon_bytes: Buffer.byteLength(toon,'utf8'), toon_tokens: tTokens, saved_percent: saved });
    }

    const totalSaved = Math.round((1 - totalToonTokens / totalJsonTokens) * 10000) / 100;
    console.log('--- Summary ---');
    console.log('Total JSON tokens:', totalJsonTokens);
    console.log('Total TOON tokens:', totalToonTokens);
    console.log('Total savings in tokens:', totalSaved + '%');

    if (outPath) {
      // write CSV
      const header = 'file,json_bytes,json_tokens,toon_bytes,toon_tokens,saved_percent\n';
      const lines = rows.map(r => `${r.file},${r.json_bytes},${r.json_tokens},${r.toon_bytes},${r.toon_tokens},${r.saved_percent}`).join('\n');
      fs.writeFileSync(outPath, header + lines, 'utf8');
      console.log('Wrote report to', outPath);
    }
  }

  main().catch(e => { console.error(e); process.exit(2); });
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.replace(/\n/g, ' ');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
function toTOON(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj.every(isObject)) {
      const keys = Array.from(new Set(obj.flatMap(o => Object.keys(o))));
      let out = `${pad}count: ${obj.length}\n`;
      out += `${pad}fields: ${keys.join(' | ')}\n`;
      out += `${pad}rows:\n`;
      for (const row of obj) {
        const values = keys.map(k => stringifyValue(row[k]));
        out += `${pad}  - ${values.join(' | ')}\n`;
      }
      return out;
    }
    let out = `${pad}count: ${obj.length}\n${pad}items:\n`;
    for (const item of obj) out += toTOON(item, indent + 1);
    return out;
  }
  if (isObject(obj)) {
    let out = '';
    for (const [k, v] of Object.entries(obj)) {
      if (isObject(v) || Array.isArray(v)) {
        out += `${pad}${k}:\n` + toTOON(v, indent + 1);
      } else {
        out += `${pad}${k}: ${stringifyValue(v)}\n`;
      }
    }
    return out;
  }
  return `${pad}${stringifyValue(obj)}\n`;
}

async function main() {
  const pattern = process.argv[2] || 'scripts/samples/*.json';
  const files = await glob(pattern);
  if (!files.length) {
    console.error('No files matched', pattern); process.exit(1);
  }

  // use gpt-3.5-turbo encoding as baseline
    // CLI: pass multiple glob patterns or a single one. Example:
    //   node tools/measure_tokens.mjs "scripts/samples/**/*.json" "tests/**/*.json" --out=report.csv --exclude="**/node_modules/**"
    const argv = process.argv.slice(2);
    const patterns = [];
    let outPath = null;
    const excludes = [];

    for (const a of argv) {
      if (a.startsWith('--out=')) outPath = a.split('=')[1];
      else if (a.startsWith('--exclude=')) excludes.push(a.split('=')[1]);
      else patterns.push(a);
    }

    if (!patterns.length) patterns.push('scripts/samples/*.json');

    // expand globs, dedupe
    const fileSet = new Set();
    for (const p of patterns) {
      const matched = await glob(p, { nodir: true });
      for (const f of matched) {
        // apply excludes (simple substring match against pattern for now)
        let skip = false;
        for (const ex of excludes) if (f.includes(ex.replace(/\*\*/g, ''))) skip = true;
        if (!skip) fileSet.add(f);
      }
    }

    const files = Array.from(fileSet).sort();
    if (!files.length) {
      console.error('No files matched patterns', patterns); process.exit(1);
    }

    // use gpt-3.5-turbo encoding as baseline
    const enc = encoding_for_model('gpt-3.5-turbo');

    let totalJsonTokens = 0, totalToonTokens = 0;
    const rows = [];

    for (const f of files) {
      const raw = fs.readFileSync(f, 'utf8');
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', f); continue; }
      const toon = toTOON(parsed);
      const jTokens = enc.encode(raw).length;
      const tTokens = enc.encode(toon).length;
      totalJsonTokens += jTokens; totalToonTokens += tTokens;
      const saved = Math.round((1 - tTokens / jTokens) * 10000) / 100;
      console.log(`File: ${f}`);
      console.log(`  JSON chars: ${Buffer.byteLength(raw,'utf8')} bytes, tokens: ${jTokens}`);
      console.log(`  TOON chars: ${Buffer.byteLength(toon,'utf8')} bytes, tokens: ${tTokens}`);
      console.log(`  Savings: ${saved}%\n`);
      rows.push({ file: f, json_bytes: Buffer.byteLength(raw,'utf8'), json_tokens: jTokens, toon_bytes: Buffer.byteLength(toon,'utf8'), toon_tokens: tTokens, saved_percent: saved });
    }

    const totalSaved = Math.round((1 - totalToonTokens / totalJsonTokens) * 10000) / 100;
    console.log('--- Summary ---');
    console.log('Total JSON tokens:', totalJsonTokens);
    console.log('Total TOON tokens:', totalToonTokens);
    console.log('Total savings in tokens:', totalSaved + '%');

    if (outPath) {
      // write CSV
      const header = 'file,json_bytes,json_tokens,toon_bytes,toon_tokens,saved_percent\n';
      const lines = rows.map(r => `${r.file},${r.json_bytes},${r.json_tokens},${r.toon_bytes},${r.toon_tokens},${r.saved_percent}`).join('\n');
      fs.writeFileSync(outPath, header + lines, 'utf8');
      console.log('Wrote report to', outPath);
    }
  }

  let totalJsonTokens = 0, totalToonTokens = 0;
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', f); continue; }
    const toon = toTOON(parsed);
    const jTokens = enc.encode(raw).length;
    const tTokens = enc.encode(toon).length;
    totalJsonTokens += jTokens; totalToonTokens += tTokens;
    console.log(`File: ${f}`);
    console.log(`  JSON chars: ${Buffer.byteLength(raw,'utf8')} bytes, tokens: ${jTokens}`);
    console.log(`  TOON chars: ${Buffer.byteLength(toon,'utf8')} bytes, tokens: ${tTokens}`);
    const saved = Math.round((1 - tTokens / jTokens) * 10000) / 100;
    console.log(`  Savings: ${saved}%\n`);
  }
  const totalSaved = Math.round((1 - totalToonTokens / totalJsonTokens) * 10000) / 100;
  console.log('--- Summary ---');
  console.log('Total JSON tokens:', totalJsonTokens);
  console.log('Total TOON tokens:', totalToonTokens);
  console.log('Total savings in tokens:', totalSaved + '%');
}

main().catch(e => { console.error(e); process.exit(2); });
