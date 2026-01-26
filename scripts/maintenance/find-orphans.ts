/**
 * Script para detectar componentes huérfanos y desincronizaciones UI/Backend
 *
 * Detecta:
 * 1. Componentes Angular no usados en ningún template/módulo
 * 2. Servicios con métodos no llamados desde ningún componente
 * 3. Rutas definidas sin páginas existentes
 * 4. Páginas existentes sin rutas
 * 5. Funciones RPC de Supabase no usadas en el frontend
 * 6. Tablas de DB sin queries en el frontend
 * 7. Signals/Computed no usados en templates
 * 8. Interfaces/Types no usados
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const APPS_WEB_SRC = '/home/edu/autorenta/apps/web/src/app';
const SUPABASE_DIR = '/home/edu/autorenta/supabase';

interface OrphanReport {
  components: OrphanComponent[];
  services: OrphanService[];
  routes: RouteIssue[];
  rpcFunctions: OrphanRpc[];
  tables: OrphanTable[];
  signals: OrphanSignal[];
  types: OrphanType[];
}

interface OrphanComponent {
  name: string;
  path: string;
  selector: string;
  reason: string;
}

interface OrphanService {
  name: string;
  path: string;
  unusedMethods: string[];
}

interface RouteIssue {
  type: 'missing_page' | 'missing_route';
  path: string;
  details: string;
}

interface OrphanRpc {
  name: string;
  definedIn: string;
  usedInFrontend: boolean;
}

interface OrphanTable {
  name: string;
  hasQueries: boolean;
  hasRls: boolean;
}

interface OrphanSignal {
  component: string;
  signalName: string;
  usedInTemplate: boolean;
}

interface OrphanType {
  name: string;
  path: string;
  usageCount: number;
}

// Helper: Find all files matching pattern
function findFiles(dir: string, pattern: RegExp, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      findFiles(filePath, pattern, results);
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }
  return results;
}

// Helper: Read file content
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Helper: Execute grep and return results
function grep(pattern: string, dir: string, fileGlob: string = '*.ts'): string[] {
  try {
    const result = execSync(
      `grep -r "${pattern}" ${dir} --include="${fileGlob}" -l 2>/dev/null || true`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// 1. Find orphan components
function findOrphanComponents(): OrphanComponent[] {
  const orphans: OrphanComponent[] = [];
  const componentFiles = findFiles(APPS_WEB_SRC, /\.component\.ts$/);

  for (const file of componentFiles) {
    const content = readFile(file);

    // Extract selector
    const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
    if (!selectorMatch) continue;

    const selector = selectorMatch[1];
    const componentName = path.basename(file, '.component.ts')
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('') + 'Component';

    // Check if selector is used in any HTML template
    const selectorUsages = grep(`<${selector}`, APPS_WEB_SRC, '*.html');
    const selectorUsagesClosing = grep(`</${selector}>`, APPS_WEB_SRC, '*.html');

    // Check if component class is imported anywhere
    const importUsages = grep(`import.*${componentName}`, APPS_WEB_SRC, '*.ts')
      .filter(f => f !== file); // Exclude self

    if (selectorUsages.length === 0 && selectorUsagesClosing.length === 0 && importUsages.length === 0) {
      // Check if it's a routed page (pages don't need selectors in templates)
      const isRoutedPage = file.includes('.page.ts') ||
        grep(`loadComponent.*${componentName}`, APPS_WEB_SRC, '*.ts').length > 0;

      if (!isRoutedPage) {
        orphans.push({
          name: componentName,
          path: file.replace('/home/edu/autorenta/', ''),
          selector,
          reason: 'Not used in any template or imports'
        });
      }
    }
  }

  return orphans;
}

// 2. Find services with unused methods
function findOrphanServiceMethods(): OrphanService[] {
  const orphans: OrphanService[] = [];
  const serviceFiles = findFiles(APPS_WEB_SRC, /\.service\.ts$/);

  for (const file of serviceFiles) {
    const content = readFile(file);
    const serviceName = path.basename(file, '.service.ts');

    // Extract public methods (excluding constructor, private, and lifecycle hooks)
    const methodMatches = content.matchAll(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g);
    const unusedMethods: string[] = [];

    for (const match of methodMatches) {
      const methodName = match[1];

      // Skip constructor, private methods, lifecycle hooks
      if (methodName === 'constructor' ||
          methodName.startsWith('ng') ||
          methodName.startsWith('_') ||
          methodName === 'private') continue;

      // Check if method is called anywhere except its own file
      const usages = grep(`\\.${methodName}\\(`, APPS_WEB_SRC, '*.ts')
        .filter(f => f !== file);

      if (usages.length === 0) {
        unusedMethods.push(methodName);
      }
    }

    if (unusedMethods.length > 0) {
      orphans.push({
        name: serviceName,
        path: file.replace('/home/edu/autorenta/', ''),
        unusedMethods: unusedMethods.slice(0, 10) // Limit to 10
      });
    }
  }

  return orphans;
}

// 3. Find route issues
function findRouteIssues(): RouteIssue[] {
  const issues: RouteIssue[] = [];

  // Find all route files
  const routeFiles = findFiles(APPS_WEB_SRC, /\.routes\.ts$/);
  const allRouteContent = routeFiles.map(readFile).join('\n');

  // Extract all loadComponent paths
  const loadComponentMatches = allRouteContent.matchAll(/loadComponent:\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g);

  for (const match of loadComponentMatches) {
    const importPath = match[1];
    // Convert relative import to absolute path
    const absolutePath = path.join(APPS_WEB_SRC, importPath.replace('./', '').replace(/^\.\.\//, '../') + '.ts');

    if (!fs.existsSync(absolutePath) && !fs.existsSync(absolutePath.replace('.ts', '/index.ts'))) {
      issues.push({
        type: 'missing_page',
        path: importPath,
        details: `Route points to non-existent file`
      });
    }
  }

  // Find page files without routes
  const pageFiles = findFiles(APPS_WEB_SRC, /\.page\.ts$/);
  for (const pageFile of pageFiles) {
    const relativePath = pageFile.replace(APPS_WEB_SRC, '.').replace('.ts', '');
    const pageName = path.basename(pageFile, '.page.ts');

    // Check if this page is referenced in any route file
    const isRouted = routeFiles.some(rf => {
      const content = readFile(rf);
      return content.includes(relativePath) || content.includes(pageName);
    });

    if (!isRouted) {
      issues.push({
        type: 'missing_route',
        path: pageFile.replace('/home/edu/autorenta/', ''),
        details: `Page exists but no route defined`
      });
    }
  }

  return issues;
}

// 4. Find unused RPC functions
function findOrphanRpcFunctions(): OrphanRpc[] {
  const orphans: OrphanRpc[] = [];

  // Find all SQL migration files
  const migrationFiles = findFiles(SUPABASE_DIR, /\.sql$/);

  // Extract function definitions
  const functionDefs = new Map<string, string>();

  for (const file of migrationFiles) {
    const content = readFile(file);
    const funcMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi);

    for (const match of funcMatches) {
      functionDefs.set(match[1], file);
    }
  }

  // Check which functions are called from frontend
  for (const [funcName, definedIn] of functionDefs) {
    // Check for .rpc('funcName') calls
    const rpcUsages = grep(`\\.rpc\\(['"\`]${funcName}['"\`]`, APPS_WEB_SRC, '*.ts');

    orphans.push({
      name: funcName,
      definedIn: definedIn.replace('/home/edu/autorenta/', ''),
      usedInFrontend: rpcUsages.length > 0
    });
  }

  return orphans.filter(o => !o.usedInFrontend);
}

// 5. Find tables without frontend queries
function findOrphanTables(): OrphanTable[] {
  const orphans: OrphanTable[] = [];

  // Find table definitions in migrations
  const migrationFiles = findFiles(SUPABASE_DIR, /\.sql$/);
  const tables = new Set<string>();

  for (const file of migrationFiles) {
    const content = readFile(file);
    const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(/gi);

    for (const match of tableMatches) {
      tables.add(match[1]);
    }
  }

  // Check which tables are queried from frontend
  for (const table of tables) {
    // Check for .from('table') calls
    const fromUsages = grep(`\\.from\\(['"\`]${table}['"\`]\\)`, APPS_WEB_SRC, '*.ts');

    // Check for RLS policies
    const rlsUsages = migrationFiles.some(f => {
      const content = readFile(f);
      return content.includes(`ON ${table}`) || content.includes(`ON public.${table}`);
    });

    if (fromUsages.length === 0) {
      orphans.push({
        name: table,
        hasQueries: false,
        hasRls: rlsUsages
      });
    }
  }

  return orphans;
}

// 6. Find unused signals in components
function findOrphanSignals(): OrphanSignal[] {
  const orphans: OrphanSignal[] = [];
  const componentFiles = findFiles(APPS_WEB_SRC, /\.component\.ts$/);

  for (const file of componentFiles) {
    const content = readFile(file);
    const componentName = path.basename(file, '.component.ts');

    // Find template file
    const templateFile = file.replace('.component.ts', '.component.html');
    const templateContent = fs.existsSync(templateFile) ? readFile(templateFile) : '';

    // Also check inline template
    const inlineTemplateMatch = content.match(/template:\s*`([^`]+)`/s);
    const fullTemplate = templateContent + (inlineTemplateMatch?.[1] || '');

    // Extract signal definitions
    const signalMatches = content.matchAll(/(?:readonly\s+)?(\w+)\s*=\s*(?:signal|computed)\s*[<(]/g);

    for (const match of signalMatches) {
      const signalName = match[1];

      // Check if signal is used in template (with () call)
      const isUsedInTemplate = fullTemplate.includes(`${signalName}()`) ||
        fullTemplate.includes(`${signalName}()`);

      // Also check if it's used in the component itself (for computed that depend on it)
      const isUsedInComponent = (content.match(new RegExp(`this\\.${signalName}\\(\\)`, 'g')) || []).length > 1;

      if (!isUsedInTemplate && !isUsedInComponent) {
        orphans.push({
          component: componentName,
          signalName,
          usedInTemplate: false
        });
      }
    }
  }

  return orphans.slice(0, 50); // Limit results
}

// 7. Find unused types/interfaces
function findOrphanTypes(): OrphanType[] {
  const orphans: OrphanType[] = [];
  const modelFiles = findFiles(path.join(APPS_WEB_SRC, 'core/models'), /\.ts$/);

  for (const file of modelFiles) {
    const content = readFile(file);

    // Extract interface and type definitions
    const typeMatches = content.matchAll(/(?:export\s+)?(?:interface|type)\s+(\w+)/g);

    for (const match of typeMatches) {
      const typeName = match[1];

      // Count usages across the codebase
      const usages = grep(`:\\s*${typeName}[\\[\\]<>\\s,;)]|<${typeName}>|as\\s+${typeName}`, APPS_WEB_SRC, '*.ts');

      // Exclude self-references
      const usageCount = usages.filter(u => u !== file).length;

      if (usageCount === 0) {
        orphans.push({
          name: typeName,
          path: file.replace('/home/edu/autorenta/', ''),
          usageCount: 0
        });
      }
    }
  }

  return orphans;
}

// Main execution
async function main() {
  console.log('🔍 Scanning for orphans and UI/Backend desync...\n');

  console.log('1️⃣  Finding orphan components...');
  const orphanComponents = findOrphanComponents();
  console.log(`   Found ${orphanComponents.length} orphan components\n`);

  console.log('2️⃣  Finding services with unused methods...');
  const orphanServices = findOrphanServiceMethods();
  console.log(`   Found ${orphanServices.length} services with unused methods\n`);

  console.log('3️⃣  Finding route issues...');
  const routeIssues = findRouteIssues();
  console.log(`   Found ${routeIssues.length} route issues\n`);

  console.log('4️⃣  Finding unused RPC functions...');
  const orphanRpcs = findOrphanRpcFunctions();
  console.log(`   Found ${orphanRpcs.length} unused RPC functions\n`);

  console.log('5️⃣  Finding tables without frontend queries...');
  const orphanTables = findOrphanTables();
  console.log(`   Found ${orphanTables.length} tables without frontend queries\n`);

  console.log('6️⃣  Finding unused signals...');
  const orphanSignals = findOrphanSignals();
  console.log(`   Found ${orphanSignals.length} potentially unused signals\n`);

  console.log('7️⃣  Finding unused types/interfaces...');
  const orphanTypes = findOrphanTypes();
  console.log(`   Found ${orphanTypes.length} unused types\n`);

  // Generate report
  const report: OrphanReport = {
    components: orphanComponents,
    services: orphanServices,
    routes: routeIssues,
    rpcFunctions: orphanRpcs,
    tables: orphanTables,
    signals: orphanSignals,
    types: orphanTypes
  };

  // Print detailed report
  console.log('\n' + '='.repeat(80));
  console.log('📊 DETAILED REPORT');
  console.log('='.repeat(80));

  if (orphanComponents.length > 0) {
    console.log('\n🧩 ORPHAN COMPONENTS (not used in templates/imports):');
    for (const c of orphanComponents) {
      console.log(`   - ${c.name}`);
      console.log(`     Path: ${c.path}`);
      console.log(`     Selector: <${c.selector}>`);
    }
  }

  if (orphanServices.length > 0) {
    console.log('\n⚙️  SERVICES WITH UNUSED METHODS:');
    for (const s of orphanServices.slice(0, 10)) {
      console.log(`   - ${s.name}.service.ts`);
      console.log(`     Unused: ${s.unusedMethods.join(', ')}`);
    }
  }

  if (routeIssues.length > 0) {
    console.log('\n🛤️  ROUTE ISSUES:');
    for (const r of routeIssues) {
      console.log(`   - [${r.type}] ${r.path}`);
      console.log(`     ${r.details}`);
    }
  }

  if (orphanRpcs.length > 0) {
    console.log('\n🔌 UNUSED RPC FUNCTIONS (defined in DB, not called from frontend):');
    for (const rpc of orphanRpcs.slice(0, 20)) {
      console.log(`   - ${rpc.name}`);
      console.log(`     Defined in: ${rpc.definedIn}`);
    }
  }

  if (orphanTables.length > 0) {
    console.log('\n📋 TABLES WITHOUT FRONTEND QUERIES:');
    for (const t of orphanTables.slice(0, 20)) {
      console.log(`   - ${t.name} (RLS: ${t.hasRls ? '✓' : '✗'})`);
    }
  }

  if (orphanSignals.length > 0) {
    console.log('\n📡 POTENTIALLY UNUSED SIGNALS:');
    for (const s of orphanSignals.slice(0, 15)) {
      console.log(`   - ${s.component}: ${s.signalName}()`);
    }
  }

  if (orphanTypes.length > 0) {
    console.log('\n📝 UNUSED TYPES/INTERFACES:');
    for (const t of orphanTypes.slice(0, 15)) {
      console.log(`   - ${t.name} (${t.path})`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Components orphans:     ${orphanComponents.length}`);
  console.log(`   Services with unused:   ${orphanServices.length}`);
  console.log(`   Route issues:           ${routeIssues.length}`);
  console.log(`   Unused RPC functions:   ${orphanRpcs.length}`);
  console.log(`   Tables no frontend:     ${orphanTables.length}`);
  console.log(`   Unused signals:         ${orphanSignals.length}`);
  console.log(`   Unused types:           ${orphanTypes.length}`);

  // Save full report to JSON
  const reportPath = '/home/edu/autorenta/orphan-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);
}

main().catch(console.error);
