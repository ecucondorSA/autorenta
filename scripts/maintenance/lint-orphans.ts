#!/usr/bin/env npx tsx
/**
 * Orphan Lint - Detecta componentes, funciones y tablas huérfanas
 *
 * Uso: npx tsx scripts/lint-orphans.ts [--strict] [--json] [--fix-suggestions]
 *
 * Este script actúa como un "linter" que detecta desconexiones entre:
 * - Frontend (Angular components, services, types)
 * - Backend (Supabase RPC functions, tables)
 *
 * Exit codes:
 *   0 - Sin problemas críticos
 *   1 - Encontrados huérfanos críticos (falla CI)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

// ============================================================================
// CONFIGURACIÓN - Umbrales para CI
// ============================================================================
const CONFIG = {
  // Umbrales máximos permitidos - MUY ESTRICTOS para producción
  thresholds: {
    orphanComponents: 5,        // Máximo 5 componentes sin usar
    unusedRpcFunctions: 5,      // Máximo 5 RPC sin llamar
    tablesWithoutQueries: 5,    // Máximo 5 tablas sin queries
    criticalOrphans: 0,         // Funciones críticas sin usar (SIEMPRE 0)
  },

  // RPC functions críticas que DEBEN estar conectadas
  criticalRpcFunctions: [
    'can_user_operate',           // Verificación de operación
    'process_payment_success',    // Procesamiento de pagos
    'wallet_transfer',            // Transferencias wallet
    'create_booking',             // Crear reserva
    'accept_booking',             // Aceptar reserva
    'reject_booking',             // Rechazar reserva
    'start_checkin',              // Iniciar check-in
    'complete_checkout',          // Completar check-out
  ],

  // Componentes críticos que DEBEN estar integrados
  criticalComponents: [
    // Agregar selectores de componentes críticos
  ],

  // Tablas críticas que DEBEN tener queries
  criticalTables: [
    'profiles',
    'bookings',
    'cars',
    'wallet_transactions',
  ],

  // Paths
  webSrcPath: 'apps/web/src',
  webAppPath: 'apps/web/src/app',
  migrationsPath: 'supabase/migrations',
  snapshotsPath: 'supabase/snapshots',
};

// ============================================================================
// TIPOS
// ============================================================================
interface OrphanReport {
  timestamp: string;
  summary: {
    orphanComponents: number;
    unusedRpcFunctions: number;
    tablesWithoutQueries: number;
    criticalOrphans: number;
    passed: boolean;
  };
  criticalIssues: CriticalIssue[];
  orphanComponents: OrphanComponent[];
  unusedRpcFunctions: UnusedRpc[];
  tablesWithoutQueries: OrphanTable[];
}

interface CriticalIssue {
  type: 'rpc' | 'component' | 'table';
  name: string;
  reason: string;
  severity: 'critical' | 'warning';
}

interface OrphanComponent {
  name: string;
  path: string;
  selector: string;
}

interface UnusedRpc {
  name: string;
  definedIn: string;
}

interface OrphanTable {
  name: string;
}

// ============================================================================
// UTILIDADES - Sin shell commands problemáticos
// ============================================================================

function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function searchInFiles(pattern: RegExp, files: string[]): number {
  let count = 0;
  for (const file of files) {
    const content = readFileContent(file);
    if (pattern.test(content)) {
      count++;
    }
  }
  return count;
}

function searchInFilesForString(searchStr: string, files: string[]): number {
  let count = 0;
  for (const file of files) {
    const content = readFileContent(file);
    if (content.includes(searchStr)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// DETECTORES
// ============================================================================

/**
 * Detecta componentes Angular no usados en templates
 */
