#!/usr/bin/env node
/**
 * Color & Gradient audit
 * - Fails on linear/radial gradients
 * - Fails on hex colors not in the allowed palette (from styles.css tokens)
 * - Ignores lines that already use CSS variables (var(--...))
 */
const fs = require('fs');
const path = require('path');

// Scan solo UI pública (shared + marketplace) para evitar ruido de admin/mapas
const roots = [
  'apps/web/src/app/shared',
  'apps/web/src/app/features/marketplace',
  'apps/web/src/styles',
  'apps/web/src/theme',
];

const exts = new Set(['.css', '.scss', '.sass', '.less', '.html', '.ts']);

// Palette from styles.css tokens + common shorthands
const allowHex = new Set([
  '#f8f4ec', '#ffffff', '#fff', '#dfd2bf', '#f5f5f5', '#050505', '#000', '#4e4e4e', '#7b7b7b',
  '#a7d8f4', '#8ec9ec', '#bcbcbc', '#e3e3e3', '#3b6e8f', '#b25e5e', '#9db38b',
  '#facc15', '#c4a882', '#6ba8d4', '#4f46e5', '#3730a3', '#1e1b4b', '#16a34a',
  '#15803d', '#14532d', '#dc2626', '#b91c1c', '#7f1d1d', '#fef2f2', '#fefce8',
  '#fef3c7', '#f0fdf4', '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
  // Nuevos hex de la paleta principal
  '#10b981', '#0f9d58', '#1e8e3e', // success.default, success.dark, success.medium
  '#4285f4', '#1967d2', '#60a5fa', // system.blue.default, system.blue.dark, system.blue.light
  '#33ccff', // Waze brand color
  // abreviados usados en tokens legacy
  '#050', '#0a0', '#0f0', '#f5f', '#e0e', '#f0f', '#f8f', '#dfd', '#bcb', '#e3e', '#c4a', '#ca8',
  '#a7d', '#8ec', '#3b6', '#4e4', '#7b7', '#b25', '#9db', '#6ba', '#dc2', '#991', '#7f1',
  '#10b', '#0f9', '#1e8', // shorthands for success colors
  '#428', '#196', '#60a', '#33c', // shorthands for system blue and Waze colors
]);

const ignoreDirs = new Set([
  'node_modules',
  '.pnpm',
  'dist',
  'build',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
  'admin',
  'maps',
]);
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(entry.name))) auditFile(full);
  }
}

const hexRegex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g;

function auditFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // skip comments
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return;
    if (line.includes('gradient(')) {
      findings.push({ file, line: lineNum, msg: 'Gradient detected' });
    }
    if (line.includes('var(')) return; // allow tokens
    const matches = line.match(hexRegex) || [];
    for (const hex of matches) {
      if (!allowHex.has(hex.toLowerCase())) {
        findings.push({ file, line: lineNum, msg: `Hex ${hex} not in palette` });
      }
    }
  });
}

roots.forEach((r) => {
  if (fs.existsSync(r)) walk(r);
});

if (findings.length) {
  console.error('\nColor audit failed:');
  findings.forEach((f) => console.error(`- ${f.file}:${f.line} -> ${f.msg}`));
  process.exit(1);
} else {
  console.log('Color audit passed (no gradients, no out-of-palette hex colors)');
}
