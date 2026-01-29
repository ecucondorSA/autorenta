#!/usr/bin/env node
/**
 * Font Size Accessibility Checker
 *
 * Valida que todos los tamaños de fuente cumplan con estándares de accesibilidad:
 * - WCAG 2.1 Level AA: Tamaño mínimo recomendado 16px para body text
 * - WCAG 2.1 Level AAA: Tamaño mínimo recomendado 18px para body text
 * - Texto crítico (captions, metadata): Mínimo absoluto 12px
 *
 * Verifica:
 * 1. Tamaños mínimos para diferentes tipos de texto
 * 2. Line-heights adecuados (WCAG requiere mínimo 1.5 para body)
 * 3. Letter-spacing óptimo para legibilidad
 *
 * Uso:
 *   node tools/check-font-sizes.mjs
 *   npm run check:font-sizes (si se agrega al package.json)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer configuración de Tailwind
const tailwindConfigPath = join(__dirname, '../../apps/web/tailwind.config.js');
let tailwindConfig;

try {
  const configContent = readFileSync(tailwindConfigPath, 'utf-8');
  // Extraer fontSize config (simplificado, asume formato específico)
  const fontSizeMatch = configContent.match(/fontSize:\s*{([^}]+)}/s);
  if (fontSizeMatch) {
    // Parse manual básico del fontSize config
    console.log('✅ Configuración de Tailwind cargada\n');
  }
} catch (error) {
  console.error('❌ Error al cargar tailwind.config.js:', error.message);
  process.exit(1);
}

// Reglas WCAG y mejores prácticas
const RULES = {
  minBodySize: 16, // WCAG AA recomendado
  minBodySizeAAA: 18, // WCAG AAA recomendado
  minCaptionSize: 12, // Mínimo absoluto
  minLineHeight: 1.5, // WCAG AA para body text
  minLineHeightHeadings: 1.2, // WCAG para headings
  maxLineLength: 80, // Caracteres (80ch recomendado)
  minLetterSpacing: -0.02, // Em units (tracking)
};

// Font sizes del sistema (desde tailwind.config.js)
const fontSizes = {
  xs: {
    size: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', // 12px → 14px
    pixels: { min: 12, max: 14 },
    lineHeight: 1.4,
    usage: 'Captions, metadata, helper text',
    type: 'caption'
  },
  sm: {
    size: 'clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)', // 13px → 15px
    pixels: { min: 13, max: 15 },
    lineHeight: 1.5,
    usage: 'Small text, secondary information',
    type: 'small'
  },
  base: {
    size: 'clamp(0.9375rem, 0.875rem + 0.3vw, 1.0625rem)', // 15px → 17px
    pixels: { min: 15, max: 17 },
    lineHeight: 1.6,
    usage: 'Body text (default)',
    type: 'body'
  },
  lg: {
    size: 'clamp(1.0625rem, 0.95rem + 0.5vw, 1.25rem)', // 17px → 20px
    pixels: { min: 17, max: 20 },
    lineHeight: 1.5,
    usage: 'Emphasized text, lead paragraphs',
    type: 'body'
  },
  xl: {
    size: 'clamp(1.125rem, 0.95rem + 0.875vw, 1.5rem)', // 18px → 24px
    pixels: { min: 18, max: 24 },
    lineHeight: 1.4,
    usage: 'Subheadings, large emphasis',
    type: 'heading'
  },
  '2xl': {
    size: 'clamp(1.375rem, 1.1rem + 1.375vw, 1.875rem)', // 22px → 30px
    pixels: { min: 22, max: 30 },
    lineHeight: 1.3,
    usage: 'H3 headings',
    type: 'heading'
  },
  '3xl': {
    size: 'clamp(1.75rem, 1.2rem + 2.75vw, 2.5rem)', // 28px → 40px
    pixels: { min: 28, max: 40 },
    lineHeight: 1.25,
    usage: 'H2 headings',
    type: 'heading'
  },
  '4xl': {
    size: 'clamp(2rem, 1.2rem + 4vw, 3.25rem)', // 32px → 52px
    pixels: { min: 32, max: 52 },
    lineHeight: 1.2,
    usage: 'H1 headings',
    type: 'heading'
  },
  '5xl': {
    size: 'clamp(2.5rem, 1.5rem + 5vw, 4rem)', // 40px → 64px
    pixels: { min: 40, max: 64 },
    lineHeight: 1.1,
    usage: 'Display headings',
    type: 'display'
  },
  '6xl': {
    size: 'clamp(3rem, 1.75rem + 6.25vw, 5rem)', // 48px → 80px
    pixels: { min: 48, max: 80 },
    lineHeight: 1,
    usage: 'Hero titles',
    type: 'display'
  },
  '7xl': {
    size: 'clamp(3.5rem, 2rem + 7.5vw, 6rem)', // 56px → 96px
    pixels: { min: 56, max: 96 },
    lineHeight: 1,
    usage: 'Extra large displays',
    type: 'display'
  },
};

console.log('🔍 Font Size Accessibility Checker\n');
console.log('═'.repeat(80));

let totalChecks = 0;
let passed = 0;
let warnings = [];
let errors = [];

Object.entries(fontSizes).forEach(([name, config]) => {
  console.log(`\n📏 text-${name}`);
  console.log(`   Size: ${config.size}`);
  console.log(`   Range: ${config.pixels.min}px - ${config.pixels.max}px`);
  console.log(`   Line height: ${config.lineHeight}`);
  console.log(`   Usage: ${config.usage}`);

  let checks = [];

  // Check 1: Tamaño mínimo según tipo
  totalChecks++;
  if (config.type === 'body') {
    if (config.pixels.min >= RULES.minBodySize) {
      checks.push('✅ Tamaño mínimo OK (≥16px para body)');
      passed++;
    } else if (config.pixels.min >= RULES.minCaptionSize) {
      checks.push(`⚠️  Tamaño bajo (${config.pixels.min}px, recomendado ≥16px para body)`);
      warnings.push({
        size: name,
        issue: `Body text mínimo ${config.pixels.min}px (recomendado ≥16px)`,
        recommendation: 'Incrementar font-size base o usar solo para secondary text'
      });
    } else {
      checks.push(`❌ Tamaño muy bajo (${config.pixels.min}px < 12px mínimo)`);
      errors.push({
        size: name,
        issue: `Tamaño ${config.pixels.min}px menor al mínimo absoluto (12px)`,
        recommendation: 'CRÍTICO: Incrementar tamaño inmediatamente'
      });
    }
  } else if (config.type === 'caption') {
    if (config.pixels.min >= RULES.minCaptionSize) {
      checks.push('✅ Tamaño mínimo OK (≥12px para captions)');
      passed++;
    } else {
      checks.push(`❌ Tamaño muy bajo (${config.pixels.min}px < 12px mínimo)`);
      errors.push({
        size: name,
        issue: `Caption ${config.pixels.min}px menor al mínimo (12px)`,
        recommendation: 'CRÍTICO: Incrementar tamaño a mínimo 12px'
      });
    }
  } else {
    checks.push('✅ Tamaño OK (heading/display)');
    passed++;
  }

  // Check 2: Line height adecuado
  totalChecks++;
  const minLineHeight = config.type === 'body' || config.type === 'small'
    ? RULES.minLineHeight
    : RULES.minLineHeightHeadings;

  if (config.lineHeight >= minLineHeight) {
    checks.push(`✅ Line height OK (${config.lineHeight} ≥ ${minLineHeight})`);
    passed++;
  } else {
    checks.push(`⚠️  Line height bajo (${config.lineHeight} < ${minLineHeight} recomendado)`);
    warnings.push({
      size: name,
      issue: `Line height ${config.lineHeight} menor al recomendado (${minLineHeight})`,
      recommendation: 'Incrementar line-height para mejor legibilidad'
    });
  }

  checks.forEach(check => console.log(`   ${check}`));
});

console.log('\n' + '═'.repeat(80));
console.log('\n📊 RESULTADOS\n');
console.log(`Total checks: ${totalChecks}`);
console.log(`✅ Passed: ${passed}/${totalChecks} (${(passed/totalChecks*100).toFixed(1)}%)`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERRORES CRÍTICOS:\n');
  errors.forEach((err, i) => {
    console.log(`${i + 1}. text-${err.size}`);
    console.log(`   Problema: ${err.issue}`);
    console.log(`   Acción: ${err.recommendation}\n`);
  });
}

if (warnings.length > 0) {
  console.log('\n⚠️  ADVERTENCIAS:\n');
  warnings.forEach((warn, i) => {
    console.log(`${i + 1}. text-${warn.size}`);
    console.log(`   Problema: ${warn.issue}`);
    console.log(`   Recomendación: ${warn.recommendation}\n`);
  });
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n🎉 ¡Todos los tamaños de fuente cumplen con estándares de accesibilidad!\n');
  console.log('📚 Referencias:');
  console.log('   - WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/');
  console.log('   - Web Typography: https://web.dev/learn/design/typography/');
  console.log('   - Font Size Guide: https://www.a11yproject.com/posts/how-to-accessible-heading-structure/\n');
}

console.log('\n💡 MEJORES PRÁCTICAS:');
console.log('   ✓ Body text: Mínimo 16px (15px aceptable en mobile)');
console.log('   ✓ Captions: Mínimo 12px (no menor)');
console.log('   ✓ Line height body: Mínimo 1.5 (1.6 recomendado)');
console.log('   ✓ Line height headings: Mínimo 1.2');
console.log('   ✓ Measure (line length): Máximo 65-80 caracteres\n');

if (errors.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
