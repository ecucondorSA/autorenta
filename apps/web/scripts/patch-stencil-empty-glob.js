#!/usr/bin/env node
// Silences Stencil empty-glob warning by providing a no-op entry file (CommonJS).
const { existsSync, writeFileSync } = require('fs');
const { join } = require('path');

const targetDir = join(__dirname, '../node_modules/@stencil/core/internal/client');
const targetFile = join(targetDir, '__empty__.entry.js');

try {
  if (!existsSync(targetDir)) {
    console.warn('[patch-stencil] target directory not found, skipping');
    process.exit(0);
  }
  const content = '// stub entry to satisfy import("./**/*.entry.js*")\nmodule.exports = {}\n';
  writeFileSync(targetFile, content, { flag: 'w' });
  console.log('[patch-stencil] added __empty__.entry.js to silence empty-glob warning');
} catch (err) {
  console.warn('[patch-stencil] failed:', err?.message || err);
}
