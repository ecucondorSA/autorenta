#!/usr/bin/env node
/**
 * Color Contrast Checker - WCAG AA/AAA Compliance
 *
 * Valida que todos los pares de colores texto/fondo cumplan con WCAG 2.1:
 * - AA: 4.5:1 para texto normal, 3:1 para texto grande (18px+ o 14px bold+)
 * - AAA: 7:1 para texto normal, 4.5:1 para texto grande
 *
 * Uso:
 *   node tools/check-color-contrast.mjs
 *   npm run check:contrast (si se agrega al package.json)
 */

// Conversión de hex a RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calcular luminancia relativa (WCAG formula)
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calcular ratio de contraste (WCAG formula)
function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Niveles de compliance WCAG
function checkCompliance(ratio, isLargeText = false) {
  const minAA = isLargeText ? 3 : 4.5;
  const minAAA = isLargeText ? 4.5 : 7;

  return {
    passAA: ratio >= minAA,
    passAAA: ratio >= minAAA,
    ratio: ratio.toFixed(2),
    level: ratio >= minAAA ? 'AAA' : ratio >= minAA ? 'AA' : 'FAIL'
  };
}

// Colores del design system (desde tailwind.config.js y styles.css)
const colorPairs = [
  // Text colors sobre surface-base (#f3e8d8)
  {
    name: 'text-primary on surface-base',
    fg: '#2b1d14',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
  {
    name: 'text-secondary on surface-base',
    fg: '#5c4736',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
  {
    name: 'text-muted on surface-base',
    fg: '#8c7765',
    bg: '#F8F4EC',
    sizes: ['large'] // Solo large text
  },

  // Text sobre surface-elevated (#ffffff)
  {
    name: 'text-primary on surface-elevated',
    fg: '#2b1d14',
    bg: '#ffffff',
    sizes: ['normal', 'large']
  },
  {
    name: 'text-secondary on surface-elevated',
    fg: '#5c4736',
    bg: '#ffffff',
    sizes: ['normal', 'large']
  },

  // Brand colors sobre fondos
  {
    name: 'primary on surface-base',
    fg: '#2563EB',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
  {
    name: 'primary-dark on surface-base',
    fg: '#1D4ED8',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },

  // Text sobre primary (botones)
  {
    name: 'white on primary',
    fg: '#ffffff',
    bg: '#2563EB',
    sizes: ['normal', 'large']
  },
  {
    name: 'white on primary-dark',
    fg: '#ffffff',
    bg: '#1D4ED8',
    sizes: ['normal', 'large']
  },

  // Accent colors
  {
    name: 'accent-warm on surface-base',
    fg: '#705D44',
    bg: '#F8F4EC',
    sizes: ['large'] // Usar solo en large text
  },
  {
    name: 'white on accent-warm',
    fg: '#ffffff',
    bg: '#705D44',
    sizes: ['normal', 'large']
  },

  // Status colors
  {
    name: 'success-dark on surface-base',
    fg: '#2d6a4f',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
  {
    name: 'error-dark on surface-base',
    fg: '#c1121f',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
  {
    name: 'warning-dark on surface-base',
    fg: '#854D0E',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
  {
    name: 'info-dark on surface-base',
    fg: '#00509d',
    bg: '#F8F4EC',
    sizes: ['normal', 'large']
  },
];

console.log('🎨 Color Contrast Checker - WCAG AA/AAA Compliance\n');
console.log('═'.repeat(80));

let totalPairs = 0;
let passedAA = 0;
let passedAAA = 0;
let failed = [];

colorPairs.forEach(pair => {
  const ratio = getContrastRatio(pair.fg, pair.bg);

  console.log(`\n📊 ${pair.name}`);
  console.log(`   Foreground: ${pair.fg}  |  Background: ${pair.bg}`);

  pair.sizes.forEach(size => {
    const isLarge = size === 'large';
    const result = checkCompliance(ratio, isLarge);

    totalPairs++;
    if (result.passAA) passedAA++;
    if (result.passAAA) passedAAA++;

    const sizeLabel = isLarge ? '18px+/14px bold+' : '16px normal';
    const statusIcon = result.passAA ? '✅' : '❌';
    const levelColor = result.level === 'AAA' ? '🟢' : result.level === 'AA' ? '🟡' : '🔴';

    console.log(`   ${statusIcon} ${sizeLabel.padEnd(18)} | Ratio: ${result.ratio}:1 ${levelColor} ${result.level}`);

    if (!result.passAA) {
      failed.push({
        name: pair.name,
        size: sizeLabel,
        ratio: result.ratio,
        required: isLarge ? '3.0' : '4.5'
      });
    }
  });
});

console.log('\n' + '═'.repeat(80));
console.log('\n📈 RESULTADOS\n');
console.log(`Total pares evaluados: ${totalPairs}`);
console.log(`✅ Pasan WCAG AA:      ${passedAA}/${totalPairs} (${(passedAA / totalPairs * 100).toFixed(1)}%)`);
console.log(`🟢 Pasan WCAG AAA:     ${passedAAA}/${totalPairs} (${(passedAAA / totalPairs * 100).toFixed(1)}%)`);

if (failed.length > 0) {
  console.log(`\n❌ FALLOS (${failed.length}):n`);
  failed.forEach(f => {
    console.log(`   ${f.name} (${f.size})`);
    console.log(`   → Ratio: ${f.ratio}:1 (requerido: ${f.required}:1)\n`);
  });

  console.log('💡 RECOMENDACIONES:');
  console.log('   1. Oscurecer el color de texto');
  console.log('   2. Aclarar el color de fondo');
  console.log('   3. Usar solo en large text (18px+ o 14px bold+)');
  console.log('   4. Considerar usar text-primary en su lugar\n');

  process.exit(1);
} else {
  console.log('\n🎉 ¡Todos los pares de colores pasan WCAG AA!\n');
  console.log('📚 Más información:');
  console.log('   - WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html');
  console.log('   - Contrast Checker: https://webaim.org/resources/contrastchecker/\n');

  process.exit(0);
}
