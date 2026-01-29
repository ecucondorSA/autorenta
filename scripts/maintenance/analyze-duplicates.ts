#!/usr/bin/env npx tsx
/**
 * Analyze Duplicates - Determina cuál versión duplicada es mejor para producción
 *
 * Criterios de evaluación:
 * 1. Uso real (imports, referencias en templates)
 * 2. Completitud (líneas de código, métodos, features)
 * 3. Modernidad (signals vs observables, standalone vs module)
 * 4. Fecha de modificación
 */

import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const webAppPath = 'apps/web/src/app';

interface DuplicateAnalysis {
  name: string;
  versions: VersionAnalysis[];
  recommendation: string;
  action: 'KEEP_FIRST' | 'KEEP_SECOND' | 'MERGE' | 'REVIEW_MANUAL';
}

interface VersionAnalysis {
  path: string;
  selector?: string;
  linesOfCode: number;
  usageCount: number;
  usedIn: string[];
  hasSignals: boolean;
  hasObservables: boolean;
  isStandalone: boolean;
  lastModified: Date;
  methodCount: number;
  importCount: number;
}

function getFileStats(filePath: string): { lines: number; lastModified: Date } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    return {
      lines: content.split('\n').length,
      lastModified: stats.mtime
    };
  } catch {
    return { lines: 0, lastModified: new Date(0) };
  }
}

