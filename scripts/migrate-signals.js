#!/usr/bin/env node
/**
 * Script para migrar @Input/@Output a Signals
 * Detecta decoradores legacy y sugiere migraciones
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts']
});

let inputs = 0;
let outputs = 0;

console.log('⚡ Detectando @Input/@Output legacy...\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar @Input
    if (line.includes('@Input') && !line.includes('input(')) {
      const inputMatch = line.match(/@Input[^}]*/);
      if (inputMatch) {
        const nextLine = lines[i + 1] || '';
        const varName = nextLine.match(/(\w+)\s*[:=]/)?.[1] || 'variable';

        console.log(`❌ ${path.relative(process.cwd(), file)}:${i + 1}`);
        console.log(`   ${line.trim()}`);
        console.log(`   ${nextLine.trim()}`);
        console.log(`   ↳ Migrar a: readonly ${varName} = input<Type>();\n`);
        inputs++;
      }
    }

    // Detectar @Output
    if (line.includes('@Output') && !line.includes('output(')) {
      const outputMatch = line.match(/@Output[^}]*/);
      if (outputMatch) {
        const nextLine = lines[i + 1] || '';
        const varName = nextLine.match(/(\w+)\s*[:=]/)?.[1] || 'event';

        console.log(`❌ ${path.relative(process.cwd(), file)}:${i + 1}`);
        console.log(`   ${line.trim()}`);
        console.log(`   ${nextLine.trim()}`);
        console.log(`   ↳ Migrar a: readonly ${varName} = output<EventType>();\n`);
        outputs++;
      }
    }
  }
}

console.log(`\n📊 Resumen:`);
console.log(`   @Input legacy: ${inputs}`);
console.log(`   @Output legacy: ${outputs}`);
console.log(`   Total: ${inputs + outputs}`);
console.log(`\n💡 Migrations patterns:`);
console.log(`   @Input() prop = defaultValue;          → readonly prop = input<Type>(defaultValue);`);
console.log(`   @Input({ required: true }) prop;       → readonly prop = input.required<Type>();`);
console.log(`   @Output() event = new EventEmitter(); → readonly event = output<EventType>();\n`);
