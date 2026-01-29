#!/usr/bin/env node
/**
 * Script completo para identificar TODOS los casos de texto blanco sobre fondos claros
 * Analiza HTML, CSS y TypeScript para encontrar problemas de contraste WCAG
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let projectRoot = path.resolve(__dirname, '../../..');

// Asegurar que estamos en la raíz del proyecto
if (!fs.existsSync(path.join(projectRoot, 'apps/web/src/app'))) {
  // Si no existe, intentar desde el directorio actual
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'apps/web/src/app'))) {
    projectRoot = cwd;
  }
}

const issues = [];
const checkedFiles = new Set();

// Colores de fondo oscuros (texto blanco está bien aquí)
const darkBackgroundClasses = [
  'bg-slate-900', 'bg-gray-900', 'bg-black', 'bg-dark',
  'bg-cyan-500', 'bg-cyan-600', 'bg-blue-500', 'bg-blue-600',
  'bg-emerald-500', 'bg-green-600', 'bg-amber-500', 'bg-primary-600',
  'bg-error-default', 'bg-success-default', 'bg-cta-default',
  'bg-gradient-to-r', 'bg-gradient-to-br', 'from-cyan-', 'to-teal-',
  'from-blue-', 'to-blue-', 'from-emerald-', 'to-green-'
];

// Colores de fondo claros (texto blanco es problema aquí)
const lightBackgroundClasses = [
  'bg-white', 'bg-surface-base', 'bg-surface-raised', 'bg-surface-elevated',
  'bg-surface-secondary', 'bg-gray-50', 'bg-gray-100', 'bg-slate-50',
  'bg-slate-100', 'bg-white/', 'bg-surface-'
];

function hasDarkBackground(line, context) {
  const searchText = (line + ' ' + context).toLowerCase();
  return darkBackgroundClasses.some(bg => searchText.includes(bg.toLowerCase()));
}

function hasLightBackground(line, context) {
  const searchText = (line + ' ' + context).toLowerCase();
  return lightBackgroundClasses.some(bg => searchText.includes(bg.toLowerCase()));
}

function checkFile(filePath) {
  if (checkedFiles.has(filePath)) return;
  checkedFiles.add(filePath);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // 1. Buscar text-white sin dark:text-white en HTML
      if (trimmedLine.includes('text-white') && !trimmedLine.includes('dark:text-white')) {
        const contextStart = Math.max(0, index - 5);
        const contextEnd = Math.min(lines.length, index + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        // Si tiene fondo oscuro, está bien
        if (hasDarkBackground(trimmedLine, context)) {
          return; // No es problema
        }

        // Si tiene fondo claro o no tiene fondo definido, es sospechoso
        if (hasLightBackground(trimmedLine, context) || !hasDarkBackground(trimmedLine, context)) {
          issues.push({
            file: path.relative(projectRoot, filePath),
            line: lineNum,
            content: trimmedLine.substring(0, 150),
            type: 'text-white',
            severity: hasLightBackground(trimmedLine, context) ? 'HIGH' : 'MEDIUM',
            fix: 'Reemplazar text-white con text-primary o agregar dark:text-white'
          });
        }
      }

      // 2. Buscar color: white o color: #fff en CSS/TS
      if (trimmedLine.match(/color:\s*(white|#fff|#ffffff)/i)) {
        const contextStart = Math.max(0, index - 10);
        const contextEnd = Math.min(lines.length, index + 10);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        // Buscar background en el contexto
        if (context.match(/background[^:]*:\s*(white|#fff|#ffffff|rgba\(255,255,255)/i)) {
          issues.push({
            file: path.relative(projectRoot, filePath),
            line: lineNum,
            content: trimmedLine.substring(0, 150),
            type: 'color: white',
            severity: 'HIGH',
            fix: 'Reemplazar color: white con color: var(--text-primary, #050505)'
          });
        }
      }

      // 3. Buscar text-white/ con opacidad sobre fondos claros
      if (trimmedLine.match(/text-white\/\d+/)) {
        const contextStart = Math.max(0, index - 5);
        const contextEnd = Math.min(lines.length, index + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        if (hasLightBackground(trimmedLine, context) && !hasDarkBackground(trimmedLine, context)) {
          issues.push({
            file: path.relative(projectRoot, filePath),
            line: lineNum,
            content: trimmedLine.substring(0, 150),
            type: 'text-white/opacity',
            severity: 'HIGH',
            fix: 'Reemplazar con text-primary/opacity o text-secondary/opacity'
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
}

function findFiles(dir, extensions) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, dist, coverage, .git
        if (!['node_modules', 'dist', 'coverage', '.git', '.next', 'playwright-report', 'test-results'].includes(entry.name)) {
          files.push(...findFiles(fullPath, extensions));
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  return files;
}

// Main
console.log('🔍 Buscando archivos en apps/web/src/app...\n');
const appDir = path.join(projectRoot, 'apps/web/src/app');
const files = findFiles(appDir, ['.html', '.css', '.ts']);

console.log(`📁 Encontrados ${files.length} archivos\n`);
console.log('🔎 Analizando problemas de contraste...\n');

files.forEach(file => checkFile(file));

// Generar reporte
console.log('═══════════════════════════════════════════════════════════════');
console.log(`📊 REPORTE DE TEXT-WHITE SOBRE FONDOS CLAROS`);
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Total de problemas encontrados: ${issues.length}\n`);

if (issues.length === 0) {
  console.log('✅ No se encontraron problemas de contraste!\n');
  process.exit(0);
}

// Agrupar por archivo y severidad
const byFile = {};
const bySeverity = { HIGH: 0, MEDIUM: 0 };

issues.forEach(issue => {
  if (!byFile[issue.file]) {
    byFile[issue.file] = [];
  }
  byFile[issue.file].push(issue);
  bySeverity[issue.severity]++;
});

console.log(`📊 Por severidad:`);
console.log(`   🔴 HIGH: ${bySeverity.HIGH}`);
console.log(`   🟡 MEDIUM: ${bySeverity.MEDIUM}\n`);

// Mostrar resultados agrupados por archivo
Object.keys(byFile).sort().forEach(file => {
  const fileIssues = byFile[file];
  const highCount = fileIssues.filter(i => i.severity === 'HIGH').length;
  const mediumCount = fileIssues.filter(i => i.severity === 'MEDIUM').length;

  console.log(`\n📄 ${file}`);
  console.log(`   ${fileIssues.length} problema(s) - 🔴 ${highCount} HIGH, 🟡 ${mediumCount} MEDIUM\n`);

  fileIssues.forEach(issue => {
    const icon = issue.severity === 'HIGH' ? '🔴' : '🟡';
    console.log(`   ${icon} Línea ${issue.line}: ${issue.type}`);
    console.log(`      ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`);
    console.log(`      💡 Fix: ${issue.fix}`);
    console.log('');
  });
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('💡 RECOMENDACIONES:');
console.log('   1. Reemplazar text-white → text-primary en fondos claros');
console.log('   2. Reemplazar color: white → color: var(--text-primary) en CSS');
console.log('   3. Verificar que dark:text-white solo se use en modo oscuro');
console.log('   4. Usar text-white/opacity solo sobre fondos oscuros');
console.log('═══════════════════════════════════════════════════════════════\n');

// Guardar reporte detallado en archivo
const reportPath = path.join(projectRoot, 'tools/audit/white-text-issues-report.txt');
const reportContent = `REPORTE DE TEXT-WHITE SOBRE FONDOS CLAROS
Generado: ${new Date().toISOString()}
Total de problemas: ${issues.length}

${issues.map((issue, idx) =>
  `${idx + 1}. ${issue.file}:${issue.line} [${issue.severity}]
   Tipo: ${issue.type}
   Contenido: ${issue.content}
   Fix: ${issue.fix}
`
).join('\n')}
`;

fs.writeFileSync(reportPath, reportContent);
console.log(`📝 Reporte detallado guardado en: ${reportPath}\n`);

// Generar JSON para procesamiento automático
const jsonPath = path.join(projectRoot, 'tools/audit/white-text-issues.json');
fs.writeFileSync(jsonPath, JSON.stringify(issues, null, 2));
console.log(`📝 JSON guardado en: ${jsonPath}\n`);

process.exit(issues.length > 0 ? 1 : 0);