function findOrphanComponents(): OrphanComponent[] {
  const orphans: OrphanComponent[] = [];

  // Obtener todos los archivos de componentes
  const componentFiles = globSync(`${CONFIG.webAppPath}/**/*.component.ts`);
  // Nota: incluir index.html y bootstrap files (main.ts) para evitar falsos positivos
  const htmlFiles = globSync(`${CONFIG.webSrcPath}/**/*.html`);
  const tsFiles = globSync(`${CONFIG.webSrcPath}/**/*.ts`);
  const routesFiles = globSync(`${CONFIG.webSrcPath}/**/*.routes.ts`);

  // Leer contenido de todos los HTML para buscar selectores
  const allHtmlContent = htmlFiles.map(f => readFileContent(f)).join('\n');
  // Leer contenido de todos los TS para buscar imports
  const allTsContent = tsFiles.map(f => readFileContent(f)).join('\n');
  // Leer contenido de routes para detectar loadComponent/import() usage
  const allRoutesContent = routesFiles.map(f => readFileContent(f)).join('\n');

  for (const file of componentFiles) {
    try {
      const content = readFileContent(file);

      // Extraer selector
      const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
      if (!selectorMatch) continue;

      const selector = selectorMatch[1];

      // Extraer nombre del componente
      const classMatch = content.match(/export\s+class\s+(\w+Component)/);
      const componentName = classMatch ? classMatch[1] : path.basename(file, '.component.ts');

      // Buscar uso en templates (<selector> o <selector )
      const selectorPattern = new RegExp(`<${selector}[\\s>]`);
      const templateUsage = selectorPattern.test(allHtmlContent);

      // Buscar en imports de otros componentes (excluyendo su propio archivo)
      const importPattern = new RegExp(`import\\s*{[^}]*${componentName}[^}]*}`);
      // Buscar uso por Router (lazy routes con loadComponent) sin imports estáticos
      const routeUsagePattern = new RegExp(`\\b${componentName}\\b`);
      const routeUsage = routeUsagePattern.test(allRoutesContent);

      // Contar usos en archivos TS (excluyendo el propio)
      let importCount = 0;
      for (const tsFile of tsFiles) {
        if (tsFile === file) continue;
        const tsContent = readFileContent(tsFile);
        if (importPattern.test(tsContent)) {
          importCount++;
        }
      }

      // Si no se usa en templates ni se importa en otros archivos, es huérfano
      if (!templateUsage && importCount === 0 && !routeUsage) {
        // Excluir páginas (se cargan por router)
        if (!file.includes('.page.ts')) {
          orphans.push({
            name: componentName,
            path: file,
            selector
          });
        }
      }
    } catch {
      // Ignorar errores de lectura
    }
  }

  return orphans;
}

/**
 * Detecta RPC functions de Supabase no llamadas desde frontend
 */
function findUnusedRpcFunctions(): UnusedRpc[] {
  const unused: UnusedRpc[] = [];

  // Obtener archivos SQL
  const migrationFiles = globSync(`${CONFIG.migrationsPath}/**/*.sql`);
  const snapshotFiles = globSync(`${CONFIG.snapshotsPath}/**/*.sql`);
  const sqlFiles = [...migrationFiles, ...snapshotFiles];

  // Obtener archivos TS del frontend
  const tsFiles = globSync(`${CONFIG.webSrcPath}/**/*.ts`);
  const allTsContent = tsFiles.map(f => readFileContent(f)).join('\n');

  const definedFunctions = new Map<string, string>();

  for (const file of sqlFiles) {
    const content = readFileContent(file);

    // Buscar CREATE FUNCTION
    const functionMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi);
    for (const match of functionMatches) {
      const funcName = match[1].toLowerCase();
      // Excluir triggers y funciones internas
      if (!funcName.startsWith('trigger_') &&
          !funcName.startsWith('_') &&
          !funcName.includes('notify') &&
          !funcName.startsWith('st_') &&  // PostGIS
          !funcName.startsWith('pg_')) {  // PostgreSQL internal
        definedFunctions.set(funcName, file);
      }
    }
  }

  // Some RPCs are invoked via edge functions; track aliases to avoid false positives.
  const rpcAliasPatterns: Record<string, string[]> = {
    wallet_transfer: [
      ".functions.invoke('wallet-transfer'",
      '.functions.invoke("wallet-transfer"',
      '.functions.invoke(`wallet-transfer`',
    ],
  };

  // Verificar cuáles se usan en frontend
  for (const [funcName, definedIn] of definedFunctions) {
    // Buscar .rpc('funcName' o .rpc("funcName"
    const rpcPattern1 = `.rpc('${funcName}'`;
    const rpcPattern2 = `.rpc("${funcName}"`;
    const rpcPattern3 = `.rpc(\`${funcName}\``;

    const aliasPatterns = rpcAliasPatterns[funcName];
    const isAliasUsed = aliasPatterns?.some(pattern => allTsContent.includes(pattern)) ?? false;

    const isUsed = allTsContent.includes(rpcPattern1) ||
                   allTsContent.includes(rpcPattern2) ||
                   allTsContent.includes(rpcPattern3) ||
                   isAliasUsed;

    if (!isUsed) {
      unused.push({ name: funcName, definedIn });
    }
  }

  return unused;
}

