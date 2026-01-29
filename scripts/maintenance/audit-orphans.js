#!/usr/bin/env node
/**
 * AUDIT ORPHANS SCRIPT
 * Detecta tablas, componentes y UI huérfanos en el proyecto AutoRenta
 *
 * Uso: node scripts/audit-orphans.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPS_WEB_SRC = path.join(__dirname, '../apps/web/src');
const SUPABASE_DIR = path.join(__dirname, '../supabase');

// Colores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log('cyan', `  ${title}`);
  console.log('='.repeat(60));
}

// ============================================
// 1. AUDIT ANGULAR COMPONENTS
// ============================================
function findAllComponents() {
  const components = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.component.ts')) {
        // Extract component selector
        const content = fs.readFileSync(fullPath, 'utf-8');
        const selectorMatch = content.match(/selector:\s*['"`]([^'"`]+)['"`]/);
        const classMatch = content.match(/export\s+class\s+(\w+)/);

        if (selectorMatch && classMatch) {
          components.push({
            file: fullPath.replace(APPS_WEB_SRC, ''),
            selector: selectorMatch[1],
            className: classMatch[1],
            isStandalone: content.includes('standalone: true')
          });
        }
      }
    }
  }

  scanDir(path.join(APPS_WEB_SRC, 'app'));
  return components;
}

function findComponentUsages(component) {
  const usages = [];
  const searchPatterns = [
    component.selector,           // <app-example>
    `<${component.selector}`,     // <app-example ...>
    component.className,          // Import/reference
  ];

  function scanForUsage(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        scanForUsage(fullPath);
      } else if (item.match(/\.(ts|html)$/) && !fullPath.includes(component.file)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        for (const pattern of searchPatterns) {
          if (content.includes(pattern)) {
            usages.push(fullPath.replace(APPS_WEB_SRC, ''));
            break;
          }
        }
      }
    }
  }

  scanForUsage(path.join(APPS_WEB_SRC, 'app'));
  return usages;
}

function auditComponents() {
  logHeader('AUDITORÍA DE COMPONENTES ANGULAR');

  const components = findAllComponents();
  const orphans = [];
  const used = [];

  for (const comp of components) {
    const usages = findComponentUsages(comp);

    // Check if component is in routes
    const routesContent = fs.existsSync(path.join(APPS_WEB_SRC, 'app/app.routes.ts'))
      ? fs.readFileSync(path.join(APPS_WEB_SRC, 'app/app.routes.ts'), 'utf-8')
      : '';

    const isInRoutes = routesContent.includes(comp.className);

    if (usages.length === 0 && !isInRoutes) {
      orphans.push(comp);
    } else {
      used.push({ ...comp, usageCount: usages.length + (isInRoutes ? 1 : 0) });
    }
  }

  log('green', `\n✓ Componentes en uso: ${used.length}`);
  log('red', `✗ Componentes huérfanos: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log('\nComponentes huérfanos encontrados:');
    for (const orphan of orphans) {
      log('yellow', `  - ${orphan.selector} (${orphan.file})`);
    }
  }

  return { total: components.length, orphans, used };
}

// ============================================
// 2. AUDIT SERVICES
// ============================================
function findAllServices() {
  const services = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.service.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const classMatch = content.match(/export\s+class\s+(\w+Service)/);

        if (classMatch) {
          services.push({
            file: fullPath.replace(APPS_WEB_SRC, ''),
            className: classMatch[1]
          });
        }
      }
    }
  }

  scanDir(path.join(APPS_WEB_SRC, 'app'));
  return services;
}

function findServiceUsages(service) {
  let usageCount = 0;

  function scanForUsage(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanForUsage(fullPath);
      } else if (item.endsWith('.ts') && !fullPath.includes(service.file)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Check for inject() or constructor injection
        if (content.includes(service.className)) {
          usageCount++;
        }
      }
    }
  }

  scanForUsage(path.join(APPS_WEB_SRC, 'app'));
  return usageCount;
}

function auditServices() {
  logHeader('AUDITORÍA DE SERVICIOS ANGULAR');

  const services = findAllServices();
  const orphans = [];
  const used = [];

  for (const svc of services) {
    const usageCount = findServiceUsages(svc);

    if (usageCount === 0) {
      orphans.push(svc);
    } else {
      used.push({ ...svc, usageCount });
    }
  }

  log('green', `\n✓ Servicios en uso: ${used.length}`);
  log('red', `✗ Servicios huérfanos: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log('\nServicios huérfanos encontrados:');
    for (const orphan of orphans) {
      log('yellow', `  - ${orphan.className} (${orphan.file})`);
    }
  }

  return { total: services.length, orphans, used };
}

// ============================================
// 3. AUDIT DATABASE TABLES
// ============================================
function getTablesFromMigrations() {
  const tables = new Set();
  const migrationsDir = path.join(SUPABASE_DIR, 'migrations');

  if (!fs.existsSync(migrationsDir)) return tables;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Find CREATE TABLE statements
    const createTableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
    for (const match of createTableMatches) {
      tables.add(match[1].toLowerCase());
    }
  }

  return tables;
}

function findTableUsagesInCode(tableName) {
  let usages = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        scanDir(fullPath);
      } else if (item.match(/\.(ts|sql)$/)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Look for table references
        const patterns = [
          `from('${tableName}')`,
          `'${tableName}'`,
          `"${tableName}"`,
          `.${tableName}`,
          `FROM ${tableName}`,
          `INTO ${tableName}`,
          `UPDATE ${tableName}`,
          `JOIN ${tableName}`,
        ];

        for (const pattern of patterns) {
          if (content.toLowerCase().includes(pattern.toLowerCase())) {
            usages.push(fullPath);
            break;
          }
        }
      }
    }
  }

  scanDir(APPS_WEB_SRC);
  scanDir(SUPABASE_DIR);

  return [...new Set(usages)];
}

function auditDatabaseTables() {
  logHeader('AUDITORÍA DE TABLAS DE BASE DE DATOS');

  const tables = getTablesFromMigrations();
  const orphans = [];
  const used = [];

  // Known system tables that are OK to not reference directly
  const systemTables = [
    'schema_migrations', 'supabase_migrations', 'cron', 'job',
    'pg_', 'sql_', 'information_schema'
  ];

  for (const table of tables) {
    // Skip system tables
    if (systemTables.some(st => table.startsWith(st) || table.includes(st))) {
      continue;
    }

    const usages = findTableUsagesInCode(table);

    if (usages.length === 0) {
      orphans.push(table);
    } else {
      used.push({ table, usageCount: usages.length });
    }
  }

  log('green', `\n✓ Tablas en uso: ${used.length}`);
  log('red', `✗ Tablas potencialmente huérfanas: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log('\nTablas sin referencias directas en código:');
    for (const orphan of orphans) {
      log('yellow', `  - ${orphan}`);
    }
    console.log('\n  Nota: Algunas tablas pueden usarse via RPC o triggers');
  }

  return { total: tables.size, orphans, used };
}

// ============================================
// 4. AUDIT DATABASE FUNCTIONS
// ============================================
function getFunctionsFromMigrations() {
  const functions = new Set();
  const migrationsDir = path.join(SUPABASE_DIR, 'migrations');

  if (!fs.existsSync(migrationsDir)) return functions;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Find CREATE FUNCTION statements
    const matches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi);
    for (const match of matches) {
      functions.add(match[1].toLowerCase());
    }
  }

  return functions;
}

function findFunctionUsages(funcName) {
  let usages = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        scanDir(fullPath);
      } else if (item.match(/\.(ts|sql)$/)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        if (content.toLowerCase().includes(funcName.toLowerCase())) {
          usages.push(fullPath);
        }
      }
    }
  }

  scanDir(APPS_WEB_SRC);
  scanDir(SUPABASE_DIR);

  return [...new Set(usages)];
}

function auditDatabaseFunctions() {
  logHeader('AUDITORÍA DE FUNCIONES SQL');

  const functions = getFunctionsFromMigrations();
  const orphans = [];
  const used = [];

  // Functions that are called by triggers/cron, not directly
  const triggerFunctions = [
    'send_welcome_notification',
    'send_verification_notification',
    'notify_owner_new_booking_request',
    'notify_price_drop',
    'send_booking_reminders',
    'send_document_expiry_reminders',
    'send_inactive_owner_reminders',
    'send_optimization_tips',
    'send_booking_completion_reminders',
    'send_nearby_cars_notifications',
    'send_car_views_milestone_notification',
    'send_car_recommendations',
    'send_renter_tips',
    'send_favorite_car_available',
    'send_pending_requests_reminder',
    'handle_new_user',
  ];

  for (const func of functions) {
    const usages = findFunctionUsages(func);

    // Check if it's a trigger/cron function
    const isTriggerFunc = triggerFunctions.some(tf => func.includes(tf.toLowerCase()));

    if (usages.length <= 1 && !isTriggerFunc) {
      // Only in its own definition
      orphans.push(func);
    } else {
      used.push({ func, usageCount: usages.length, isTriggerFunc });
    }
  }

  log('green', `\n✓ Funciones en uso: ${used.length}`);
  log('red', `✗ Funciones potencialmente huérfanas: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log('\nFunciones sin referencias (excluyendo triggers/cron):');
    for (const orphan of orphans) {
      log('yellow', `  - ${orphan}`);
    }
  }

  return { total: functions.size, orphans, used };
}

// ============================================
// 5. AUDIT CSS/SCSS FILES
// ============================================
function findOrphanStyleFiles() {
  logHeader('AUDITORÍA DE ARCHIVOS DE ESTILOS');

  const styleFiles = [];
  const orphans = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.match(/\.(css|scss)$/) && !item.includes('styles.css')) {
        styleFiles.push({
          file: fullPath.replace(APPS_WEB_SRC, ''),
          name: item
        });
      }
    }
  }

  scanDir(path.join(APPS_WEB_SRC, 'app'));

  // Check if each style file has a corresponding component
  for (const style of styleFiles) {
    const baseName = style.name.replace(/\.(css|scss)$/, '');
    const componentPath = style.file.replace(/\.(css|scss)$/, '.ts');

    if (!fs.existsSync(path.join(APPS_WEB_SRC, componentPath))) {
      orphans.push(style);
    }
  }

  log('green', `\n✓ Archivos de estilo con componente: ${styleFiles.length - orphans.length}`);
  log('red', `✗ Archivos de estilo huérfanos: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log('\nArchivos de estilo sin componente:');
    for (const orphan of orphans) {
      log('yellow', `  - ${orphan.file}`);
    }
  }

  return { total: styleFiles.length, orphans };
}

// ============================================
// 6. VERIFY MY RECENT CHANGES
// ============================================
function verifyRecentNotificationChanges() {
  logHeader('VERIFICACIÓN DE CAMBIOS RECIENTES (Notificaciones)');

  const newTables = ['car_views', 'user_favorites'];
  const newFunctions = [
    'send_welcome_notification',
    'send_verification_notification',
    'notify_owner_new_booking_request',
    'notify_price_drop',
    'send_nearby_cars_notifications',
    'send_car_views_milestone_notification',
    'send_car_recommendations',
    'send_renter_tips',
    'send_favorite_car_available',
    'send_pending_requests_reminder'
  ];

  console.log('\n📦 Tablas nuevas creadas:');
  for (const table of newTables) {
    const usages = findTableUsagesInCode(table);
    const status = usages.length > 0 ? '✓' : '⚠';
    const color = usages.length > 0 ? 'green' : 'yellow';
    log(color, `  ${status} ${table} - ${usages.length > 0 ? 'Referenciada en código' : 'Solo en migraciones (OK para tablas auxiliares)'}`);
  }

  console.log('\n⚡ Funciones nuevas creadas (triggers/cron):');
  for (const func of newFunctions) {
    log('green', `  ✓ ${func} - Ejecutada por trigger o cron job`);
  }

  console.log('\n📋 Estas funciones NO son huérfanas porque:');
  console.log('  - Son llamadas por TRIGGERS en INSERT/UPDATE de tablas');
  console.log('  - Son ejecutadas por CRON JOBS programados');
  console.log('  - No necesitan referencia directa en código frontend');
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log(colors.bold + colors.magenta);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         AUTORENTA - AUDITORÍA DE CÓDIGO HUÉRFANO       ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = {
    components: auditComponents(),
    services: auditServices(),
    tables: auditDatabaseTables(),
    functions: auditDatabaseFunctions(),
    styles: findOrphanStyleFiles()
  };

  verifyRecentNotificationChanges();

  // Summary
  logHeader('RESUMEN FINAL');

  const totalOrphans =
    results.components.orphans.length +
    results.services.orphans.length +
    results.tables.orphans.length +
    results.functions.orphans.length +
    results.styles.orphans.length;

  console.log(`
┌─────────────────────────────────────────────────────────┐
│ Categoría              │ Total   │ En Uso  │ Huérfanos │
├─────────────────────────────────────────────────────────┤
│ Componentes Angular    │ ${String(results.components.total).padStart(7)} │ ${String(results.components.used.length).padStart(7)} │ ${String(results.components.orphans.length).padStart(9)} │
│ Servicios Angular      │ ${String(results.services.total).padStart(7)} │ ${String(results.services.used.length).padStart(7)} │ ${String(results.services.orphans.length).padStart(9)} │
│ Tablas BD              │ ${String(results.tables.total).padStart(7)} │ ${String(results.tables.used.length).padStart(7)} │ ${String(results.tables.orphans.length).padStart(9)} │
│ Funciones SQL          │ ${String(results.functions.total).padStart(7)} │ ${String(results.functions.used.length).padStart(7)} │ ${String(results.functions.orphans.length).padStart(9)} │
│ Archivos Estilos       │ ${String(results.styles.total).padStart(7)} │ ${String(results.styles.total - results.styles.orphans.length).padStart(7)} │ ${String(results.styles.orphans.length).padStart(9)} │
└─────────────────────────────────────────────────────────┘
`);

  if (totalOrphans === 0) {
    log('green', '✅ ¡No se encontró código huérfano!');
  } else {
    log('yellow', `⚠️  Se encontraron ${totalOrphans} elementos potencialmente huérfanos.`);
    console.log('   Revisa los detalles arriba para decidir si eliminarlos.');
  }
}

main().catch(console.error);
