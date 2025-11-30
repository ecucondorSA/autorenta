#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const envFile = resolve(root, '.env.development.local');

if (existsSync(envFile)) {
  const content = readFileSync(envFile, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    process.env[key] = value;
  }
}

const args = ['ng', 'serve', '--configuration', 'development', ...process.argv.slice(2)];
const child = spawn('npx', args, {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
