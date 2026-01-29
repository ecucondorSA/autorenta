#!/usr/bin/env npx tsx
/**
 * Análisis Socrático de Huérfanos
 *
 * Para cada huérfano preguntamos:
 * 1. ¿Qué problema resuelve? (propósito)
 * 2. ¿Existe algo similar que ya lo resuelve? (redundancia)
 * 3. ¿Se usa en algún flujo crítico? (importancia)
 * 4. ¿Está completo o es un stub? (madurez)
 * 5. ¿Tiene dependencias que lo necesitan? (dependientes)
 *
 * Categorías de resultado:
 * - ELIMINAR: No sirve, redundante, o incompleto sin valor
 * - INTEGRAR: Valioso, completo, debe conectarse a la UI
 * - REFACTORIZAR: Tiene valor pero necesita trabajo
 * - BACKEND_ONLY: Es solo para backend (CRON, triggers)
 * - REVISAR: Necesita decisión humana
 */

import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

const webAppPath = 'apps/web/src/app';

interface OrphanAnalysis {
  name: string;
  path: string;
  type: 'component' | 'service' | 'rpc' | 'table';
  category: 'ELIMINAR' | 'INTEGRAR' | 'REFACTORIZAR' | 'BACKEND_ONLY' | 'REVISAR';
  reasoning: {
    purpose: string;
    redundancy: string;
    importance: string;
    maturity: string;
    dependencies: string;
  };
  recommendation: string;
  linesOfCode?: number;
  hasTests?: boolean;
}

// Leer contenido de archivo
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Analizar propósito basado en nombre y contenido
function analyzePurpose(name: string, content: string, type: string): string {
  // Patrones comunes
  const patterns: Record<string, string> = {
    // Componentes UI
    'card': 'UI: Mostrar información en tarjetas',
    'button': 'UI: Botón reutilizable',
    'modal': 'UI: Diálogo modal',
    'form': 'UI: Formulario de entrada',
    'list': 'UI: Lista de elementos',
    'badge': 'UI: Indicador visual',
    'banner': 'UI: Banner informativo',
    'toast': 'UI: Notificación temporal',
    'skeleton': 'UI: Placeholder de carga',
    'chip': 'UI: Etiqueta/chip',
    'fab': 'UI: Botón flotante',
    'bottom-sheet': 'UI: Panel inferior deslizable',
    'sidebar': 'UI: Barra lateral',

    // Funcionalidad de negocio
    'booking': 'Negocio: Gestión de reservas',
    'payment': 'Negocio: Procesamiento de pagos',
    'wallet': 'Negocio: Billetera/fondos',
    'dispute': 'Negocio: Gestión de disputas',
    'review': 'Negocio: Reseñas y calificaciones',
    'verification': 'Negocio: Verificación de usuarios',
    'insurance': 'Negocio: Seguros/cobertura',
    'checkin': 'Negocio: Check-in de vehículos',
    'checkout': 'Negocio: Check-out de vehículos',
    'damage': 'Negocio: Reporte de daños',
    'contract': 'Negocio: Contratos',
    'payout': 'Negocio: Pagos a propietarios',
    'settlement': 'Negocio: Liquidaciones',
    'fgo': 'Negocio: Fondo de Garantía',
    'accounting': 'Negocio: Contabilidad',
    'analytics': 'Negocio: Análisis/métricas',
    'admin': 'Admin: Panel de administración',
    'organization': 'Negocio: Organizaciones/flotas',
    'driver': 'Negocio: Conductores',
    'bonus': 'Negocio: Sistema de bonificaciones',
    'malus': 'Negocio: Sistema de penalizaciones',
    'risk': 'Negocio: Evaluación de riesgo',
    'fraud': 'Negocio: Detección de fraude',
    'suspension': 'Negocio: Suspensión de cuentas',
    'infraction': 'Negocio: Multas de tránsito',
    'traffic': 'Negocio: Multas de tránsito',
    'accident': 'Negocio: Accidentes',
    'fuel': 'Negocio: Combustible',
    'extension': 'Negocio: Extensión de reservas',
    'cancellation': 'Negocio: Cancelaciones',
    'refund': 'Negocio: Reembolsos',

    // Backend/CRON
    'cron': 'Backend: Job programado',
    'trigger': 'Backend: Trigger de DB',
    'sync': 'Backend: Sincronización',
    'notify': 'Backend: Notificaciones',
    'expire': 'Backend: Expiración automática',
    'update_': 'Backend: Actualización automática',
    'process_': 'Backend: Procesamiento automático',
    'calculate_': 'Backend: Cálculo automático',
    'refresh_': 'Backend: Refrescar datos',
  };

  const nameLower = name.toLowerCase();
  for (const [pattern, purpose] of Object.entries(patterns)) {
    if (nameLower.includes(pattern)) {
      return purpose;
    }
  }

  // Analizar contenido para más contexto
  if (content.includes('@Input') || content.includes('selector:')) {
    return 'UI: Componente de interfaz';
  }
  if (content.includes('@Injectable') || content.includes('providedIn')) {
    return 'Servicio: Lógica de negocio';
  }
  if (content.includes('CREATE FUNCTION') || content.includes('CREATE OR REPLACE')) {
    return 'RPC: Función de base de datos';
  }
  if (content.includes('CREATE TABLE')) {
    return 'Tabla: Almacenamiento de datos';
  }

  return 'Desconocido: Requiere análisis manual';
}

