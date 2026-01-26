#!/usr/bin/env node
/**
 * Script para generar tests skeletons para archivos sin .spec.ts
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const tsFiles = globSync('apps/web/src/app/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/*.d.ts', '**/index.ts']
});

let generated = 0;
const missing = [];

console.log('🧪 Buscando archivos sin tests...\n');

for (const file of tsFiles) {
  const specFile = file.replace('.ts', '.spec.ts');

  if (!fs.existsSync(specFile)) {
    missing.push(file);

    // Obtener nombre de clase
    const content = fs.readFileSync(file, 'utf-8');
    const classMatch = content.match(/export class (\w+)/);
    const className = classMatch ? classMatch[1] : path.basename(file, '.ts');

    console.log(`❌ ${path.relative(process.cwd(), file)}`);
    console.log(`   → Generar: ${path.relative(process.cwd(), specFile)}\n`);
    generated++;

    // Generar skeleton test
    const template = `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${className} } from './${path.basename(file, '.ts')}';

describe('${className}', () => {
  let component: ${className};
  let fixture: ComponentFixture<${className}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}],
    }).compileComponents();

    fixture = TestBed.createComponent(${className});
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
`;

    // Opcional: crear el archivo
    if (process.argv.includes('--create')) {
      fs.writeFileSync(specFile, template);
      console.log(`   ✅ Creado\n`);
    }
  }
}

console.log(`\n📊 Resumen:`);
console.log(`   Archivos sin tests: ${generated}`);
console.log(`   Coverage: ${((tsFiles.length - missing.length) / tsFiles.length * 100).toFixed(1)}%`);
console.log(`\n💡 Para crear tests automáticamente:`);
console.log(`   node scripts/generate-missing-tests.js --create\n`);
