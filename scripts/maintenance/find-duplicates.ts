#!/usr/bin/env npx tsx
/**
 * Find Duplicates - Detecta componentes, servicios, RPC y tipos duplicados
 */

import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

const webAppPath = 'apps/web/src/app';

// 1. Componentes con nombres similares
console.log('🔍 Buscando COMPONENTES DUPLICADOS/SIMILARES...\n');

const componentFiles = globSync(`${webAppPath}/**/*.component.ts`);
const components = new Map<string, string[]>();

for (const file of componentFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
  if (selectorMatch) {
    const selector = selectorMatch[1];
    // Normalizar nombre (quitar app-, -v2, números)
    const normalized = selector.replace(/^app-/, '').replace(/-v\d+$/, '').replace(/-\d+$/, '');
    if (!components.has(normalized)) {
      components.set(normalized, []);
    }
    components.get(normalized)!.push(`${selector} → ${file}`);
  }
}

console.log('📦 Componentes con nombres similares (posibles duplicados):');
let dupCount = 0;
for (const [name, files] of components) {
  if (files.length > 1) {
    dupCount++;
    console.log(`\n  "${name}" (${files.length} versiones):`);
    files.forEach(f => console.log(`    - ${f}`));
  }
}
console.log(`\nTotal grupos duplicados: ${dupCount}`);

// 2. Servicios duplicados
console.log('\n\n🔍 Buscando SERVICIOS DUPLICADOS...\n');

const serviceFiles = globSync(`${webAppPath}/**/*.service.ts`);
const services = new Map<string, string[]>();

for (const file of serviceFiles) {
  const baseName = path.basename(file, '.service.ts')
    .replace(/-v\d+$/, '')
    .replace(/\d+$/, '')
    .toLowerCase();

  if (!services.has(baseName)) {
    services.set(baseName, []);
  }
  services.get(baseName)!.push(file);
}

console.log('📦 Servicios con nombres similares:');
let svcDupCount = 0;
for (const [name, files] of services) {
  if (files.length > 1) {
    svcDupCount++;
    console.log(`\n  "${name}" (${files.length} versiones):`);
    files.forEach(f => console.log(`    - ${f}`));
  }
}
console.log(`\nTotal servicios duplicados: ${svcDupCount}`);

// 3. RPC Functions duplicadas
console.log('\n\n🔍 Buscando RPC FUNCTIONS DUPLICADAS...\n');

const sqlFiles = [
  ...globSync('supabase/migrations/**/*.sql'),
  ...globSync('supabase/snapshots/**/*.sql')
];

const rpcFunctions = new Map<string, string[]>();

for (const file of sqlFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const matches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi);
  for (const match of matches) {
    const funcName = match[1].toLowerCase();
    if (!rpcFunctions.has(funcName)) {
      rpcFunctions.set(funcName, []);
    }
    rpcFunctions.get(funcName)!.push(file);
  }
}

console.log('📦 RPC Functions definidas múltiples veces:');
let rpcDupCount = 0;
for (const [name, files] of rpcFunctions) {
  const uniqueFiles = [...new Set(files)];
  if (uniqueFiles.length > 1) {
    rpcDupCount++;
    console.log(`\n  "${name}" (${uniqueFiles.length} definiciones):`);
    uniqueFiles.forEach(f => console.log(`    - ${f}`));
  }
}
console.log(`\nTotal RPC duplicadas: ${rpcDupCount}`);

// 4. Páginas duplicadas
console.log('\n\n🔍 Buscando PÁGINAS DUPLICADAS...\n');

const pageFiles = globSync(`${webAppPath}/**/*.page.ts`);
const pages = new Map<string, string[]>();

for (const file of pageFiles) {
  const baseName = path.basename(file, '.page.ts')
    .replace(/-v\d+$/, '')
    .replace(/\d+$/, '')
    .toLowerCase();

  if (!pages.has(baseName)) {
    pages.set(baseName, []);
  }
  pages.get(baseName)!.push(file);
}

console.log('📦 Páginas con nombres similares:');
let pageDupCount = 0;
for (const [name, files] of pages) {
  if (files.length > 1) {
    pageDupCount++;
    console.log(`\n  "${name}" (${files.length} versiones):`);
    files.forEach(f => console.log(`    - ${f}`));
  }
}
console.log(`\nTotal páginas duplicadas: ${pageDupCount}`);

// 5. Interfaces/Types duplicados
console.log('\n\n🔍 Buscando INTERFACES/TYPES DUPLICADOS...\n');

const tsFiles = globSync(`${webAppPath}/**/*.ts`);
const interfaces = new Map<string, string[]>();

for (const file of tsFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const matches = content.matchAll(/(?:export\s+)?(?:interface|type)\s+(\w+)\s*[{=<]/g);
  for (const match of matches) {
    const typeName = match[1];
    if (!interfaces.has(typeName)) {
      interfaces.set(typeName, []);
    }
    interfaces.get(typeName)!.push(file);
  }
}

console.log('📦 Interfaces/Types definidos en múltiples archivos:');
let typeDupCount = 0;
const shown = new Set<string>();
for (const [name, files] of interfaces) {
  const uniqueFiles = [...new Set(files)];
  if (uniqueFiles.length > 1 && !shown.has(name)) {
    shown.add(name);
    typeDupCount++;
    if (typeDupCount <= 20) { // Limitar output
      console.log(`\n  "${name}" (${uniqueFiles.length} definiciones):`);
      const filesToShow = uniqueFiles.slice(0, 5);
      filesToShow.forEach(f => console.log(`    - ${f}`));
      if (uniqueFiles.length > 5) {
        const remaining = uniqueFiles.length - 5;
        console.log(`    ... y ${remaining} más`);
      }
    }
  }
}
console.log(`\nTotal types duplicados: ${typeDupCount}`);

// Resumen
console.log('\n\n' + '='.repeat(60));
console.log('📊 RESUMEN DE DUPLICACIONES');
console.log('='.repeat(60));
console.log(`  Componentes duplicados:  ${dupCount}`);
console.log(`  Servicios duplicados:    ${svcDupCount}`);
console.log(`  RPC duplicadas:          ${rpcDupCount}`);
console.log(`  Páginas duplicadas:      ${pageDupCount}`);
console.log(`  Types duplicados:        ${typeDupCount}`);
console.log('='.repeat(60));