/**
 * Detecta tablas sin queries desde frontend
 */
function findTablesWithoutQueries(): OrphanTable[] {
  const orphans: OrphanTable[] = [];

  // Obtener archivos SQL
  const migrationFiles = globSync(`${CONFIG.migrationsPath}/**/*.sql`);
  const snapshotFiles = globSync(`${CONFIG.snapshotsPath}/**/*.sql`);
  const sqlFiles = [...migrationFiles, ...snapshotFiles];

  // Obtener archivos TS del frontend
  const tsFiles = globSync(`${CONFIG.webSrcPath}/**/*.ts`);
  const allTsContent = tsFiles.map(f => readFileContent(f)).join('\n');

  const tables = new Set<string>();

  for (const file of sqlFiles) {
    const content = readFileContent(file);
    const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
    for (const match of tableMatches) {
      const tableName = match[1].toLowerCase();
      // Excluir tablas de sistema
      if (!tableName.startsWith('_') &&
          !tableName.startsWith('pg_') &&
          !tableName.startsWith('supabase_') &&
          !tableName.startsWith('spatial_') &&
          !tableName.startsWith('geometry_')) {
        tables.add(tableName);
      }
    }
  }

  // Verificar cuáles tienen queries
  for (const table of tables) {
    // Buscar .from('table' o .from("table"
    const fromPattern1 = `.from('${table}'`;
    const fromPattern2 = `.from("${table}"`;

    const isUsed = allTsContent.includes(fromPattern1) ||
                   allTsContent.includes(fromPattern2);

    if (!isUsed) {
      orphans.push({ name: table });
    }
  }

  return orphans;
}

/**
 * Detecta problemas críticos que DEBEN fallar el CI
 */