// Analizar redundancia
function analyzeRedundancy(name: string, allFiles: string[]): string {
  const nameLower = name.toLowerCase().replace(/component|service|page/gi, '');
  const similar = allFiles.filter(f => {
    const baseName = path.basename(f).toLowerCase();
    return baseName.includes(nameLower) || nameLower.includes(baseName.replace(/\.(ts|sql)$/, ''));
  });

  if (similar.length > 2) {
    return `POSIBLE DUPLICADO: ${similar.length - 1} archivos similares encontrados`;
  }
  return 'Único: No hay componentes similares';
}

// Analizar madurez del código
function analyzeMaturity(content: string): { maturity: string; lines: number } {
  const lines = content.split('\n').length;

  if (lines < 20) {
    return { maturity: 'STUB: Muy poco código, probablemente incompleto', lines };
  }
  if (lines < 50) {
    return { maturity: 'BÁSICO: Implementación mínima', lines };
  }
  if (lines < 150) {
    return { maturity: 'MODERADO: Implementación funcional', lines };
  }
  if (lines < 300) {
    return { maturity: 'COMPLETO: Implementación robusta', lines };
  }
  return { maturity: 'EXTENSO: Implementación muy completa', lines };
}

// Determinar categoría final
function determineCategory(
  name: string,
  purpose: string,
  maturity: string,
  lines: number,
  type: string
): 'ELIMINAR' | 'INTEGRAR' | 'REFACTORIZAR' | 'BACKEND_ONLY' | 'REVISAR' {
  const nameLower = name.toLowerCase();

  // Backend only - funciones que solo se usan desde CRON o triggers
  const backendPatterns = [
    'cron', 'trigger', 'sync_', 'notify_', 'expire', 'suspend_', 'unsuspend_',
    'update_debt', 'process_', 'calculate_', 'refresh_', 'improve_', 'purchase_',
    'log_admin', 'is_admin', 'get_admin', 'check_', 'clear_'
  ];
  if (backendPatterns.some(p => nameLower.includes(p))) {
    return 'BACKEND_ONLY';
  }

  // Stubs - muy poco código, eliminar o completar
  if (lines < 20) {
    return 'ELIMINAR';
  }

  // UI Components sin uso - probablemente para integrar
  if (type === 'component' && lines > 50) {
    // Si es parte de un feature importante
    const importantFeatures = ['booking', 'payment', 'wallet', 'dispute', 'admin'];
    if (importantFeatures.some(f => nameLower.includes(f))) {
      return 'INTEGRAR';
    }
  }

  // RPC functions que son funcionalidad core
  if (type === 'rpc') {
    const coreFunctions = [
      'get_user', 'get_booking', 'create_', 'accept_', 'reject_', 'complete_',
      'start_', 'cancel_', 'transfer', 'deposit', 'withdraw', 'refund',
      'open_dispute', 'resolve_dispute', 'report_', 'get_renter', 'get_owner'
    ];
    if (coreFunctions.some(f => nameLower.includes(f))) {
      return 'INTEGRAR';
    }
  }

  // Código moderado que podría tener valor
  if (lines > 100) {
    return 'REVISAR';
  }

  // Por defecto, si no está en uso y es pequeño
  if (lines < 80) {
    return 'ELIMINAR';
  }

  return 'REVISAR';
}

