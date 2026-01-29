const fs = require('fs');
const path = require('path');

const modelsDir = path.resolve(__dirname, '../src/app/core/models');
const files = fs.readdirSync(modelsDir)
  .filter(f => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.spec.ts'));

// Keep the manual part at the top of index.ts or just replace everything with exports?
// Let's see if we can just append exports for everything.

const existingContent = fs.readFileSync(path.join(modelsDir, 'index.ts'), 'utf8');
const exportLines = files.map(f => `export * from './${f.replace('.ts', '')}';`);

// Only add if not already present
const newExports = exportLines.filter(line => !existingContent.includes(line));

if (newExports.length > 0) {
  fs.appendFileSync(path.join(modelsDir, 'index.ts'), '\n// Auto-added exports\n' + newExports.join('\n') + '\n');
  console.log(`Added ${newExports.length} missing exports to models/index.ts`);
} else {
  console.log('No missing exports found in models/index.ts');
}
