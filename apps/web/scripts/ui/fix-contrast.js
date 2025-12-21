#!/usr/bin/env node
/**
 * fix-contrast.js - Auditor y Corrector de Contraste WCAG 2.1
 *
 * Escanea el codebase buscando problemas de contraste y los corrige
 * usando los tokens del sistema de color de AutoRenta.
 *
 * Uso:
 *   node scripts/fix-contrast.js           # Ejecutar correcciones
 *   node scripts/fix-contrast.js --dry-run # Solo mostrar qué cambiaría
 *   node scripts/fix-contrast.js --backup  # Crear backup antes de modificar
 *
 * @see src/config/theme/colors.ts (source of truth)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIGURACION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  targetDir: path.join(__dirname, '../src'),
  extensions: ['.css', '.scss', '.html', '.ts', '.tsx'],
  dryRun: process.argv.includes('--dry-run'),
  backup: process.argv.includes('--backup'),
  verbose: process.argv.includes('--verbose'),
  backupDir: path.join(__dirname, '../.contrast-backup'),
};

// ═══════════════════════════════════════════════════════════════
// TOKENS DE COLOR (sincronizados con colors.ts)
// ═══════════════════════════════════════════════════════════════

const PALETTE = {
  neutral: {
    black: '#050505',
    ivory: '#F8F4EC',
    beige: '#DFD2BF',
  },
  gray: {
    G100: '#111111',
    G80: '#2B2B2B',
    G60: '#4E4E4E',
    G40: '#7B7B7B',
    G20: '#BCBCBC',
    G10: '#E3E3E3',
    G05: '#F5F5F5',
  },
  accent: {
    blue: '#A7D8F4',
    blueHover: '#8EC9EC',
    blueDark: '#3B6E8F', // Para texto sobre fondos claros
  },
  feedback: {
    error: '#B25E5E',
    errorStrong: '#8B3A3A', // Mayor contraste para texto
    success: '#9DB38B',
    successStrong: '#5A7A48', // Mayor contraste para texto
    warning: '#C4A882',
    warningStrong: '#8B6914', // Mayor contraste para texto
  },
};

// ═══════════════════════════════════════════════════════════════
// REGLAS DE REEMPLAZO
// ═══════════════════════════════════════════════════════════════

const RULES = [
  // ───────────────────────────────────────────────────────────────
  // CSS: RGBA con baja opacidad -> HEX solido
  // ───────────────────────────────────────────────────────────────

  // Textos oscuros semi-transparentes (sobre fondo claro)
  {
    pattern: /rgba\(\s*0,\s*0,\s*0,\s*0\.[3-4]\d*\s*\)/gi,
    replacement: PALETTE.gray.G40,
    description: 'CSS: black/30-40% -> G40 (#7B7B7B)',
    category: 'css-rgba',
  },
  {
    pattern: /rgba\(\s*0,\s*0,\s*0,\s*0\.[5-6]\d*\s*\)/gi,
    replacement: PALETTE.gray.G60,
    description: 'CSS: black/50-60% -> G60 (#4E4E4E)',
    category: 'css-rgba',
  },
  {
    pattern: /rgba\(\s*0,\s*0,\s*0,\s*0\.[7-8]\d*\s*\)/gi,
    replacement: PALETTE.gray.G80,
    description: 'CSS: black/70-80% -> G80 (#2B2B2B)',
    category: 'css-rgba',
  },

  // Slate oscuro semi-transparente
  {
    pattern: /rgba\(\s*15,\s*23,\s*42,\s*0\.[4-5]\d*\s*\)/gi,
    replacement: PALETTE.gray.G40,
    description: 'CSS: slate-900/40-50% -> G40',
    category: 'css-rgba',
  },
  {
    pattern: /rgba\(\s*15,\s*23,\s*42,\s*0\.[6-7]\d*\s*\)/gi,
    replacement: PALETTE.gray.G60,
    description: 'CSS: slate-900/60-70% -> G60',
    category: 'css-rgba',
  },
  {
    pattern: /rgba\(\s*15,\s*23,\s*42,\s*0\.[8-9]\d*\s*\)/gi,
    replacement: PALETTE.gray.G80,
    description: 'CSS: slate-900/80-90% -> G80',
    category: 'css-rgba',
  },

  // Textos claros semi-transparentes (sobre fondo oscuro)
  {
    pattern: /rgba\(\s*255,\s*255,\s*255,\s*0\.[4-5]\d*\s*\)/gi,
    replacement: PALETTE.gray.G40,
    description: 'CSS: white/40-50% -> G40',
    category: 'css-rgba',
  },
  {
    pattern: /rgba\(\s*255,\s*255,\s*255,\s*0\.[6-7]\d*\s*\)/gi,
    replacement: PALETTE.gray.G20,
    description: 'CSS: white/60-70% -> G20',
    category: 'css-rgba',
  },
  {
    pattern: /rgba\(\s*255,\s*255,\s*255,\s*0\.[8-9]\d*\s*\)/gi,
    replacement: PALETTE.gray.G10,
    description: 'CSS: white/80-90% -> G10',
    category: 'css-rgba',
  },

  // ───────────────────────────────────────────────────────────────
  // TAILWIND: Clases de texto con bajo contraste
  // Usa negative lookbehind (?<!dark:) para no afectar dark mode
  // ───────────────────────────────────────────────────────────────

  // Grises muy claros como texto (malo en light mode)
  {
    pattern: /(?<!dark:)(?<!hover:)(?<!\/)text-gray-300(?=\s|"|'|`|$)/g,
    replacement: 'text-gray-500',
    description: 'TW: text-gray-300 -> text-gray-500 (light mode)',
    category: 'tailwind-text',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)(?<!\/)text-gray-400(?=\s|"|'|`|$)/g,
    replacement: 'text-gray-500',
    description: 'TW: text-gray-400 -> text-gray-500 (light mode)',
    category: 'tailwind-text',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)(?<!\/)text-slate-300(?=\s|"|'|`|$)/g,
    replacement: 'text-gray-500',
    description: 'TW: text-slate-300 -> text-gray-500 (light mode)',
    category: 'tailwind-text',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)(?<!\/)text-slate-400(?=\s|"|'|`|$)/g,
    replacement: 'text-gray-500',
    description: 'TW: text-slate-400 -> text-gray-500 (light mode)',
    category: 'tailwind-text',
  },

  // Colores semanticos claros como texto -> versiones 700 (más oscuras para contraste)
  {
    pattern: /(?<!dark:)(?<!hover:)text-success-light(?=\s|"|'|`|$)/g,
    replacement: 'text-success-700',
    description: 'TW: text-success-light -> text-success-700',
    category: 'tailwind-semantic',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)text-warning-light(?=\s|"|'|`|$)/g,
    replacement: 'text-warning-700',
    description: 'TW: text-warning-light -> text-warning-700',
    category: 'tailwind-semantic',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)text-error-light(?=\s|"|'|`|$)/g,
    replacement: 'text-error-700',
    description: 'TW: text-error-light -> text-error-700',
    category: 'tailwind-semantic',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)text-info-light(?=\s|"|'|`|$)/g,
    replacement: 'text-info-700',
    description: 'TW: text-info-light -> text-info-700',
    category: 'tailwind-semantic',
  },

  // ───────────────────────────────────────────────────────────────
  // TAILWIND: Placeholders con bajo contraste
  // ───────────────────────────────────────────────────────────────

  {
    pattern: /placeholder-gray-300(?=\s|"|'|`|$)/g,
    replacement: 'placeholder-gray-500',
    description: 'TW: placeholder-gray-300 -> placeholder-gray-500',
    category: 'tailwind-placeholder',
  },
  {
    pattern: /placeholder-gray-400(?=\s|"|'|`|$)/g,
    replacement: 'placeholder-gray-500',
    description: 'TW: placeholder-gray-400 -> placeholder-gray-500',
    category: 'tailwind-placeholder',
  },
  {
    pattern: /placeholder:text-gray-300(?=\s|"|'|`|$)/g,
    replacement: 'placeholder:text-gray-500',
    description: 'TW: placeholder:text-gray-300 -> placeholder:text-gray-500',
    category: 'tailwind-placeholder',
  },
  {
    pattern: /placeholder:text-gray-400(?=\s|"|'|`|$)/g,
    replacement: 'placeholder:text-gray-500',
    description: 'TW: placeholder:text-gray-400 -> placeholder:text-gray-500',
    category: 'tailwind-placeholder',
  },

  // ───────────────────────────────────────────────────────────────
  // TAILWIND: Bordes con bajo contraste
  // ───────────────────────────────────────────────────────────────

  {
    pattern: /(?<!dark:)(?<!hover:)border-gray-100(?=\s|"|'|`|$)/g,
    replacement: 'border-gray-300',
    description: 'TW: border-gray-100 -> border-gray-300',
    category: 'tailwind-border',
  },
  {
    pattern: /(?<!dark:)(?<!hover:)border-gray-200(?=\s|"|'|`|$)/g,
    replacement: 'border-gray-300',
    description: 'TW: border-gray-200 -> border-gray-300',
    category: 'tailwind-border',
  },

  // ───────────────────────────────────────────────────────────────
  // OPACITY: Clases de opacidad baja en texto
  // ───────────────────────────────────────────────────────────────

  {
    pattern: /text-opacity-[1-4]0(?=\s|"|'|`|$)/g,
    replacement: 'text-opacity-60',
    description: 'TW: text-opacity-10-40 -> text-opacity-60',
    category: 'tailwind-opacity',
  },
];

// ═══════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;

  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);

    // Skip node_modules, dist, .git
    if (f === 'node_modules' || f === 'dist' || f === '.git' || f === 'android') {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

function createBackup(filePath) {
  if (!CONFIG.backup) return;

  const relativePath = path.relative(CONFIG.targetDir, filePath);
  const backupPath = path.join(CONFIG.backupDir, relativePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(filePath, backupPath);
}

function formatNumber(num) {
  return num.toString().padStart(3, ' ');
}

// ═══════════════════════════════════════════════════════════════
// PROCESAMIENTO PRINCIPAL
// ═══════════════════════════════════════════════════════════════

const stats = {
  filesScanned: 0,
  filesModified: 0,
  totalReplacements: 0,
  byCategory: {},
  byFile: [],
};

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           WCAG 2.1 Contrast Auditor - AutoRenta              ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📂 Directorio: ${CONFIG.targetDir}`);
console.log(`🔧 Modo: ${CONFIG.dryRun ? 'DRY RUN (sin cambios)' : 'EJECUTAR cambios'}`);
console.log(`💾 Backup: ${CONFIG.backup ? 'SI' : 'NO'}`);
console.log('');

if (CONFIG.backup && !CONFIG.dryRun) {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
  console.log(`📁 Backups en: ${CONFIG.backupDir}`);
  console.log('');
}

console.log('──────────────────────────────────────────────────────────────');
console.log('');

walkDir(CONFIG.targetDir, (filePath) => {
  const ext = path.extname(filePath);
  if (!CONFIG.extensions.includes(ext)) return;

  stats.filesScanned++;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const fileReplacements = [];

  // Aplicar cada regla
  RULES.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches && matches.length > 0) {
      content = content.replace(rule.pattern, rule.replacement);

      fileReplacements.push({
        rule: rule.description,
        count: matches.length,
        category: rule.category,
      });

      // Actualizar stats por categoria
      if (!stats.byCategory[rule.category]) {
        stats.byCategory[rule.category] = 0;
      }
      stats.byCategory[rule.category] += matches.length;
    }
  });

  // Si hubo cambios
  if (content !== originalContent) {
    const relativePath = path.relative(CONFIG.targetDir, filePath);
    const totalInFile = fileReplacements.reduce((sum, r) => sum + r.count, 0);

    stats.filesModified++;
    stats.totalReplacements += totalInFile;
    stats.byFile.push({
      path: relativePath,
      replacements: fileReplacements,
      total: totalInFile,
    });

    if (CONFIG.dryRun) {
      console.log(`📄 ${relativePath}`);
      fileReplacements.forEach(r => {
        console.log(`   └─ ${r.count}x ${r.rule}`);
      });
      console.log('');
    } else {
      createBackup(filePath);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${relativePath} (${totalInFile} cambios)`);

      if (CONFIG.verbose) {
        fileReplacements.forEach(r => {
          console.log(`   └─ ${r.count}x ${r.rule}`);
        });
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORTE FINAL
// ═══════════════════════════════════════════════════════════════

console.log('');
console.log('══════════════════════════════════════════════════════════════');
console.log('                         RESUMEN');
console.log('══════════════════════════════════════════════════════════════');
console.log('');
console.log(`📊 Archivos escaneados:    ${formatNumber(stats.filesScanned)}`);
console.log(`📝 Archivos ${CONFIG.dryRun ? 'a modificar' : 'modificados'}:  ${formatNumber(stats.filesModified)}`);
console.log(`🔧 Total correcciones:     ${formatNumber(stats.totalReplacements)}`);
console.log('');

if (Object.keys(stats.byCategory).length > 0) {
  console.log('Por categoria:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(20)} ${formatNumber(count)}`);
    });
  console.log('');
}

if (CONFIG.dryRun && stats.totalReplacements > 0) {
  console.log('💡 Ejecuta sin --dry-run para aplicar los cambios');
  console.log('');
}

if (stats.totalReplacements === 0) {
  console.log('✨ No se encontraron problemas de contraste conocidos');
  console.log('');
}

console.log('══════════════════════════════════════════════════════════════');
console.log('');
