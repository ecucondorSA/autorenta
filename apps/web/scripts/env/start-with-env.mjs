#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

// Load variables from root .env.local (priority 1)
const rootEnvFile = resolve(root, '../../.env.local');
if (existsSync(rootEnvFile)) {
  console.log('📦 Loading environment from', rootEnvFile);
  const content = readFileSync(rootEnvFile, 'utf-8');
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

// Load variables from local .env.development.local (priority 2 - overrides root)
const localEnvFile = resolve(root, '.env.development.local');
if (existsSync(localEnvFile)) {
  console.log('📦 Loading environment from', localEnvFile);
  const content = readFileSync(localEnvFile, 'utf-8');
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

// Check if --configuration flag was passed
const hasConfigFlag = process.argv.some(arg => arg.startsWith('--configuration'));
const config = hasConfigFlag ? [] : ['--configuration', 'development'];

const args = ['exec', 'ng', 'serve', ...config, '--proxy-config', 'proxy.conf.json', ...process.argv.slice(2)];
const child = spawn('pnpm', args, {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  cwd: root,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
