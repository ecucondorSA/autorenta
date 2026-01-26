#!/usr/bin/env node
/**
 * Script para auto-arreglar constructor subscribes
 * Detecta .subscribe() en constructores y sugiere moverlos a ngOnInit()
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const files = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts']
});

let fixed = 0;
let skipped = 0;

console.log('🔍 Analizando constructores con .subscribe()...\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  // Buscar constructor
  let inConstructor = false;
  let constructorStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar inicio del constructor
    if (line.includes('constructor(') && !line.includes('//')) {
      inConstructor = true;
      constructorStart = i;
      braceCount = 0;
    }

    if (inConstructor) {
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      // Detectar .subscribe() en constructor
      if (line.includes('.subscribe(') && braceCount > 0) {
        console.log(`❌ ${path.relative(process.cwd(), file)}:${i + 1}`);
        console.log(`   ${line.trim()}`);
        console.log(`   ↳ Mover a ngOnInit() + agregar takeUntilDestroyed()\n`);
        fixed++;
      }

      // Detectar fin del constructor
      if (inConstructor && braceCount === 0 && line.includes('}')) {
        inConstructor = false;
      }
    }
  }
}

console.log(`\n📊 Resumen:`);
console.log(`   Constructor subscribes: ${fixed}`);
console.log(`\n💡 Próximos pasos:`);
console.log(`   1. Inyectar DestroyRef en el componente`);
console.log(`   2. Mover subscription a ngOnInit()`);
console.log(`   3. Agregar pipe(takeUntilDestroyed(this.destroyRef))`);
console.log(`   4. Agregar error handler\n`);