// Analizar componentes huérfanos
function analyzeOrphanComponents(): OrphanAnalysis[] {
  const results: OrphanAnalysis[] = [];
  const componentFiles = globSync(`${webAppPath}/**/*.component.ts`);
  const htmlFiles = globSync(`${webAppPath}/**/*.html`);
  const tsFiles = globSync(`${webAppPath}/**/*.ts`);

  const allHtml = htmlFiles.map(f => readFile(f)).join('\n');
  const allTs = tsFiles.map(f => readFile(f)).join('\n');

  for (const file of componentFiles) {
    const content = readFile(file);
    const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
    if (!selectorMatch) continue;

    const selector = selectorMatch[1];
    const classMatch = content.match(/export\s+class\s+(\w+)/);
    const componentName = classMatch ? classMatch[1] : path.basename(file);

    // Check if used
    const selectorPattern = new RegExp(`<${selector}[\\s>]`);
    const isUsedInTemplate = selectorPattern.test(allHtml);

    const importPattern = new RegExp(`import\\s*{[^}]*${componentName}`);
    let importCount = 0;
    for (const tsFile of tsFiles) {
      if (tsFile === file) continue;
      if (importPattern.test(readFile(tsFile))) importCount++;
    }

    // Skip if used
    if (isUsedInTemplate || importCount > 0) continue;
    // Skip pages (loaded by router)
    if (file.includes('.page.ts')) continue;

    const purpose = analyzePurpose(componentName, content, 'component');
    const redundancy = analyzeRedundancy(componentName, componentFiles);
    const { maturity, lines } = analyzeMaturity(content);
    const category = determineCategory(componentName, purpose, maturity, lines, 'component');

    results.push({
      name: componentName,
      path: file,
      type: 'component',
      category,
      reasoning: {
        purpose,
        redundancy,
        importance: purpose.startsWith('Negocio:') ? 'ALTA: Funcionalidad core' : 'MEDIA: UI/UX',
        maturity,
        dependencies: 'Sin dependientes directos'
      },
      recommendation: getRecommendation(category, componentName, purpose),
      linesOfCode: lines
    });
  }

  return results;
}