function analyzeComponent(filePath: string, allHtml: string, allTs: string): VersionAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = getFileStats(filePath);

  // Extraer selector
  const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
  const selector = selectorMatch ? selectorMatch[1] : '';

  // Extraer nombre de clase
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : '';

  // Contar uso en templates
  const templatePattern = new RegExp(`<${selector}[\\s>\/]`, 'g');
  const templateMatches = allHtml.match(templatePattern) || [];

  // Contar imports en otros archivos
  const importPattern = new RegExp(`import\\s*{[^}]*${className}[^}]*}`, 'g');
  const importMatches = allTs.match(importPattern) || [];

  // Encontrar archivos que lo usan
  const usedIn: string[] = [];
  const htmlFiles = globSync(`${webAppPath}/**/*.html`);
  const tsFiles = globSync(`${webAppPath}/**/*.ts`);

  for (const html of htmlFiles) {
    const htmlContent = fs.readFileSync(html, 'utf-8');
    if (templatePattern.test(htmlContent)) {
      usedIn.push(html);
    }
  }

  for (const ts of tsFiles) {
    if (ts === filePath) continue;
    const tsContent = fs.readFileSync(ts, 'utf-8');
    if (new RegExp(`import\\s*{[^}]*${className}`).test(tsContent)) {
      usedIn.push(ts);
    }
  }

  // Detectar modernidad
  const hasSignals = /signal\s*<|signal\(|computed\(|effect\(/.test(content);
  const hasObservables = /Observable|BehaviorSubject|Subject|\.subscribe\(/.test(content);
  const isStandalone = /standalone:\s*true/.test(content);

  // Contar métodos
  const methodMatches = content.match(/(?:async\s+)?(?:public\s+|private\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g) || [];

  // Contar imports
  const importLines = content.match(/import\s+{[^}]+}\s+from/g) || [];

  return {
    path: filePath,
    selector,
    linesOfCode: stats.lines,
    usageCount: templateMatches.length + importMatches.length,
    usedIn,
    hasSignals,
    hasObservables,
    isStandalone,
    lastModified: stats.lastModified,
    methodCount: methodMatches.length,
    importCount: importLines.length
  };
}

function analyzeService(filePath: string, allTs: string): VersionAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const stats = getFileStats(filePath);

  // Extraer nombre de clase
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : '';

  // Contar uso (inyecciones)
  const injectPattern = new RegExp(`inject\\(${className}\\)|private\\s+\\w+:\\s*${className}|constructor\\([^)]*${className}`, 'g');
  const injectMatches = allTs.match(injectPattern) || [];

  // Encontrar archivos que lo usan
  const usedIn: string[] = [];
  const tsFiles = globSync(`${webAppPath}/**/*.ts`);

  for (const ts of tsFiles) {
    if (ts === filePath) continue;
    const tsContent = fs.readFileSync(ts, 'utf-8');
    if (new RegExp(`${className}`).test(tsContent)) {
      usedIn.push(ts);
    }
  }

  // Detectar modernidad
  const hasSignals = /signal\s*<|signal\(|computed\(|effect\(/.test(content);
  const hasObservables = /Observable|BehaviorSubject|Subject/.test(content);
  const isStandalone = /providedIn:\s*['"]root['"]/.test(content);

  // Contar métodos públicos
  const methodMatches = content.match(/(?:async\s+)?(?:public\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g) || [];

  // Contar imports
  const importLines = content.match(/import\s+{[^}]+}\s+from/g) || [];

  return {
    path: filePath,
    linesOfCode: stats.lines,
    usageCount: injectMatches.length,
    usedIn: [...new Set(usedIn)].slice(0, 10),
    hasSignals,
    hasObservables,
    isStandalone,
    lastModified: stats.lastModified,
    methodCount: methodMatches.length,
    importCount: importLines.length
  };
}

function recommend(v1: VersionAnalysis, v2: VersionAnalysis): { recommendation: string; action: DuplicateAnalysis['action'] } {
  const scores = { v1: 0, v2: 0 };
  const reasons: string[] = [];

  // 1. Uso real (peso: 40%)
  if (v1.usageCount > v2.usageCount) {
    scores.v1 += 40;
    reasons.push(`V1 más usada (${v1.usageCount} vs ${v2.usageCount} refs)`);
  } else if (v2.usageCount > v1.usageCount) {
    scores.v2 += 40;
    reasons.push(`V2 más usada (${v2.usageCount} vs ${v1.usageCount} refs)`);
  }

  // 2. Modernidad - Signals (peso: 25%)
  if (v1.hasSignals && !v2.hasSignals) {
    scores.v1 += 25;
    reasons.push('V1 usa Signals (moderno)');
  } else if (v2.hasSignals && !v1.hasSignals) {
    scores.v2 += 25;
    reasons.push('V2 usa Signals (moderno)');
  }

  // 3. Standalone (peso: 15%)
  if (v1.isStandalone && !v2.isStandalone) {
    scores.v1 += 15;
    reasons.push('V1 es standalone');
  } else if (v2.isStandalone && !v1.isStandalone) {
    scores.v2 += 15;
    reasons.push('V2 es standalone');
  }

  // 4. Completitud (peso: 10%)
  if (v1.linesOfCode > v2.linesOfCode * 1.2) {
    scores.v1 += 10;
    reasons.push(`V1 más completa (${v1.linesOfCode} vs ${v2.linesOfCode} líneas)`);
  } else if (v2.linesOfCode > v1.linesOfCode * 1.2) {
    scores.v2 += 10;
    reasons.push(`V2 más completa (${v2.linesOfCode} vs ${v1.linesOfCode} líneas)`);
  }

  // 5. Fecha (peso: 10%)
  if (v1.lastModified > v2.lastModified) {
    scores.v1 += 10;
    reasons.push('V1 más reciente');
  } else if (v2.lastModified > v1.lastModified) {
    scores.v2 += 10;
    reasons.push('V2 más reciente');
  }

  // Determinar acción
  let action: DuplicateAnalysis['action'];
  let recommendation: string;

  const diff = Math.abs(scores.v1 - scores.v2);

  if (v1.usageCount === 0 && v2.usageCount === 0) {
    action = 'REVIEW_MANUAL';
    recommendation = `⚠️ AMBAS SIN USO - Revisar si alguna es necesaria. ${reasons.join('. ')}`;
  } else if (v1.usageCount === 0) {
    action = 'KEEP_SECOND';
    recommendation = `🗑️ ELIMINAR V1 (sin uso) → Mantener V2. ${reasons.join('. ')}`;
  } else if (v2.usageCount === 0) {
    action = 'KEEP_FIRST';
    recommendation = `🗑️ ELIMINAR V2 (sin uso) → Mantener V1. ${reasons.join('. ')}`;
  } else if (diff < 15) {
    action = 'MERGE';
    recommendation = `🔀 MERGE REQUERIDO - Ambas se usan. ${reasons.join('. ')}`;
  } else if (scores.v1 > scores.v2) {
    action = 'KEEP_FIRST';
    recommendation = `✅ MANTENER V1, migrar refs de V2. ${reasons.join('. ')}`;
  } else {
    action = 'KEEP_SECOND';
    recommendation = `✅ MANTENER V2, migrar refs de V1. ${reasons.join('. ')}`;
  }

  return { recommendation, action };
}

// Main
async function main() {
  console.log('🔍 Analizando duplicaciones para determinar versión óptima...\n');

  // Cargar todo el contenido para búsquedas
  const htmlFiles = globSync(`${webAppPath}/**/*.html`);
  const tsFiles = globSync(`${webAppPath}/**/*.ts`);
  const allHtml = htmlFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');
  const allTs = tsFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');

  const results: DuplicateAnalysis[] = [];

  // ============================================
  // COMPONENTES DUPLICADOS
  // ============================================
  console.log('=' .repeat(70));
  console.log('📦 COMPONENTES DUPLICADOS');
  console.log('='.repeat(70));

  const componentDuplicates = [
    {
      name: 'Card',
      files: [
        'apps/web/src/app/shared/components/card/card.component.ts',
        'apps/web/src/app/features/marketplace/components/ui/card.component.ts'
      ]
    },
    {
      name: 'Button',
      files: [
        'apps/web/src/app/shared/components/button/button.component.ts',
        'apps/web/src/app/features/marketplace/components/ui/button.component.ts'
      ]
    },
    {
      name: 'BottomSheet',
      files: [
        'apps/web/src/app/shared/components/bottom-sheet/bottom-sheet.component.ts',
        'apps/web/src/app/features/marketplace/components/ui/bottom-sheet.component.ts'
      ]
    },
    {
      name: 'BookingPricingBreakdown',
      files: [
        'apps/web/src/app/shared/components/booking-pricing-breakdown/booking-pricing-breakdown.component.ts',
        'apps/web/src/app/features/bookings/booking-detail/booking-pricing-breakdown.component.ts'
      ]
    },
    {
      name: 'BookingLocationForm',
      files: [
        'apps/web/src/app/shared/components/booking-location-form/booking-location-form.component.ts',
        'apps/web/src/app/features/bookings/components/booking-location-form/booking-location-form.component.ts'
      ]
    },
    {
      name: 'BookingChat',
      files: [
        'apps/web/src/app/shared/components/booking-chat/booking-chat.component.ts',
        'apps/web/src/app/features/experiences/communication/chat-context-wrappers/booking-chat-wrapper.component.ts'
      ]
    }
  ];

  for (const dup of componentDuplicates) {
    if (!fs.existsSync(dup.files[0]) || !fs.existsSync(dup.files[1])) {
      console.log(`\n⚠️ ${dup.name}: Archivo no encontrado, saltando...`);
      continue;
    }

    const v1 = analyzeComponent(dup.files[0], allHtml, allTs);
    const v2 = analyzeComponent(dup.files[1], allHtml, allTs);
    const { recommendation, action } = recommend(v1, v2);

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📦 ${dup.name}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`\n  V1: ${v1.path}`);
    console.log(`      Selector: ${v1.selector}`);
    console.log(`      Líneas: ${v1.linesOfCode} | Métodos: ${v1.methodCount} | Imports: ${v1.importCount}`);
    console.log(`      Uso: ${v1.usageCount} referencias`);
    console.log(`      Signals: ${v1.hasSignals ? '✅' : '❌'} | Standalone: ${v1.isStandalone ? '✅' : '❌'}`);
    console.log(`      Modificado: ${v1.lastModified.toISOString().split('T')[0]}`);
    if (v1.usedIn.length > 0) {
      console.log(`      Usado en:`);
      v1.usedIn.slice(0, 3).forEach(f => console.log(`        - ${f}`));
      if (v1.usedIn.length > 3) console.log(`        ... y ${v1.usedIn.length - 3} más`);
    }

    console.log(`\n  V2: ${v2.path}`);
    console.log(`      Selector: ${v2.selector}`);
    console.log(`      Líneas: ${v2.linesOfCode} | Métodos: ${v2.methodCount} | Imports: ${v2.importCount}`);
    console.log(`      Uso: ${v2.usageCount} referencias`);
    console.log(`      Signals: ${v2.hasSignals ? '✅' : '❌'} | Standalone: ${v2.isStandalone ? '✅' : '❌'}`);
    console.log(`      Modificado: ${v2.lastModified.toISOString().split('T')[0]}`);
    if (v2.usedIn.length > 0) {
      console.log(`      Usado en:`);
      v2.usedIn.slice(0, 3).forEach(f => console.log(`        - ${f}`));
      if (v2.usedIn.length > 3) console.log(`        ... y ${v2.usedIn.length - 3} más`);
    }

    console.log(`\n  📋 RECOMENDACIÓN: ${recommendation}`);
    console.log(`  🎯 ACCIÓN: ${action}`);

    results.push({ name: dup.name, versions: [v1, v2], recommendation, action });
  }

  // ============================================
  // SERVICIOS DUPLICADOS
  // ============================================
  console.log('\n\n' + '='.repeat(70));
  console.log('🔧 SERVICIOS DUPLICADOS');
  console.log('='.repeat(70));

  const serviceDuplicates = [
    {
      name: 'OrganizationService',
      files: [
        'apps/web/src/app/features/organizations/services/organization.service.ts',
        'apps/web/src/app/core/services/organization.service.ts'
      ]
    },
    {
      name: 'FranchiseTableService',
      files: [
        'apps/web/src/app/features/bookings/checkout/support/franchise-table.service.ts',
        'apps/web/src/app/core/services/franchise-table.service.ts'
      ]
    }
  ];

  for (const dup of serviceDuplicates) {
    if (!fs.existsSync(dup.files[0]) || !fs.existsSync(dup.files[1])) {
      console.log(`\n⚠️ ${dup.name}: Archivo no encontrado, saltando...`);
      continue;
    }

    const v1 = analyzeService(dup.files[0], allTs);
    const v2 = analyzeService(dup.files[1], allTs);
    const { recommendation, action } = recommend(v1, v2);

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`🔧 ${dup.name}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`\n  V1: ${v1.path}`);
    console.log(`      Líneas: ${v1.linesOfCode} | Métodos: ${v1.methodCount}`);
    console.log(`      Uso: ${v1.usageCount} inyecciones`);
    console.log(`      Signals: ${v1.hasSignals ? '✅' : '❌'} | providedIn root: ${v1.isStandalone ? '✅' : '❌'}`);

    console.log(`\n  V2: ${v2.path}`);
    console.log(`      Líneas: ${v2.linesOfCode} | Métodos: ${v2.methodCount}`);
    console.log(`      Uso: ${v2.usageCount} inyecciones`);
    console.log(`      Signals: ${v2.hasSignals ? '✅' : '❌'} | providedIn root: ${v2.isStandalone ? '✅' : '❌'}`);

    console.log(`\n  📋 RECOMENDACIÓN: ${recommendation}`);
    console.log(`  🎯 ACCIÓN: ${action}`);

    results.push({ name: dup.name, versions: [v1, v2], recommendation, action });
  }

  // ============================================
  // RESUMEN EJECUTIVO
  // ============================================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RESUMEN EJECUTIVO - PLAN DE ACCIÓN');
  console.log('='.repeat(70));

  const toDelete: string[] = [];
  const toMerge: string[] = [];
  const toReview: string[] = [];

  for (const r of results) {
    if (r.action === 'KEEP_FIRST') {
      toDelete.push(`${r.name}: Eliminar ${r.versions[1].path}`);
    } else if (r.action === 'KEEP_SECOND') {
      toDelete.push(`${r.name}: Eliminar ${r.versions[0].path}`);
    } else if (r.action === 'MERGE') {
      toMerge.push(`${r.name}: Merge ${r.versions[0].path} + ${r.versions[1].path}`);
    } else {
      toReview.push(`${r.name}: Revisión manual requerida`);
    }
  }

  console.log('\n🗑️ PARA ELIMINAR (automático):');
  if (toDelete.length === 0) {
    console.log('  Ninguno');
  } else {
    toDelete.forEach(d => console.log(`  - ${d}`));
  }

  console.log('\n🔀 PARA MERGE (manual):');
  if (toMerge.length === 0) {
    console.log('  Ninguno');
  } else {
    toMerge.forEach(m => console.log(`  - ${m}`));
  }

  console.log('\n⚠️ REVISIÓN MANUAL:');
  if (toReview.length === 0) {
    console.log('  Ninguno');
  } else {
    toReview.forEach(r => console.log(`  - ${r}`));
  }

  // Guardar reporte
  fs.writeFileSync('duplicate-analysis-report.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Reporte guardado en: duplicate-analysis-report.json');
}

main().catch(console.error);
