#!/usr/bin/env node

/**
 * 🎨 Script de Migración de Colores - AutoRenta
 *
 * Migra clases legacy de colores a los nuevos tokens semánticos.
 * 
 * Uso: node tools/migrate-colors.mjs [--dry-run] [--file path/to/file]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════
// MAPA DE MIGRACIÓN
// ═══════════════════════════════════════════════════════════════

const MIGRATION_MAP = {
  // Fondos Light Mode
  'bg-ivory-soft': 'bg-surface-base',
  'bg-sand-light': 'bg-surface-secondary',
  'bg-white-pure': 'bg-surface-raised',
  'bg-pearl-light': 'bg-surface-secondary',
  'bg-pearl-gray': 'bg-border-default',
  
  // Fondos Dark Mode (mantener dark: pero cambiar clase)
  'dark:bg-graphite-dark': 'dark:bg-surface-base',
  'dark:bg-anthracite': 'dark:bg-surface-raised',
  'dark:bg-slate-deep': 'dark:bg-surface-secondary',
  'dark:bg-slate-deep-pure': 'dark:bg-surface-raised',
  'dark:bg-slate-800': 'dark:bg-surface-raised',
  'dark:bg-surface-secondary-pure': 'dark:bg-surface-raised', // Fix para casos especiales
  'dark:from-slate-deep/80': 'dark:from-surface-secondary/80',
  'dark:to-slate-deep/50': 'dark:to-surface-secondary/50',
  
  // Textos Light Mode
  'text-smoke-black': 'text-text-primary',
  'text-charcoal-medium': 'text-text-secondary',
  'text-ash-gray': 'text-text-muted',
  'text-charcoal-light': 'text-text-secondary',
  'placeholder-charcoal-light': 'placeholder:text-text-muted',
  
  // Textos Dark Mode
  'dark:text-ivory-luminous': 'dark:text-text-primary',
  'dark:text-pearl-light': 'dark:text-text-secondary',
  
  // Bordes
  'border-pearl-gray': 'border-border-default',
  'dark:border-pearl-gray': 'dark:border-border-default',
  
  // Acentos (cambiar a nuevos tokens azules pastel)
  'bg-accent-petrol': 'bg-cta-default',
  'text-accent-petrol': 'text-cta-default',
  'hover:bg-accent-petrol': 'hover:bg-cta-hover',
  'hover:text-accent-petrol': 'hover:text-cta-default',
  'ring-accent-petrol': 'ring-cta-default',
  'border-accent-petrol': 'border-cta-default',
  'from-accent-petrol': 'from-cta-default',
  'to-accent-petrol': 'to-cta-default',
  'via-accent-petrol': 'via-cta-default',
  'hover:from-accent-petrol': 'hover:from-cta-hover',
  'hover:to-accent-petrol': 'hover:to-cta-hover',
  'hover:via-accent-petrol': 'hover:via-cta-hover',
  'dark:from-accent-petrol': 'dark:from-cta-default',
  'dark:to-accent-petrol': 'dark:to-cta-default',
  'dark:via-accent-petrol': 'dark:via-cta-default',
  
  'bg-accent-warm': 'bg-warning-light',
  'text-accent-warm': 'text-warning-light',
  'border-accent-warm': 'border-warning-light',
  'from-accent-warm': 'from-warning-light',
  'to-accent-warm': 'to-warning-light',
  'via-accent-warm': 'via-warning-light',
  'hover:from-accent-warm': 'hover:from-warning-light',
  'hover:to-accent-warm': 'hover:to-warning-light',
  'hover:via-accent-warm': 'hover:via-warning-light',
  'dark:from-accent-warm': 'dark:from-warning-light',
  'dark:to-accent-warm': 'dark:to-warning-light',
  'dark:via-accent-warm': 'dark:via-warning-light',
  
  // Clases específicas comunes (solo cuando no están en contexto de fondo claro)
  // Nota: bg-white se mantiene en algunos casos específicos, pero generalmente debe ser bg-surface-raised
  'bg-white': 'bg-surface-raised', // Migrar bg-white a surface-raised
  'dark:bg-white': 'dark:bg-surface-raised',
  'text-white': 'text-text-inverse', // En contextos donde hay fondo oscuro
  'dark:text-white': 'dark:text-text-inverse',
  
  // ─── Migración de Colores Verde (Success) ───
  // Reemplazar verde brillante por verde oliva suave (success-light)
  'bg-green-50': 'bg-success-light/10',
  'bg-green-100': 'bg-success-light/20',
  'bg-green-200': 'bg-success-light/30',
  'bg-green-300': 'bg-success-light/40',
  'bg-green-400': 'bg-success-light/50',
  'bg-green-500': 'bg-success-light',
  'bg-green-600': 'bg-success-light',
  'bg-green-700': 'bg-success-light',
  'bg-green-800': 'bg-success-light',
  'bg-green-900': 'bg-success-light',
  'text-green-50': 'text-success-light',
  'text-green-100': 'text-success-light',
  'text-green-200': 'text-success-light',
  'text-green-300': 'text-success-light',
  'text-green-400': 'text-success-light',
  'text-green-500': 'text-success-light',
  'text-green-600': 'text-success-light',
  'text-green-700': 'text-success-light',
  'text-green-800': 'text-success-light',
  'text-green-900': 'text-success-light',
  'border-green-50': 'border-success-light/20',
  'border-green-100': 'border-success-light/30',
  'border-green-200': 'border-success-light/40',
  'border-green-300': 'border-success-light/50',
  'border-green-400': 'border-success-light',
  'border-green-500': 'border-success-light',
  'border-green-600': 'border-success-light',
  'border-green-700': 'border-success-light',
  'border-green-800': 'border-success-light',
  'border-green-900': 'border-success-light',
  'dark:bg-green-900/40': 'dark:bg-success-light/20',
  'dark:text-green-200': 'dark:text-success-light',
  
  // ─── Migración de Colores Azul Marino (Info/Blue) ───
  // Reemplazar azul marino por azul pastel (cta-default)
  'bg-blue-50': 'bg-cta-default/10',
  'bg-blue-100': 'bg-cta-default/20',
  'bg-blue-200': 'bg-cta-default/30',
  'bg-blue-300': 'bg-cta-default/40',
  'bg-blue-400': 'bg-cta-default/50',
  'bg-blue-500': 'bg-cta-default',
  'bg-blue-600': 'bg-cta-default',
  'bg-blue-700': 'bg-cta-default',
  'bg-blue-800': 'bg-cta-default',
  'bg-blue-900': 'bg-cta-default',
  'text-blue-50': 'text-cta-default',
  'text-blue-100': 'text-cta-default',
  'text-blue-200': 'text-cta-default',
  'text-blue-300': 'text-cta-default',
  'text-blue-400': 'text-cta-default',
  'text-blue-500': 'text-cta-default',
  'text-blue-600': 'text-cta-default',
  'text-blue-700': 'text-cta-default',
  'text-blue-800': 'text-cta-default',
  'text-blue-900': 'text-cta-default',
  'border-blue-50': 'border-cta-default/20',
  'border-blue-100': 'border-cta-default/30',
  'border-blue-200': 'border-cta-default/40',
  'border-blue-300': 'border-cta-default/50',
  'border-blue-400': 'border-cta-default',
  'border-blue-500': 'border-cta-default',
  'border-blue-600': 'border-cta-default',
  'border-blue-700': 'border-cta-default',
  'border-blue-800': 'border-cta-default',
  'border-blue-900': 'border-cta-default',
  
  // ─── Migración de Colores Info (Azul marino) ───
  'bg-info-50': 'bg-cta-default/10',
  'bg-info-100': 'bg-cta-default/20',
  'bg-info-200': 'bg-cta-default/30',
  'bg-info-300': 'bg-cta-default/40',
  'bg-info-400': 'bg-cta-default/50',
  'bg-info-500': 'bg-cta-default',
  'bg-info-600': 'bg-cta-default',
  'bg-info-700': 'bg-cta-default',
  'bg-info-800': 'bg-cta-default',
  'bg-info-900': 'bg-cta-default',
  'text-info-50': 'text-cta-default',
  'text-info-100': 'text-cta-default',
  'text-info-200': 'text-cta-default',
  'text-info-300': 'text-cta-default',
  'text-info-400': 'text-cta-default',
  'text-info-500': 'text-cta-default',
  'text-info-600': 'text-cta-default',
  'text-info-700': 'text-cta-default',
  'text-info-800': 'text-cta-default',
  'text-info-900': 'text-cta-default',
  
  // ─── Migración de Emerald/Teal (variantes de verde) ───
  'bg-emerald-50': 'bg-success-light/10',
  'bg-emerald-100': 'bg-success-light/20',
  'bg-emerald-200': 'bg-success-light/30',
  'bg-emerald-300': 'bg-success-light/40',
  'bg-emerald-400': 'bg-success-light/50',
  'bg-emerald-500': 'bg-success-light',
  'bg-emerald-600': 'bg-success-light',
  'bg-emerald-700': 'bg-success-light',
  'bg-emerald-800': 'bg-success-light',
  'bg-emerald-900': 'bg-success-light',
  'text-emerald-50': 'text-success-light',
  'text-emerald-100': 'text-success-light',
  'text-emerald-200': 'text-success-light',
  'text-emerald-300': 'text-success-light',
  'text-emerald-400': 'text-success-light',
  'text-emerald-500': 'text-success-light',
  'text-emerald-600': 'text-success-light',
  'text-emerald-700': 'text-success-light',
  'text-emerald-800': 'text-success-light',
  'text-emerald-900': 'text-success-light',
  
  'bg-teal-50': 'bg-success-light/10',
  'bg-teal-100': 'bg-success-light/20',
  'bg-teal-200': 'bg-success-light/30',
  'bg-teal-300': 'bg-success-light/40',
  'bg-teal-400': 'bg-success-light/50',
  'bg-teal-500': 'bg-success-light',
  'bg-teal-600': 'bg-success-light',
  'bg-teal-700': 'bg-success-light',
  'bg-teal-800': 'bg-success-light',
  'bg-teal-900': 'bg-success-light',
  'text-teal-50': 'text-success-light',
  'text-teal-100': 'text-success-light',
  'text-teal-200': 'text-success-light',
  'text-teal-300': 'text-success-light',
  'text-teal-400': 'text-success-light',
  'text-teal-500': 'text-success-light',
  'text-teal-600': 'text-success-light',
  'text-teal-700': 'text-success-light',
  'text-teal-800': 'text-success-light',
  'text-teal-900': 'text-success-light',
  
  // ─── Gradientes y variantes especiales ───
  'from-blue-50': 'from-cta-default/10',
  'from-blue-100': 'from-cta-default/20',
  'from-blue-400': 'from-cta-default',
  'from-blue-500': 'from-cta-default',
  'from-blue-600': 'from-cta-default',
  'from-blue-700': 'from-cta-default',
  'from-blue-900': 'from-cta-default',
  'to-blue-50': 'to-cta-default/10',
  'to-blue-100': 'to-cta-default/20',
  'to-blue-600': 'to-cta-default',
  'to-blue-700': 'to-cta-default',
  'to-indigo-50': 'to-cta-default/10',
  'to-indigo-600': 'to-cta-default',
  'to-indigo-900': 'to-cta-default',
  'ring-blue-500': 'ring-cta-default',
  'focus:ring-blue-500': 'focus:ring-cta-default',
  'dark:from-blue-900/20': 'dark:from-cta-default/20',
  'dark:to-indigo-900/20': 'dark:to-cta-default/20',
  
  // ─── Gradientes con verde (success) ───
  'from-green-50': 'from-success-light/10',
  'from-green-500': 'from-success-light',
  'from-green-600': 'from-success-light',
  'to-green-50': 'to-success-light/10',
  'to-green-500': 'to-success-light',
  'to-green-600': 'to-success-light',
  'dark:from-green-500': 'dark:from-success-light',
  'dark:from-green-600': 'dark:from-success-light',
  'dark:to-green-500': 'dark:to-success-light',
  'dark:to-green-600': 'dark:to-success-light',
  'dark:from-green-900/20': 'dark:from-success-light/20',
  'dark:to-blue-900/20': 'dark:to-cta-default/20',
  'hover:from-green-600': 'hover:from-success-light',
  'hover:to-blue-700': 'hover:to-cta-default',
  'dark:hover:from-green-600': 'dark:hover:from-success-light',
  'dark:hover:to-blue-700': 'dark:hover:to-cta-default',
  'focus:ring-green-500': 'focus:ring-success-light',
  'dark:focus:ring-green-400': 'dark:focus:ring-success-light',
  
  // ─── Gradientes con amarillo/naranja (warning) ───
  'from-yellow-500': 'from-warning-light',
  'from-yellow-600': 'from-warning-light',
  'to-yellow-500': 'to-warning-light',
  'to-yellow-600': 'to-warning-light',
  'from-orange-500': 'from-warning-light',
  'from-orange-600': 'from-warning-light',
  'to-orange-500': 'to-warning-light',
  'to-orange-600': 'to-warning-light',
  
  // ─── Info con variantes específicas ───
  'border-info-500': 'border-cta-default',
  'border-info-700': 'border-cta-default',
  'dark:border-info-500': 'dark:border-cta-default',
  'dark:border-info-500/40': 'dark:border-cta-default/40',
  'dark:border-info-700': 'dark:border-cta-default',
  
  // ─── Orange (Warning) - Migrar a warning-light
  'bg-orange-50': 'bg-warning-light/10',
  'bg-orange-100': 'bg-warning-light/20',
  'bg-orange-200': 'bg-warning-light/30',
  'bg-orange-300': 'bg-warning-light/40',
  'bg-orange-400': 'bg-warning-light/50',
  'bg-orange-500': 'bg-warning-light',
  'bg-orange-600': 'bg-warning-light',
  'bg-orange-700': 'bg-warning-light',
  'bg-orange-800': 'bg-warning-light',
  'bg-orange-900': 'bg-warning-light',
  'text-orange-50': 'text-warning-light',
  'text-orange-100': 'text-warning-light',
  'text-orange-200': 'text-warning-light',
  'text-orange-300': 'text-warning-light',
  'text-orange-400': 'text-warning-light',
  'text-orange-500': 'text-warning-light',
  'text-orange-600': 'text-warning-light',
  'text-orange-700': 'text-warning-light',
  'text-orange-800': 'text-warning-light',
  'text-orange-900': 'text-warning-light',
  'border-orange-50': 'border-warning-light/20',
  'border-orange-100': 'border-warning-light/30',
  'border-orange-200': 'border-warning-light/40',
  'border-orange-300': 'border-warning-light/50',
  'border-orange-400': 'border-warning-light',
  'border-orange-500': 'border-warning-light',
  'border-orange-600': 'border-warning-light',
  'border-orange-700': 'border-warning-light',
  'border-orange-800': 'border-warning-light',
  'border-orange-900': 'border-warning-light',
  'dark:bg-orange-900/40': 'dark:bg-warning-light/20',
  'dark:text-orange-200': 'dark:text-warning-light',
  
  // ─── Indigo (variante de azul) ───
  'bg-indigo-50': 'bg-cta-default/10',
  'bg-indigo-100': 'bg-cta-default/20',
  'bg-indigo-200': 'bg-cta-default/30',
  'bg-indigo-300': 'bg-cta-default/40',
  'bg-indigo-400': 'bg-cta-default/50',
  'bg-indigo-500': 'bg-cta-default',
  'bg-indigo-600': 'bg-cta-default',
  'bg-indigo-700': 'bg-cta-default',
  'bg-indigo-800': 'bg-cta-default',
  'bg-indigo-900': 'bg-cta-default',
  'text-indigo-50': 'text-cta-default',
  'text-indigo-100': 'text-cta-default',
  'text-indigo-200': 'text-cta-default',
  'text-indigo-300': 'text-cta-default',
  'text-indigo-400': 'text-cta-default',
  'text-indigo-500': 'text-cta-default',
  'text-indigo-600': 'text-cta-default',
  'text-indigo-700': 'text-cta-default',
  'text-indigo-800': 'text-cta-default',
  'text-indigo-900': 'text-cta-default',
};

// ═══════════════════════════════════════════════════════════════
// FUNCIONES
// ═══════════════════════════════════════════════════════════════

function migrateFile(filePath, dryRun = false) {
  if (!existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return { changed: false, errors: [`File not found: ${filePath}`] };
  }

  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const changes = [];

  // Aplicar migraciones
  for (const [oldClass, newClass] of Object.entries(MIGRATION_MAP)) {
    // Buscar la clase completa (con espacios antes/después o al inicio/fin)
    const regex = new RegExp(`\\b${oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = content.match(regex);
    
    if (matches) {
      content = content.replace(regex, newClass);
      changes.push({
        old: oldClass,
        new: newClass,
        count: matches.length,
      });
    }
  }

  if (content !== originalContent) {
    if (!dryRun) {
      writeFileSync(filePath, content, 'utf-8');
    }
    return { changed: true, changes, dryRun };
  }

  return { changed: false, changes: [] };
}

function findFiles(dir, extensions = ['.html', '.ts', '.css'], results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .angular
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findFiles(fullPath, extensions, results);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  
  return results;
}

function migrateDirectory(dir, dryRun = false) {
  const files = findFiles(dir);
  const results = [];

  for (const file of files) {
    const result = migrateFile(file, dryRun);
    if (result.changed) {
      results.push({ file, ...result });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const specificFile = fileArg ? fileArg.split('=')[1] : null;

  console.log('🎨 Migración de Colores - AutoRenta\n');
  console.log(`Modo: ${dryRun ? 'DRY RUN (no se guardarán cambios)' : 'PRODUCCIÓN'}\n`);

  let results = [];

  if (specificFile) {
    // Migrar archivo específico
    const filePath = join(PROJECT_ROOT, specificFile);
    const result = migrateFile(filePath, dryRun);
    if (result.changed) {
      results.push({ file: filePath, ...result });
    }
  } else {
    // Migrar todos los archivos
    const srcDir = join(PROJECT_ROOT, 'apps/web/src/app');
    
    console.log('Buscando archivos HTML, TS y CSS...\n');
    
    results = migrateDirectory(srcDir, dryRun);
  }

  // Resumen
  console.log('═'.repeat(60));
  console.log(`Archivos migrados: ${results.length}`);
  console.log('═'.repeat(60));

  let totalChanges = 0;
  for (const result of results) {
    console.log(`\n📄 ${result.file.replace(PROJECT_ROOT + '/', '')}`);
    for (const change of result.changes) {
      console.log(`   ${change.old} → ${change.new} (${change.count}x)`);
      totalChanges += change.count;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`Total de reemplazos: ${totalChanges}`);
  console.log('═'.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No se guardaron cambios');
    console.log('Ejecuta sin --dry-run para aplicar los cambios');
  } else if (results.length > 0) {
    console.log('\n✅ Migración completada');
  } else {
    console.log('\nℹ️  No se encontraron cambios necesarios');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateFile, migrateDirectory, MIGRATION_MAP };

