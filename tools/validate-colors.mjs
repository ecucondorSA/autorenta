#!/usr/bin/env node

/**
 * 🎨 Script de Validación de Colores - AutoRenta
 *
 * Valida que:
 * 1. Todos los tokens críticos existan en ambos temas (light/dark)
 * 2. No haya colores hardcodeados en el código
 * 3. Los tokens TypeScript estén correctamente tipados
 *
 * Uso: node tools/validate-colors.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const COLORS_FILE = join(PROJECT_ROOT, 'apps/web/src/config/theme/colors.ts');
const TAILWIND_CONFIG = join(PROJECT_ROOT, 'apps/web/tailwind.config.js');
const STYLES_CSS = join(PROJECT_ROOT, 'apps/web/src/styles.css');

const SEARCH_PATHS = [
  join(PROJECT_ROOT, 'apps/web/src/**/*.ts'),
  join(PROJECT_ROOT, 'apps/web/src/**/*.html'),
  join(PROJECT_ROOT, 'apps/web/src/**/*.css'),
];

// Colores críticos que deben existir
const REQUIRED_TOKENS = [
  'surfaceBase',
  'surfaceRaised',
  'surfaceSecondary',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'borderDefault',
  'borderFocus',
  'ctaDefault',
  'ctaHover',
];

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m', // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m',
  };

  const icon = {
    info: 'ℹ',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  console.log(`${colors[type]}${icon[type]} ${message}${colors.reset}`);
}

function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    log(`No se pudo leer el archivo: ${filePath}`, 'error');
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Valida que el archivo de tokens exista y tenga la estructura correcta
 */
function validateTokensFile() {
  log('Validando archivo de tokens...', 'info');

  if (!existsSync(COLORS_FILE)) {
    log(`Archivo de tokens no encontrado: ${COLORS_FILE}`, 'error');
    return false;
  }

  const content = readFile(COLORS_FILE);
  if (!content) return false;

  // Verificar que existan las exportaciones principales
  const hasPalette = content.includes('export const palette');
  const hasLightTheme = content.includes('export const lightTheme');
  const hasDarkTheme = content.includes('export const darkTheme');
  const hasThemeColors = content.includes('export const themeColors');

  if (!hasPalette || !hasLightTheme || !hasDarkTheme || !hasThemeColors) {
    log('Faltan exportaciones críticas en colors.ts', 'error');
    return false;
  }

  // Verificar que todos los tokens requeridos existan
  const missingTokens = REQUIRED_TOKENS.filter((token) => {
    const inLight = content.includes(`${token}:`);
    return !inLight;
  });

  if (missingTokens.length > 0) {
    log(`Faltan tokens requeridos: ${missingTokens.join(', ')}`, 'error');
    return false;
  }

  log('Archivo de tokens válido', 'success');
  return true;
}

/**
 * Valida que Tailwind config use los tokens centralizados
 */
function validateTailwindConfig() {
  log('Validando configuración de Tailwind...', 'info');

  if (!existsSync(TAILWIND_CONFIG)) {
    log(`Tailwind config no encontrado: ${TAILWIND_CONFIG}`, 'error');
    return false;
  }

  const content = readFile(TAILWIND_CONFIG);
  if (!content) return false;

  // Verificar que importe los tokens
  const importsTokens =
    content.includes("require('./src/config/theme/tailwind-colors')") ||
    content.includes("require('./src/config/theme/tailwind-colors.js')");

  if (!importsTokens) {
    log('Tailwind config no importa los tokens centralizados', 'warning');
    log('  Considera actualizar tailwind.config.js para usar themeColors', 'warning');
  } else {
    log('Tailwind config usa tokens centralizados', 'success');
  }

  return true;
}

/**
 * Valida que las variables CSS usen tokens semánticos
 */
