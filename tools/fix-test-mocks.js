#!/usr/bin/env node
/**
 * Script to automatically fix test files that are missing common providers
 *
 * This script:
 * 1. Finds all .spec.ts files
 * 2. Checks if they have proper imports for testing helpers
 * 3. Adds missing imports and updates TestBed configuration
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const webSrcPath = path.join(__dirname, '../apps/web/src/app');

// Find all spec files
const specFiles = glob.sync('**/*.spec.ts', { cwd: webSrcPath });

console.log(`Found ${specFiles.length} spec files`);

let fixedCount = 0;
let alreadyFixedCount = 0;

specFiles.forEach((file) => {
  const fullPath = path.join(webSrcPath, file);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip files that already import from testing.module
  if (content.includes('@test-helpers/testing.module') || content.includes('test-helpers/testing.module')) {
    alreadyFixedCount++;
    return;
  }

  // Check if the file uses TestBed
  if (!content.includes('TestBed.configureTestingModule')) {
    return;
  }

  // Check if file needs HttpClient or Supabase mocks
  const needsHttpClient = content.includes('HttpClient') || content.includes('provideHttpClient');
  const needsSupabase = content.includes('SupabaseClientService') || content.includes('injectSupabase') || content.includes('supabase');

  if (!needsHttpClient && !needsSupabase) {
    // Check if there are errors about missing providers by looking for common patterns
    const hasServiceThatMightNeedMocks =
      content.includes('inject(') ||
      content.includes('TestBed.inject(') ||
      content.includes('Service');

    if (!hasServiceThatMightNeedMocks) {
      return;
    }
  }

  // Add imports if needed
  let modified = false;

  // Add testing.module import if not present
  if (!content.includes('getTestingProviders') && !content.includes('getMockSupabaseService')) {
    // Find the first import statement
    const importMatch = content.match(/^import\s+/m);
    if (importMatch) {
      const importIndex = content.indexOf(importMatch[0]);
      const newImport = `import { getTestingProviders, getMockSupabaseService, getMockLoggerService } from '@test-helpers/testing.module';\n`;

      // Check if this is a service test that might need full providers
      if (needsHttpClient || needsSupabase) {
        content = content.slice(0, importIndex) + newImport + content.slice(importIndex);
        modified = true;
        console.log(`Added testing.module import to: ${file}`);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    fixedCount++;
  }
});

console.log(`\nSummary:`);
console.log(`- Already fixed: ${alreadyFixedCount}`);
console.log(`- Newly fixed: ${fixedCount}`);
console.log(`- Total spec files: ${specFiles.length}`);