// Analizar RPC functions huérfanas
function analyzeOrphanRpcFunctions(): OrphanAnalysis[] {
  const results: OrphanAnalysis[] = [];

  const sqlFiles = [
    ...globSync('supabase/migrations/**/*.sql'),
    ...globSync('supabase/snapshots/**/*.sql')
  ];
  const tsFiles = globSync(`${webAppPath}/**/*.ts`);
  const allTs = tsFiles.map(f => readFile(f)).join('\n');

  const definedFunctions = new Map<string, { file: string; content: string }>();

  for (const file of sqlFiles) {
    const content = readFile(file);
    const matches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi);
    for (const match of matches) {
      const funcName = match[1].toLowerCase();
      if (!funcName.startsWith('trigger_') && !funcName.startsWith('_')) {
        // Extraer el cuerpo de la función (aproximado)
        const funcStart = match.index || 0;
        const funcEnd = content.indexOf('$$;', funcStart) + 3;
        const funcContent = content.substring(funcStart, funcEnd);
        definedFunctions.set(funcName, { file, content: funcContent });
      }
    }
  }

  for (const [funcName, { file, content }] of definedFunctions) {
    // Check if used in frontend
    const rpcPatterns = [
      `.rpc('${funcName}'`,
      `.rpc("${funcName}"`,
      `.rpc(\`${funcName}\``
    ];
    const isUsed = rpcPatterns.some(p => allTs.includes(p));
    if (isUsed) continue;

    const purpose = analyzePurpose(funcName, content, 'rpc');
    const { maturity, lines } = analyzeMaturity(content);
    const category = determineCategory(funcName, purpose, maturity, lines, 'rpc');

    results.push({
      name: funcName,
      path: file,
      type: 'rpc',
      category,
      reasoning: {
        purpose,
        redundancy: 'N/A para RPC',
        importance: purpose.includes('Backend:') ? 'BACKEND: Solo uso interno' :
                   purpose.includes('Negocio:') ? 'ALTA: Funcionalidad core' : 'MEDIA',
        maturity,
        dependencies: 'Verificar si es llamada por triggers o CRON'
      },
      recommendation: getRecommendation(category, funcName, purpose),
      linesOfCode: lines
    });
  }

  return results;
}

function getRecommendation(category: string, name: string, purpose: string): string {
  switch (category) {
    case 'ELIMINAR':
      return `Eliminar ${name}: Código incompleto o sin valor. ${purpose}`;
    case 'INTEGRAR':
      return `Integrar ${name}: Funcionalidad valiosa sin conectar. Agregar a UI correspondiente.`;
    case 'REFACTORIZAR':
      return `Refactorizar ${name}: Tiene potencial pero necesita mejoras antes de integrar.`;
    case 'BACKEND_ONLY':
      return `Mantener ${name}: Es función de backend (CRON/trigger). No necesita frontend.`;
    case 'REVISAR':
      return `Revisar ${name}: Decisión humana requerida. ${purpose}`;
    default:
      return 'Análisis manual requerido';
  }
}

