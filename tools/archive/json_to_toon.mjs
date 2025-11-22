#!/usr/bin/env node
// Conversor heurístico JSON -> TOON (Token-Oriented Object Notation) para pruebas rápidas
// Uso: node scripts/json_to_toon.mjs [path/to/input.json]

import fs from 'fs';
import path from 'path';

function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function toTOON(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)) {
    // If uniform array of objects, render as table
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
    // Fallback: list items
    let out = `${pad}count: ${obj.length}\n`;
    out += `${pad}items:\n`;
    for (const item of obj) {
      out += toTOON(item, indent + 1);
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
  // primitive
  return `${pad}${stringifyValue(obj)}\n`;
}

function stringifyValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.replace(/\n/g, ' ');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function shouldConvertToTOON(parsed, jsonBytes) {
  // Heurística ligera para evitar conversiones que aumenten tokens/bytes
  try {
    if (jsonBytes < 120) return false;
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(v => !isObject(v))) return false;
    if (isObject(parsed)) {
      const keys = Object.keys(parsed);
      if (keys.length > 0 && keys.length < 3) {
        if (keys.every(k => { const v = parsed[k]; return !isObject(v) && !Array.isArray(v); })) return false;
      }
    }
    return true;
  } catch (e) {
    return true;
  }
}

function main() {
  const inPath = process.argv[2] || path.join('scripts', 'samples', 'mp_payment_example.json');
  if (!fs.existsSync(inPath)) {
    console.error('Input JSON not found:', inPath);
    process.exit(2);
  }
  const raw = fs.readFileSync(inPath, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON:', e.message); process.exit(2); }

  const jsonLen = Buffer.byteLength(raw, 'utf8');
  let toon;
  let toonLen;
  if (shouldConvertToTOON(parsed, jsonLen)) {
    toon = toTOON(parsed);
    toonLen = Buffer.byteLength(toon, 'utf8');
  } else {
    // skip conversion for small/simple payloads
    toon = raw;
    toonLen = jsonLen;
  }
  const saved = Math.round((1 - toonLen / jsonLen) * 10000) / 100;

  const outDir = path.join('scripts', 'samples', 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, path.basename(inPath) + '.toon.txt'), toon);
  fs.writeFileSync(path.join(outDir, path.basename(inPath) + '.json.txt'), raw);

  console.log('Input:', inPath);
  console.log('JSON bytes:', jsonLen);
  console.log('TOON bytes:', toonLen);
  console.log('Ahorro aproximado en caracteres:', saved + '%');
  console.log('\n--- TOON preview (first 4000 chars) ---\n');
  console.log(toon.slice(0, 4000));
  console.log('\n--- Saved outputs under', outDir, '---');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