function findCriticalIssues(
  unusedRpc: UnusedRpc[],
  orphanComponents: OrphanComponent[],
  tablesWithoutQueries: OrphanTable[]
): CriticalIssue[] {
  const issues: CriticalIssue[] = [];

  // Verificar RPC críticas
  for (const funcName of CONFIG.criticalRpcFunctions) {
    const isUnused = unusedRpc.some(r => r.name === funcName);
    if (isUnused) {
      issues.push({
        type: 'rpc',
        name: funcName,
        reason: `RPC function crítica '${funcName}' no está siendo llamada desde el frontend`,
        severity: 'critical'
      });
    }
  }

  // Verificar tablas críticas
  for (const tableName of CONFIG.criticalTables) {
    const isOrphan = tablesWithoutQueries.some(t => t.name === tableName);
    if (isOrphan) {
      issues.push({
        type: 'table',
        name: tableName,
        reason: `Tabla crítica '${tableName}' no tiene queries desde el frontend`,
        severity: 'critical'
      });
    }
  }

  return issues;
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const isStrict = args.includes('--strict');
  const outputJson = args.includes('--json');
  const showSuggestions = args.includes('--fix-suggestions');

  console.log('🔍 Orphan Lint - Analizando codebase...\n');

  // Ejecutar detección
  console.log('  → Buscando componentes huérfanos...');
  const orphanComponents = findOrphanComponents();

  console.log('  → Buscando RPC functions sin usar...');
  const unusedRpcFunctions = findUnusedRpcFunctions();

  console.log('  → Buscando tablas sin queries...');
  const tablesWithoutQueries = findTablesWithoutQueries();

  console.log('  → Verificando issues críticos...');
  const criticalIssues = findCriticalIssues(unusedRpcFunctions, orphanComponents, tablesWithoutQueries);

  // Determinar si pasa
  const passed = isStrict
    ? criticalIssues.length === 0 &&
      orphanComponents.length <= CONFIG.thresholds.orphanComponents &&
      unusedRpcFunctions.length <= CONFIG.thresholds.unusedRpcFunctions &&
      tablesWithoutQueries.length <= CONFIG.thresholds.tablesWithoutQueries
    : criticalIssues.length === 0;

  // Crear reporte
  const report: OrphanReport = {
    timestamp: new Date().toISOString(),
    summary: {
      orphanComponents: orphanComponents.length,
      unusedRpcFunctions: unusedRpcFunctions.length,
      tablesWithoutQueries: tablesWithoutQueries.length,
      criticalOrphans: criticalIssues.length,
      passed
    },
    criticalIssues,
    orphanComponents: orphanComponents.slice(0, 50), // Limitar para output
    unusedRpcFunctions: unusedRpcFunctions.slice(0, 50),
    tablesWithoutQueries: tablesWithoutQueries.slice(0, 50)
  };

  // Output
  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ORPHAN LINT REPORT');
    console.log('='.repeat(60));

    console.log(`\n📈 Resumen:`);
    console.log(`   Componentes huérfanos:     ${orphanComponents.length} (umbral: ${CONFIG.thresholds.orphanComponents})`);
    console.log(`   RPC functions sin usar:    ${unusedRpcFunctions.length} (umbral: ${CONFIG.thresholds.unusedRpcFunctions})`);
    console.log(`   Tablas sin queries:        ${tablesWithoutQueries.length} (umbral: ${CONFIG.thresholds.tablesWithoutQueries})`);
    console.log(`   Issues críticos:           ${criticalIssues.length}`);

    if (criticalIssues.length > 0) {
      console.log(`\n❌ ISSUES CRÍTICOS (deben resolverse):`);
      for (const issue of criticalIssues) {
        console.log(`   [${issue.type.toUpperCase()}] ${issue.name}`);
        console.log(`      → ${issue.reason}`);
      }
    }

    if (showSuggestions && orphanComponents.length > 0) {
      console.log(`\n⚠️  Top 10 Componentes Huérfanos:`);
      for (const comp of orphanComponents.slice(0, 10)) {
        console.log(`   - ${comp.name} (${comp.selector})`);
        console.log(`     ${comp.path}`);
      }
    }

    if (showSuggestions && unusedRpcFunctions.length > 0) {
      console.log(`\n⚠️  Top 10 RPC Functions sin usar:`);
      for (const rpc of unusedRpcFunctions.slice(0, 10)) {
        console.log(`   - ${rpc.name}`);
        console.log(`     Definida en: ${rpc.definedIn}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    if (passed) {
      console.log('✅ LINT PASSED');
    } else {
      console.log('❌ LINT FAILED');
      if (criticalIssues.length > 0) {
        console.log('   → Hay issues críticos que deben resolverse');
      }
      if (isStrict) {
        console.log('   → Modo estricto: se excedieron los umbrales');
      }
    }
    console.log('='.repeat(60));
  }

  // Guardar reporte completo
  const fullReport = {
    ...report,
    orphanComponents,
    unusedRpcFunctions,
    tablesWithoutQueries
  };
  fs.writeFileSync('orphan-lint-report.json', JSON.stringify(fullReport, null, 2));
  console.log('\n📄 Reporte completo guardado en: orphan-lint-report.json');

  // Exit code
  process.exit(passed ? 0 : 1);
}

main().catch(console.error);
