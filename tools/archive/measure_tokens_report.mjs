// Mide tokens usando tiktoken para JSON vs TOON (nuevo script, no toca measure_tokens.mjs)
import fs from 'fs';
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

// Decide si convertir a TOON o dejar el JSON tal cual.
// Reglas heurísticas (puedes ajustar los umbrales):
// - No convertir si el payload es muy pequeño (p. ej. < 32 tokens o < 120 bytes)
// - No convertir si es un array de valores primitivos (no objetos)
// - No convertir si es un objeto muy pequeño (p. ej. < 3 keys y todos primitivos)
function shouldConvertToTOON(parsed, jsonTokens, jsonBytes) {
  try {
    if (jsonTokens < 32) return false;
    if (jsonBytes < 120) return false;
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(v => !isObject(v))) return false;
    if (isObject(parsed)) {
      const keys = Object.keys(parsed);
      if (keys.length > 0 && keys.length < 3) {
        // if all values are primitive, skip
        if (keys.every(k => { const v = parsed[k]; return !isObject(v) && !Array.isArray(v); })) return false;
      }
    }
    return true;
  } catch (e) {
    return true;
  }
}

async function main() {
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

  const fileSet = new Set();
  for (const p of patterns) {
    const matched = await glob(p, { nodir: true });
    for (const f of matched) {
      let skip = false;
      for (const ex of excludes) if (ex && f.includes(ex)) skip = true;
      if (!skip) fileSet.add(f);
    }
  }

  const files = Array.from(fileSet).sort();
  if (!files.length) {
    console.error('No files matched patterns', patterns); process.exit(1);
  }

  const enc = encoding_for_model('gpt-3.5-turbo');
  let totalJsonTokens = 0, totalToonTokens = 0;
  const rows = [];

  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', f); continue; }
    const rawBytes = Buffer.byteLength(raw,'utf8');
    const jTokens = enc.encode(raw).length;
    let toon;
    let tTokens;
    if (shouldConvertToTOON(parsed, jTokens, rawBytes)) {
      toon = toTOON(parsed);
      tTokens = enc.encode(toon).length;
    } else {
      // skip conversion for small/simple payloads
      toon = raw;
      tTokens = jTokens;
    }
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
    const header = 'file,json_bytes,json_tokens,toon_bytes,toon_tokens,saved_percent\n';
    const lines = rows.map(r => `${r.file},${r.json_bytes},${r.json_tokens},${r.toon_bytes},${r.toon_tokens},${r.saved_percent}`).join('\n');
    fs.writeFileSync(outPath, header + lines, 'utf8');
    console.log('Wrote report to', outPath);
  }
}

main().catch(e => { console.error(e); process.exit(2); });
