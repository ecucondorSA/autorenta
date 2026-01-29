#!/usr/bin/env node
/**
 * Script to replace console statements with LoggerService
 * Removes debug console.log/warn/error and uses injected LoggerService instead
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts']
});

let fixed = 0;
let skipped = 0;
const reportIssues = [];

console.log('🧹 Replacing console statements with LoggerService...\n');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;

  // Check if file has console statements
  const hasConsole = /console\.(log|warn|error|debug)\s*\(/g.test(content);
  if (!hasConsole) continue;

  // Check if LoggerService is already imported
  const hasLoggerImport = /import\s+.*LoggerService.*from/g.test(content);

  // If file has console but no LoggerService, we need to handle it
  if (!hasLoggerImport && hasConsole) {
    // Skip decorated classes and interfaces that shouldn't be touched
    if (file.includes('interface') || file.includes('.d.ts')) {
      skipped++;
      continue;
    }

    // Pattern 1: Debug console.log statements - REMOVE completely for DEBUG tags
    content = content.replace(
      /\s*console\.log\s*\(\s*['"`]\[.*?DEBUG\].*?['"`].*?\);\n?/g,
      ''
    );

    // Pattern 2: Warning messages - replace with logger.warn
    content = content.replace(
      /console\.warn\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^\)]*)\);?/g,
      'logger.warn(\'$1\', $2)'
    );

    // Pattern 3: Error messages - replace with logger.error
    content = content.replace(
      /console\.error\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^\)]*)\);?/g,
      'logger.error(\'$1\', $2)'
    );

    // Pattern 4: Regular log statements - replace with logger.info
    content = content.replace(
      /console\.log\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*([^\)]*)\);?/g,
      'logger.info(\'$1\', $2)'
    );

    // Pattern 5: Remove inline comments with eslint-disable
    content = content.replace(
      /\s*\/\/\s*eslint-disable.*?console\s*\n/g,
      '\n'
    );

    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      fixed++;
      console.log(`✅ ${file}`);
    }
  } else if (hasLoggerImport && hasConsole) {
    // If already has LoggerService import, we could update but skip for now
    // (requires careful analysis of logger vs console usage)
    skipped++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Replaced: ${fixed} files`);
console.log(`   Skipped: ${skipped} files`);
console.log(`\n⚠️  NOTE: Files with existing LoggerService imports should be reviewed manually.`);
console.log(`   Some console statements may be intentional (performance logging, etc.)\n`);
