#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';

// Usage:
// TARGET_URL=https://mi-produccion node scripts/run-e2e-target.mjs [--project=chromium:visitor]

const target = process.env.TARGET_URL || process.env.PLAYWRIGHT_BASE_URL;
if (!target) {
  console.error('Provide TARGET_URL or PLAYWRIGHT_BASE_URL env var pointing to the target environment');
  process.exit(2);
}

const args = ['test', '--config=playwright.config.ts'];
// forward any CLI args
for (const a of process.argv.slice(2)) args.push(a);

// set env
const env = { ...process.env, PLAYWRIGHT_BASE_URL: target };

console.log('Running Playwright tests against', target);

const res = spawnSync('npx', args, { stdio: 'inherit', env, cwd: path.resolve('.') });
process.exit(res.status === null ? 1 : res.status);
