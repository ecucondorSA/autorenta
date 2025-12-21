#!/usr/bin/env node
// Silences Stencil empty-glob warning by providing a no-op entry file (CommonJS).
//
// Why this exists:
// - Angular (esbuild) warns when it sees Stencil's glob import and no matching *.entry.js files.
// - In pnpm workspaces the actual @stencil/core location may live under node_modules/.pnpm/...,
//   so we must resolve the installed package location rather than assuming apps/web/node_modules.
const { existsSync, readdirSync, writeFileSync } = require('fs');
const { dirname, join, parse, resolve } = require('path');

function findRepoRoot(startDir) {
  let current = startDir;
  const { root } = parse(current);
  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    if (current === root) return null;
    current = dirname(current);
  }
}

function collectStencilInternalClientDirs() {
  const dirs = new Set();

  const repoRoot = findRepoRoot(__dirname);
  const webRoot = resolve(__dirname, '../..');

  // 1) Primary: resolve installed @stencil/core from common lookup points
  try {
    const stencilPkgJson = require.resolve('@stencil/core/package.json', {
      paths: [process.cwd(), __dirname],
    });
    dirs.add(join(dirname(stencilPkgJson), 'internal', 'client'));
  } catch {
    // ignore
  }

  // 2) Fallbacks for mixed install layouts
  dirs.add(resolve(webRoot, 'node_modules/@stencil/core/internal/client'));
  if (repoRoot) {
    dirs.add(resolve(repoRoot, 'node_modules/@stencil/core/internal/client'));
  }

  // 3) pnpm workspace root: patch every installed version under node_modules/.pnpm
  //    (Angular's esbuild warning often resolves to this real path)
  const pnpmDir = repoRoot ? resolve(repoRoot, 'node_modules/.pnpm') : null;
  if (pnpmDir && existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (!entry.startsWith('@stencil+core@')) continue;
      dirs.add(resolve(pnpmDir, entry, 'node_modules/@stencil/core/internal/client'));
    }
  }

  return [...dirs].filter((dir) => existsSync(dir));
}

try {
  const targetDirs = collectStencilInternalClientDirs();
  if (targetDirs.length === 0) {
    console.warn('[patch-stencil] target directory not found, skipping');
    process.exit(0);
  }

  const content = '// stub entry to satisfy import("./**/*.entry.js*")\nmodule.exports = {}\n';

  let patchedCount = 0;
  for (const targetDir of targetDirs) {
    const targetFile = join(targetDir, '__empty__.entry.js');
    writeFileSync(targetFile, content, { flag: 'w' });
    patchedCount++;
  }

  console.log(`[patch-stencil] added __empty__.entry.js in ${patchedCount} location(s) to silence empty-glob warning`);
} catch (err) {
  console.warn('[patch-stencil] failed:', err?.message || err);
}
