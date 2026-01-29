#!/usr/bin/env npx ts-node
/**
 * 🔍 Overflow Detection Script
 *
 * Detecta patrones problemáticos que causan overflow en componentes UI:
 * 1. flex-1 sin h-full (no constraina altura en row flex)
 * 2. justify-between sin overflow-hidden (puede empujar contenido fuera)
 * 3. CSS !important en heights (conflictos con Tailwind)
 * 4. Alturas fijas sin overflow-hidden
 *
 * Uso: npx ts-node tools/audit/detect-overflow-issues.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Issue {
  file: string;
  line: number;
  type: 'critical' | 'warning' | 'info';
  pattern: string;
  context: string;
  suggestion: string;
}

const issues: Issue[] = [];

// Patrones problemáticos a detectar
const patterns = {
  // CRÍTICO: flex-1 sin h-full en contexto de flex-col con justify-between (cards)
  flexOneWithoutHeight: {
    regex: /class="[^"]*flex-1(?![^"]*h-full)[^"]*flex\s+flex-col\s+justify-between[^"]*"/g,
    type: 'critical' as const,
    pattern: 'flex-1 + flex-col + justify-between sin h-full',
    suggestion: 'Agregar h-full overflow-hidden para constrainar altura vertical'
  },

  // CRÍTICO: justify-between sin overflow-hidden
  justifyBetweenNoOverflow: {
    regex: /class="[^"]*justify-between(?![^"]*overflow-hidden)[^"]*"/g,
    type: 'warning' as const,
    pattern: 'justify-between sin overflow-hidden',
    suggestion: 'Considerar agregar overflow-hidden si el contenedor tiene altura fija'
  },

  // WARNING: Alturas arbitrarias sin overflow
  fixedHeightNoOverflow: {
    regex: /class="[^"]*h-\[\d+px\](?![^"]*overflow)[^"]*"/g,
    type: 'info' as const,
    pattern: 'Altura fija sin overflow control',
    suggestion: 'Verificar si necesita overflow-hidden para prevenir desbordamiento'
  }
};

// Patrones CSS problemáticos
const cssPatterns = {
  importantHeight: {
    regex: /height:\s*\d+px\s*!important/g,
    type: 'warning' as const, // Warning porque a veces es necesario para librerías externas
    pattern: 'height con !important',
    suggestion: 'Considerar eliminar !important si no es para sobrescribir librería externa'
  },

  importantMinHeight: {
    regex: /min-height:\s*\d+px\s*!important/g,
    type: 'info' as const,
    pattern: 'min-height con !important',
    suggestion: 'Revisar si es necesario para sobrescribir estilos de librería'
  }
};

// Archivos CSS que usan !important intencionalmente (librerías externas)
const cssExclusions = [
  'cars-map.component.css', // Google Maps markers
  'date-range-picker.component.css', // Calendar library
];

async function scanHTMLFiles(): Promise<void> {
  const files = await glob('apps/web/src/**/*.html', {
    ignore: ['**/node_modules/**']
  });

  console.log(`\n📂 Escaneando ${files.length} archivos HTML...\n`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (const [patternName, config] of Object.entries(patterns)) {
      let match;
      const regex = new RegExp(config.regex.source, 'g');

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = lines[lineNumber - 1]?.trim() || '';

        // Filtrar falsos positivos
        if (patternName === 'justifyBetweenNoOverflow') {
          // Solo reportar si es un contenedor con altura fija
          if (!lineContent.includes('h-[') && !lineContent.includes('h-full')) {
            continue;
          }
        }

        issues.push({
          file: file.replace('apps/web/src/', ''),
          line: lineNumber,
          type: config.type,
          pattern: config.pattern,
          context: lineContent.substring(0, 100) + (lineContent.length > 100 ? '...' : ''),
          suggestion: config.suggestion
        });
      }
    }
  }
}

async function scanCSSFiles(): Promise<void> {
  const files = await glob('apps/web/src/**/*.css', {
    ignore: ['**/node_modules/**']
  });

  console.log(`📂 Escaneando ${files.length} archivos CSS...\n`);

  for (const file of files) {
    // Skip archivos excluidos (librerías externas)
    const isExcluded = cssExclusions.some(exc => file.includes(exc));
    if (isExcluded) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (const [patternName, config] of Object.entries(cssPatterns)) {
      let match;
      const regex = new RegExp(config.regex.source, 'g');

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = lines[lineNumber - 1]?.trim() || '';

        issues.push({
          file: file.replace('apps/web/src/', ''),
          line: lineNumber,
          type: config.type,
          pattern: config.pattern,
          context: lineContent.substring(0, 100) + (lineContent.length > 100 ? '...' : ''),
          suggestion: config.suggestion
        });
      }
    }
  }
}

function printReport(): void {
  const critical = issues.filter(i => i.type === 'critical');
  const warnings = issues.filter(i => i.type === 'warning');
  const info = issues.filter(i => i.type === 'info');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔍 OVERFLOW DETECTION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  🔴 Críticos:    ${critical.length}`);
  console.log(`  🟡 Warnings:    ${warnings.length}`);
  console.log(`  🔵 Info:        ${info.length}`);
  console.log(`  ─────────────────────`);
  console.log(`  📊 Total:       ${issues.length}\n`);

  if (critical.length > 0) {
    console.log('\n🔴 PROBLEMAS CRÍTICOS (requieren atención inmediata)\n');
    console.log('─'.repeat(65));

    for (const issue of critical) {
      console.log(`\n📁 ${issue.file}:${issue.line}`);
      console.log(`   Patrón: ${issue.pattern}`);
      console.log(`   Contexto: ${issue.context}`);
      console.log(`   💡 ${issue.suggestion}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n\n🟡 WARNINGS (revisar manualmente)\n');
    console.log('─'.repeat(65));

    // Agrupar por archivo
    const byFile = new Map<string, Issue[]>();
    for (const issue of warnings) {
      const existing = byFile.get(issue.file) || [];
      existing.push(issue);
      byFile.set(issue.file, existing);
    }

    for (const [file, fileIssues] of byFile) {
      console.log(`\n📁 ${file}`);
      for (const issue of fileIssues.slice(0, 5)) { // Limitar a 5 por archivo
        console.log(`   L${issue.line}: ${issue.pattern}`);
      }
      if (fileIssues.length > 5) {
        console.log(`   ... y ${fileIssues.length - 5} más`);
      }
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('  📋 RESUMEN DE ACCIONES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (critical.length > 0) {
    console.log('  1. Revisar todos los issues CRÍTICOS');
    console.log('  2. Agregar h-full overflow-hidden donde sea necesario');
    console.log('  3. Eliminar CSS con !important en heights');
  } else {
    console.log('  ✅ No se encontraron problemas críticos');
  }

  console.log('\n');
}

async function main(): Promise<void> {
  console.log('\n🚀 Iniciando análisis de overflow...\n');

  try {
    await scanHTMLFiles();
    await scanCSSFiles();
    printReport();

    // Exit code basado en issues críticos
    process.exit(issues.filter(i => i.type === 'critical').length > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error durante el análisis:', error);
    process.exit(1);
  }
}

main();