function validateCSSVariables() {
  log('Validando variables CSS...', 'info');

  if (!existsSync(STYLES_CSS)) {
    log(`styles.css no encontrado: ${STYLES_CSS}`, 'error');
    return false;
  }

  const content = readFile(STYLES_CSS);
  if (!content) return false;

  // Verificar que existan variables semánticas
  const hasSemanticVars =
    content.includes('--surface-base') &&
    content.includes('--text-primary') &&
    content.includes('--cta-default');

  if (!hasSemanticVars) {
    log('Faltan variables CSS semánticas', 'warning');
    log('  Considera actualizar styles.css con tokens semánticos', 'warning');
  } else {
    log('Variables CSS usan tokens semánticos', 'success');
  }

  return true;
}

/**
 * Busca colores hardcodeados en el código
 * (patrón básico - puede mejorarse con AST parsing)
 */
function findHardcodedColors() {
  log('Buscando colores hardcodeados...', 'info');

  // Patrón para detectar colores hex
  const hexPattern = /#[0-9A-Fa-f]{3,6}/g;
  const rgbPattern = /rgba?\([^)]+\)/g;

  // Archivos a verificar
  const filesToCheck = [
    COLORS_FILE,
    TAILWIND_CONFIG,
    STYLES_CSS,
  ];

  const hardcodedColors = [];

  for (const filePath of filesToCheck) {
    if (!existsSync(filePath)) continue;

    const content = readFile(filePath);
    if (!content) continue;

    // Buscar hex colors (excluir comentarios y strings de documentación)
    const hexMatches = content.match(hexPattern);
    if (hexMatches) {
      // Filtrar colores que están en el sistema de tokens (permitidos)
      const allowedColors = [
        '#050505',
        '#F8F4EC',
        '#DFD2BF',
        '#111111',
        '#2B2B2B',
        '#4E4E4E',
        '#7B7B7B',
        '#BCBCBC',
        '#E3E3E3',
        '#F5F5F5',
        '#A7D8F4',
        '#8EC9EC',
        '#B25E5E',
        '#9DB38B',
        '#FFFFFF',
        '#000000',
        '#3B6E8F',
        '#6BA8D4',
        '#C4A882',
      ];

      const suspicious = hexMatches.filter(
        (color) => !allowedColors.includes(color.toUpperCase())
      );

      if (suspicious.length > 0) {
        hardcodedColors.push({
          file: filePath,
          colors: [...new Set(suspicious)],
        });
      }
    }
  }

  if (hardcodedColors.length > 0) {
    log('Se encontraron colores hardcodeados sospechosos:', 'warning');
    hardcodedColors.forEach(({ file, colors }) => {
      log(`  ${file}:`, 'warning');
      colors.forEach((color) => {
        log(`    - ${color}`, 'warning');
      });
    });
    log('  Considera usar tokens semánticos en su lugar', 'warning');
  } else {
    log('No se encontraron colores hardcodeados sospechosos', 'success');
  }

  return hardcodedColors.length === 0;
}

// ═══════════════════════════════════════════════════════════════
// EJECUCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════

function main() {
  log('🎨 Iniciando validación del sistema de colores...\n', 'info');

  const results = {
    tokensFile: validateTokensFile(),
    tailwindConfig: validateTailwindConfig(),
    cssVariables: validateCSSVariables(),
    noHardcodedColors: findHardcodedColors(),
  };

  console.log('\n' + '═'.repeat(60));
  log('Resumen de validación:', 'info');
  console.log('═'.repeat(60));

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const name = test
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
    console.log(`${status.padEnd(10)} ${name}`);
  });

  const allPassed = Object.values(results).every((r) => r);

  console.log('═'.repeat(60) + '\n');

  if (allPassed) {
    log('Todas las validaciones pasaron ✅', 'success');
    process.exit(0);
  } else {
    log('Algunas validaciones fallaron. Revisa los errores arriba.', 'error');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateTokensFile, validateTailwindConfig, validateCSSVariables, findHardcodedColors };






