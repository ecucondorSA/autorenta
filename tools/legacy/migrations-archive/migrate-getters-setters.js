#!/usr/bin/env node
/**
 * Manual Migration Helper: Getters/Setters with @Input
 *
 * This script identifies getter/setter patterns that need manual migration.
 * Provides context for each case to help developers refactor correctly.
 *
 * Pattern 1: @Input() set property(value: T) { ... }
 * Migration:
 *   - Extract logic into a watch effect or computed
 *   - Use signal.set() or signals flow
 *
 * Pattern 2: @Input() get property() + private _property = signal()
 * Migration:
 *   - Use signal directly
 *   - Expose via .asReadonly() if needed
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts']
});

const getterSetterPatterns = [];
const twoWayPatterns = [];

console.log('🔍 Analyzing Getter/Setter patterns for signals migration...\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  // Pattern 1: @Input() set propertyName(value)
  const setterPattern = /@Input\(\)\s+set\s+(\w+)\s*\(\s*(\w+):\s*([^)]+)\s*\)\s*{/;
  const getterPattern = /@Input\(\)\s+get\s+(\w+)\s*\(\s*\)\s*:\s*([^{]+)\s*{/;
  const eventEmitterPattern = /new\s+EventEmitter/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    // Detect setter pattern
    if (setterPattern.test(line)) {
      const match = line.match(setterPattern);
      getterSetterPatterns.push({
        file,
        line: i + 1,
        type: 'setter',
        propertyName: match[1],
        paramName: match[2],
        paramType: match[3].trim(),
        code: line.trim()
      });
    }

    // Detect getter pattern
    if (getterPattern.test(line)) {
      const match = line.match(getterPattern);
      getterSetterPatterns.push({
        file,
        line: i + 1,
        type: 'getter',
        propertyName: match[1],
        returnType: match[2].trim(),
        code: line.trim()
      });
    }

    // Detect two-way binding pattern (Input + Output with Change suffix)
    if (/@Input\(\)/.test(line) && /(property|data|value)/.test(line)) {
      const propertyName = line.match(/@Input\(\)\s+(\w+)/)?.[1];
      if (propertyName) {
        // Look ahead for corresponding @Output
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          if (new RegExp(`@Output\\(\\)\\s+${propertyName}Change`).test(lines[j])) {
            twoWayPatterns.push({
              file,
              line: i + 1,
              propertyName,
              inputLine: i + 1,
              outputLine: j + 1
            });
            break;
          }
        }
      }
    }
  }
}

console.log(`📊 Analysis Results:\n`);
console.log(`   🔧 Getters/Setters found: ${getterSetterPatterns.length}`);
console.log(`   🔗 Two-way bindings found: ${twoWayPatterns.length}\n`);

if (getterSetterPatterns.length > 0) {
  console.log(`\n📋 COMPLEX PATTERNS REQUIRING MANUAL MIGRATION:\n`);

  const grouped = {};
  getterSetterPatterns.forEach(item => {
    if (!grouped[item.file]) grouped[item.file] = [];
    grouped[item.file].push(item);
  });

  Object.entries(grouped).forEach(([file, items], idx) => {
    if (idx < 5) { // Show first 5 files
      console.log(`\n${path.relative('/home/edu/autorenta', file)}`);
      items.forEach(item => {
        console.log(
          `   Line ${item.line} [${item.type.toUpperCase()}] @Input ${item.propertyName}`
        );
        console.log(`   → ${item.code.substring(0, 80)}`);
      });
    }
  });

  if (Object.keys(grouped).length > 5) {
    console.log(`\n   ... and ${Object.keys(grouped).length - 5} more files`);
  }
}

if (twoWayPatterns.length > 0) {
  console.log(`\n\n🔗 TWO-WAY BINDING PATTERNS:\n`);
  console.log(`   These can use the new two-way signals pattern:\n`);

  twoWayPatterns.forEach((item, idx) => {
    if (idx < 6) {
      const relPath = path.relative('/home/edu/autorenta', item.file);
      console.log(`   ${idx + 1}. ${path.basename(item.file)}`);
      console.log(`      @Input() ${item.propertyName}`);
      console.log(`      @Output() ${item.propertyName}Change`);
      console.log(`\n      NEW PATTERN (Angular 16+):`);
      console.log(`      readonly ${item.propertyName} = signal<T>(initialValue);`);
      console.log(`      \n`);
    }
  });
}

console.log(`\n📚 MIGRATION STRATEGIES:\n`);
console.log(`STRATEGY 1: Simple Getter/Setter → Signal`);
console.log(`────────────────────────────────────────`);
console.log(`BEFORE:`);
console.log(`  @Input() set value(v: string) { this._value = v; }`);
console.log(`  @Input() get value() { return this._value; }`);
console.log(`  private _value = '';\n`);
console.log(`AFTER:`);
console.log(`  readonly value = input<string>('');\n`);

console.log(`STRATEGY 2: Getter/Setter with Logic → Signal + Effect`);
console.log(`────────────────────────────────────────────────────────`);
console.log(`BEFORE:`);
console.log(`  @Input() set data(d: Data) {`);
console.log(`    this._data = d;`);
console.log(`    this.recalculate();`);
console.log(`  }`);
console.log(`  private _data: Data;\n`);
console.log(`AFTER:`);
console.log(`  readonly data = input<Data>();`);
console.log(`  constructor() {`);
console.log(`    effect(() => {`);
console.log(`      const d = this.data();`);
console.log(`      if (d) this.recalculate();`);
console.log(`    });`);
console.log(`  }\n`);

console.log(`STRATEGY 3: Two-Way Binding → Two-Way Signal`);
console.log(`─────────────────────────────────────────────`);
console.log(`BEFORE:`);
console.log(`  @Input() value: T;`);
console.log(`  @Output() valueChange = new EventEmitter<T>();\n`);
console.log(`AFTER:`);
console.log(`  readonly value = model<T>();  // Requires: import { model } from '@angular/core';\n`);

console.log(`\n✅ RECOMMENDED NEXT STEPS:`);
console.log(`   1. Review each getter/setter case above`);
console.log(`   2. Identify the pattern it matches`);
console.log(`   3. Apply the corresponding migration strategy`);
console.log(`   4. Test thoroughly (signals are reactive!)`);
console.log(`   5. Update templates: prop → prop()\n`);
