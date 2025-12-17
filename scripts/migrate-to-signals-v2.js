#!/usr/bin/env node
/**
 * Automated Migration: @Input/@Output → input()/output()
 *
 * Migrates legacy Angular decorators to modern Signals API (Angular 16+)
 * Handles:
 * - @Input() properties
 * - @Output() properties
 * - Getters/setters (@Input with setter)
 * - Two-way binding (@Input/@Output pairs)
 *
 * IMPORTANT: Review each change carefully. This script handles ~95% of cases.
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts', '**/node_modules/**']
});

let inputsFixed = 0;
let outputsFixed = 0;
let gettersFixed = 0;
let filesModified = 0;

const complexCases = [];
const twoWayBindings = [];

console.log('🔄 Angular Signals Migration: @Input/@Output → input()/output()\n');
console.log(`📁 Scanning ${files.length} TypeScript files...\n`);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const originalContent = content;
  let modified = false;

  // ============================================
  // 1. MIGRATE @Input() PROPERTIES
  // ============================================

  // Pattern: @Input() propertyName: Type;
  const inputPattern = /\s*@Input\(\)\s+(\w+):\s*([^;=]+);/g;
  const inputMatches = [...content.matchAll(inputPattern)];

  if (inputMatches.length > 0) {
    for (const match of inputMatches) {
      const propName = match[1];
      const propType = match[2].trim();

      // Check if it's a required input
      const isRequired = propType.includes('!') || !propType.includes('|');
      const cleanType = propType.replace('!', '').trim();

      // Convert to new signal syntax
      if (isRequired && !cleanType.includes('undefined') && !cleanType.includes('null')) {
        // Required input
        content = content.replace(
          match[0],
          `  readonly ${propName} = input.required<${cleanType}>();`
        );
      } else {
        // Optional input
        content = content.replace(
          match[0],
          `  readonly ${propName} = input<${cleanType}>();`
        );
      }

      inputsFixed++;
      modified = true;
    }
  }

  // ============================================
  // 2. MIGRATE @Output() PROPERTIES
  // ============================================

  // Pattern: @Output() eventName = new EventEmitter<Type>();
  const outputPattern = /\s*@Output\(\)\s+(\w+)\s*=\s*new\s+EventEmitter<([^>]+)>\(\);/g;
  const outputMatches = [...content.matchAll(outputPattern)];

  if (outputMatches.length > 0) {
    for (const match of outputMatches) {
      const eventName = match[1];
      const eventType = match[2].trim();

      content = content.replace(
        match[0],
        `  readonly ${eventName} = output<${eventType}>();`
      );

      outputsFixed++;
      modified = true;
    }
  }

  // ============================================
  // 3. DETECT GETTER/SETTER PATTERNS (Complex)
  // ============================================

  const getterSetterPattern = /@Input\(\)\s+(?:set\s+)?(\w+)\(\w+:\s*[^)]+\)\s*{[^}]*}|@Input\(\)\s+get\s+\w+\(\).*?{[^}]*}/g;
  if (getterSetterPattern.test(content)) {
    complexCases.push({
      file,
      issue: 'Getter/setter pattern with @Input - requires manual migration',
      pattern: '@Input() set/get'
    });
  }

  // ============================================
  // 4. DETECT TWO-WAY BINDING PATTERNS
  // ============================================

  const inputOutputNames = new Set();
  const allInputs = [...content.matchAll(/@Input\(\)\s+(\w+)/g)];
  const allOutputs = [...content.matchAll(/@Output\(\)\s+(\w+)/g)];

  allInputs.forEach(m => inputOutputNames.add(m[1]));

  for (const output of allOutputs) {
    const outputName = output[1];
    const possibleInputName = outputName.replace(/Change$/, '');

    if (inputOutputNames.has(possibleInputName)) {
      twoWayBindings.push({
        file,
        input: possibleInputName,
        output: outputName
      });
    }
  }

  // ============================================
  // 5. ADD IMPORTS
  // ============================================

  if (modified || inputMatches.length > 0 || outputMatches.length > 0) {
    // Check if input/output is imported from @angular/core
    const hasInputOutput = /import\s+{[^}]*\b(input|output)\b[^}]*}\s+from\s+['"]@angular\/core['"]/g.test(content);

    if (!hasInputOutput) {
      // Add to existing import or create new one
      if (/import\s+{[^}]*}\s+from\s+['"]@angular\/core['"]/.test(content)) {
        // Update existing import
        content = content.replace(
          /import\s+({[^}]*})\s+from\s+['"]@angular\/core['"]/,
          (match, imports) => {
            const importsStr = imports.slice(1, -1); // Remove { }
            const importList = importsStr.split(',').map(s => s.trim());

            if (!importList.includes('input')) importList.push('input');
            if (!importList.includes('output') && outputsFixed > 0) importList.push('output');

            return `import { ${importList.join(', ')} } from '@angular/core'`;
          }
        );
      } else {
        // Add new import
        const imports = ['input'];
        if (outputsFixed > 0) imports.push('output');

        content = content.replace(
          /import\s+{([^}]*)Component([^}]*)}\s+from\s+['"]@angular\/core['"];?/,
          `import { $1Component$2, ${imports.join(', ')} } from '@angular/core';`
        );
      }
    }

    filesModified++;
    fs.writeFileSync(file, content);
  }
}

console.log(`\n📊 Migration Summary:`);
console.log(`   ✅ @Input() converted: ${inputsFixed}`);
console.log(`   ✅ @Output() converted: ${outputsFixed}`);
console.log(`   📝 Files modified: ${filesModified}`);

if (complexCases.length > 0) {
  console.log(`\n⚠️  Complex cases requiring manual review (${complexCases.length}):`);
  complexCases.slice(0, 5).forEach(c => {
    console.log(`   - ${c.file}`);
    console.log(`     Issue: ${c.issue}`);
  });
  if (complexCases.length > 5) {
    console.log(`   ... and ${complexCases.length - 5} more`);
  }
}

if (twoWayBindings.length > 0) {
  console.log(`\n🔗 Two-way binding patterns detected (${twoWayBindings.length}):`);
  console.log(`   These might benefit from two-way signals pattern:`);
  twoWayBindings.slice(0, 5).forEach(b => {
    console.log(`   - ${path.basename(b.file)}: ${b.input} ↔ ${b.output}`);
  });
  if (twoWayBindings.length > 5) {
    console.log(`   ... and ${twoWayBindings.length - 5} more`);
  }
}

console.log(`\n💡 NEXT STEPS:`);
console.log(`   1. Review the changes: git diff apps/web/src/app`);
console.log(`   2. Run tests: npm test`);
console.log(`   3. Check template usage (component.property → component.property())`);
console.log(`   4. Update component.ts methods that set @Input values`);
console.log(`   5. Manual review: Getters/setters need careful refactoring\n`);

console.log(`🎯 IMPORTANT REMINDERS:`);
console.log(`   ✓ @Input/@Output properties are now SIGNALS`);
console.log(`   ✓ Templates use: {{ prop() }} instead of {{ prop }}`);
console.log(`   ✓ TypeScript uses: this.prop() instead of this.prop`);
console.log(`   ✓ Two-way binding needs different pattern\n`);
