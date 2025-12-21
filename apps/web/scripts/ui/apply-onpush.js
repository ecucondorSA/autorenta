#!/usr/bin/env node
/**
 * Script para aplicar ChangeDetectionStrategy.OnPush a todos los componentes Angular
 * que no lo tienen configurado.
 *
 * Uso: node tools/apply-onpush.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const DRY_RUN = process.argv.includes('--dry-run');

function findComponentFiles(srcDir) {
  return glob.sync(`${srcDir}/**/*.component.ts`).concat(
    glob.sync(`${srcDir}/**/*.page.ts`)
  );
}

function needsOnPush(content) {
  // Ya tiene OnPush
  if (content.includes('ChangeDetectionStrategy.OnPush')) {
    return false;
  }
  // No es un componente Angular
  if (!content.includes('@Component(')) {
    return false;
  }
  return true;
}

function addChangeDetectionImport(content) {
  // Si ya tiene ChangeDetectionStrategy importado
  if (content.includes('ChangeDetectionStrategy')) {
    return content;
  }

  // Buscar el import de @angular/core y agregar ChangeDetectionStrategy
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@angular\/core['"]/;
  const match = content.match(importRegex);

  if (match) {
    const imports = match[1];
    const newImports = imports.trim() + ',\n  ChangeDetectionStrategy';
    return content.replace(importRegex, `import {${newImports}} from '@angular/core'`);
  }

  return content;
}

function addOnPushToComponent(content) {
  // Buscar @Component({ y agregar changeDetection después del selector o templateUrl
  const componentRegex = /@Component\(\{([^}]*)(selector:\s*['"][^'"]+['"])/;
  const match = content.match(componentRegex);

  if (match) {
    // Agregar después de standalone: true si existe, o después de imports si existe
    if (content.includes('standalone: true,')) {
      return content.replace(
        'standalone: true,',
        'standalone: true,\n  changeDetection: ChangeDetectionStrategy.OnPush,'
      );
    }

    // Buscar el patrón templateUrl o template y agregar después
    const templateRegex = /(templateUrl:\s*['"][^'"]+['"],?)/;
    const templateMatch = content.match(templateRegex);
    if (templateMatch) {
      return content.replace(
        templateMatch[1],
        templateMatch[1] + '\n  changeDetection: ChangeDetectionStrategy.OnPush,'
      );
    }
  }

  return content;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (!needsOnPush(content)) {
    return { skipped: true, reason: 'already has OnPush or not a component' };
  }

  let newContent = addChangeDetectionImport(content);
  newContent = addOnPushToComponent(newContent);

  if (newContent === content) {
    return { skipped: true, reason: 'could not modify' };
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newContent);
  }

  return { modified: true };
}

// Main
const srcDir = path.join(__dirname, '../src/app');
const files = findComponentFiles(srcDir);

console.log(`🔍 Encontrados ${files.length} archivos de componentes`);
console.log(DRY_RUN ? '🧪 Modo DRY RUN - no se modificarán archivos\n' : '\n');

let modified = 0;
let skipped = 0;
let errors = 0;

files.forEach(file => {
  try {
    const result = processFile(file);
    const relativePath = path.relative(srcDir, file);

    if (result.modified) {
      console.log(`✅ ${relativePath}`);
      modified++;
    } else if (result.skipped) {
      skipped++;
    }
  } catch (err) {
    console.error(`❌ Error en ${file}: ${err.message}`);
    errors++;
  }
});

console.log(`\n📊 Resumen:`);
console.log(`   ✅ Modificados: ${modified}`);
console.log(`   ⏭️  Saltados: ${skipped}`);
console.log(`   ❌ Errores: ${errors}`);

if (DRY_RUN) {
  console.log('\n💡 Ejecuta sin --dry-run para aplicar los cambios');
}