// Main
async function main() {
  console.log('🔍 ANÁLISIS SOCRÁTICO DE HUÉRFANOS\n');
  console.log('Preguntas para cada huérfano:');
  console.log('1. ¿Qué problema resuelve?');
  console.log('2. ¿Existe algo similar?');
  console.log('3. ¿Es crítico para el negocio?');
  console.log('4. ¿Está completo?');
  console.log('5. ¿Algo depende de él?\n');
  console.log('='.repeat(80));

  // Analizar componentes
  console.log('\n📦 COMPONENTES HUÉRFANOS\n');
  const components = analyzeOrphanComponents();

  // Agrupar por categoría
  const compByCategory = {
    ELIMINAR: components.filter(c => c.category === 'ELIMINAR'),
    INTEGRAR: components.filter(c => c.category === 'INTEGRAR'),
    REFACTORIZAR: components.filter(c => c.category === 'REFACTORIZAR'),
    REVISAR: components.filter(c => c.category === 'REVISAR'),
    BACKEND_ONLY: components.filter(c => c.category === 'BACKEND_ONLY')
  };

  for (const [cat, items] of Object.entries(compByCategory)) {
    if (items.length === 0) continue;
    console.log(`\n--- ${cat} (${items.length}) ---`);
    for (const item of items.slice(0, 15)) { // Limitar output
      console.log(`\n  ${item.name} (${item.linesOfCode} líneas)`);
      console.log(`    Propósito: ${item.reasoning.purpose}`);
      console.log(`    Madurez: ${item.reasoning.maturity}`);
      console.log(`    → ${item.recommendation}`);
    }
    if (items.length > 15) {
      console.log(`\n  ... y ${items.length - 15} más`);
    }
  }

  // Analizar RPC functions
  console.log('\n\n' + '='.repeat(80));
  console.log('\n⚡ RPC FUNCTIONS HUÉRFANAS\n');
  const rpcs = analyzeOrphanRpcFunctions();

  const rpcByCategory = {
    ELIMINAR: rpcs.filter(r => r.category === 'ELIMINAR'),
    INTEGRAR: rpcs.filter(r => r.category === 'INTEGRAR'),
    REFACTORIZAR: rpcs.filter(r => r.category === 'REFACTORIZAR'),
    BACKEND_ONLY: rpcs.filter(r => r.category === 'BACKEND_ONLY'),
    REVISAR: rpcs.filter(r => r.category === 'REVISAR')
  };

  for (const [cat, items] of Object.entries(rpcByCategory)) {
    if (items.length === 0) continue;
    console.log(`\n--- ${cat} (${items.length}) ---`);
    for (const item of items.slice(0, 10)) {
      console.log(`\n  ${item.name}`);
      console.log(`    Propósito: ${item.reasoning.purpose}`);
      console.log(`    Archivo: ${item.path.split('/').pop()}`);
      console.log(`    → ${item.recommendation}`);
    }
    if (items.length > 10) {
      console.log(`\n  ... y ${items.length - 10} más`);
    }
  }

  // Resumen ejecutivo
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMEN EJECUTIVO');
  console.log('='.repeat(80));

  console.log('\nCOMPONENTES:');
  console.log(`  🗑️  ELIMINAR:      ${compByCategory.ELIMINAR.length}`);
  console.log(`  ✅ INTEGRAR:      ${compByCategory.INTEGRAR.length}`);
  console.log(`  🔧 REFACTORIZAR:  ${compByCategory.REFACTORIZAR.length}`);
  console.log(`  ⚠️  REVISAR:       ${compByCategory.REVISAR.length}`);

  console.log('\nRPC FUNCTIONS:');
  console.log(`  🗑️  ELIMINAR:      ${rpcByCategory.ELIMINAR.length}`);
  console.log(`  ✅ INTEGRAR:      ${rpcByCategory.INTEGRAR.length}`);
  console.log(`  🔧 REFACTORIZAR:  ${rpcByCategory.REFACTORIZAR.length}`);
  console.log(`  🔒 BACKEND_ONLY:  ${rpcByCategory.BACKEND_ONLY.length}`);
  console.log(`  ⚠️  REVISAR:       ${rpcByCategory.REVISAR.length}`);

  // Guardar reporte completo
  const fullReport = {
    timestamp: new Date().toISOString(),
    components: {
      total: components.length,
      byCategory: {
        ELIMINAR: compByCategory.ELIMINAR.map(c => ({ name: c.name, path: c.path, lines: c.linesOfCode, reason: c.recommendation })),
        INTEGRAR: compByCategory.INTEGRAR.map(c => ({ name: c.name, path: c.path, lines: c.linesOfCode, reason: c.recommendation })),
        REFACTORIZAR: compByCategory.REFACTORIZAR.map(c => ({ name: c.name, path: c.path, lines: c.linesOfCode, reason: c.recommendation })),
        REVISAR: compByCategory.REVISAR.map(c => ({ name: c.name, path: c.path, lines: c.linesOfCode, reason: c.recommendation }))
      }
    },
    rpcFunctions: {
      total: rpcs.length,
      byCategory: {
        ELIMINAR: rpcByCategory.ELIMINAR.map(r => ({ name: r.name, file: r.path, reason: r.recommendation })),
        INTEGRAR: rpcByCategory.INTEGRAR.map(r => ({ name: r.name, file: r.path, reason: r.recommendation })),
        REFACTORIZAR: rpcByCategory.REFACTORIZAR.map(r => ({ name: r.name, file: r.path, reason: r.recommendation })),
        BACKEND_ONLY: rpcByCategory.BACKEND_ONLY.map(r => ({ name: r.name, file: r.path, reason: r.recommendation })),
        REVISAR: rpcByCategory.REVISAR.map(r => ({ name: r.name, file: r.path, reason: r.recommendation }))
      }
    }
  };

  fs.writeFileSync('orphan-analysis-report.json', JSON.stringify(fullReport, null, 2));
  console.log('\n📄 Reporte completo guardado en: orphan-analysis-report.json');
}

main().catch(console.error);
