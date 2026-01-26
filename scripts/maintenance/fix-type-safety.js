#!/usr/bin/env node
/**
 * Script para detectar y reportar unsafe `any` casts
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts']
});

const issues = {
  anyCasts: [],
  anyTypes: [],
  tsIgnore: []
};

console.log('🔍 Analizando type safety issues...\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar "as any" casts
    if (line.includes(' as any')) {
      const match = line.match(/(\w+)\s+as\s+any/);
      if (match) {
        issues.anyCasts.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
          code: line.trim()
        });
      }
    }

    // Detectar variables de tipo "any"
    if (line.match(/:\s*any\b/) && !line.includes('//')) {
      issues.anyTypes.push({
        file: path.relative(process.cwd(), file),
        line: i + 1,
        code: line.trim()
      });
    }

    // Detectar @ts-ignore
    if (line.includes('@ts-ignore') || line.includes('@ts-expect-error')) {
      issues.tsIgnore.push({
        file: path.relative(process.cwd(), file),
        line: i + 1,
        code: line.trim()
      });
    }
  }
}

console.log('❌ UNSAFE CASTS (as any)\n');
issues.anyCasts.slice(0, 10).forEach(issue => {
  console.log(`   ${issue.file}:${issue.line}`);
  console.log(`   ${issue.code}\n`);
});
if (issues.anyCasts.length > 10) {
  console.log(`   ... y ${issues.anyCasts.length - 10} más\n`);
}

console.log('🟡 ANY TYPE DECLARATIONS\n');
issues.anyTypes.slice(0, 10).forEach(issue => {
  console.log(`   ${issue.file}:${issue.line}`);
  console.log(`   ${issue.code}\n`);
});
if (issues.anyTypes.length > 10) {
  console.log(`   ... y ${issues.anyTypes.length - 10} más\n`);
}

console.log('⚠️  @ts-ignore COMMENTS\n');
issues.tsIgnore.slice(0, 5).forEach(issue => {
  console.log(`   ${issue.file}:${issue.line}`);
  console.log(`   ${issue.code}\n`);
});
if (issues.tsIgnore.length > 5) {
  console.log(`   ... y ${issues.tsIgnore.length - 5} más\n`);
}

console.log(`📊 Resumen:`);
console.log(`   Unsafe casts (as any): ${issues.anyCasts.length}`);
console.log(`   Any declarations: ${issues.anyTypes.length}`);
console.log(`   @ts-ignore: ${issues.tsIgnore.length}`);
console.log(`   Total: ${issues.anyCasts.length + issues.anyTypes.length + issues.tsIgnore.length}\n`);

console.log(`💡 Prioritario: Reemplazar ${Math.min(issues.anyCasts.length, 20)} unsafe casts primero\n`);
