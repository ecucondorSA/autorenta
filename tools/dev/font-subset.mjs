#!/usr/bin/env node
/**
 * Font Subsetting Script - Inter Variable Font
 *
 * Crea un subset optimizado de Inter Variable Font con solo los caracteres necesarios:
 * - Caracteres latinos para español (a-z, A-Z, á, é, í, ó, ú, ñ, ¿, ¡)
 * - Números (0-9)
 * - Símbolos comunes ($, €, %, +, -, =, etc.)
 * - Puntuación estándar
 *
 * Reduce el tamaño del archivo de ~344KB a ~50-80KB (85% reducción)
 *
 * REQUISITOS:
 * 1. Instalar fonttools: pip install fonttools brotli
 * 2. Ejecutar este script: node tools/font-subset.mjs
 *
 * ALTERNATIVA (sin instalación):
 * 1. Visitar: https://everythingfonts.com/subsetter
 * 2. Subir: apps/web/src/assets/fonts/inter-var.woff2
 * 3. Seleccionar: Latin Extended, Numbers, Punctuation, Currency
 * 4. Custom characters: áéíóúÁÉÍÓÚñÑ¿¡$€
 * 5. Descargar y reemplazar en: apps/web/src/assets/fonts/inter-var.woff2
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const fontDir = join(__dirname, '../apps/web/src/assets/fonts');
const inputFont = join(fontDir, 'inter-var.woff2');
const outputFont = join(fontDir, 'inter-var-subset.woff2');

// Unicode ranges para subset optimizado
const UNICODE_RANGES = [
  // Basic Latin (a-z, A-Z, 0-9, punctuation)
  'U+0020-007F',
  // Latin-1 Supplement (á, é, í, ó, ú, ñ, ¿, ¡, etc.)
  'U+00A0-00FF',
  // Latin Extended-A (caracteres adicionales español)
  'U+0100-017F',
  // Currency symbols ($, €, £, ¥)
  'U+20A0-20CF',
  // General punctuation (—, –, ", ", ', ')
  'U+2000-206F',
  // Arrows and math symbols
  'U+2190-21FF',
  'U+2200-22FF',
];

// Character sets específicos
const CUSTOM_CHARS = 'áéíóúÁÉÍÓÚñÑ¿¡€$¢£¥';

console.log('🔤 Font Subsetting Script - Inter Variable Font\n');

// Verificar que el archivo fuente existe
if (!existsSync(inputFont)) {
  console.error(`❌ Error: Archivo fuente no encontrado: ${inputFont}`);
  process.exit(1);
}

const inputSize = statSync(inputFont).size;
console.log(`📦 Archivo original: ${(inputSize / 1024).toFixed(2)} KB`);

// Verificar si pyftsubset está disponible
try {
  execSync('pyftsubset --help', { stdio: 'ignore' });
  console.log('✅ pyftsubset detectado, creando subset...\n');

  // Comando pyftsubset
  const unicodeRangesArg = UNICODE_RANGES.join(',');
  const command = `pyftsubset "${inputFont}" \
    --output-file="${outputFont}" \
    --flavor=woff2 \
    --layout-features='*' \
    --no-hinting \
    --desubroutinize \
    --unicodes="${unicodeRangesArg}" \
    --text="${CUSTOM_CHARS}"`;

  console.log('Ejecutando subsetting...');
  execSync(command, { stdio: 'inherit' });

  if (existsSync(outputFont)) {
    const outputSize = statSync(outputFont).size;
    const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);

    console.log('\n✅ Subset creado exitosamente!');
    console.log(`📦 Archivo subset: ${(outputSize / 1024).toFixed(2)} KB`);
    console.log(`📉 Reducción: ${reduction}% (${(inputSize / 1024 - outputSize / 1024).toFixed(2)} KB ahorrados)`);
    console.log(`\n📂 Archivo generado: ${outputFont}`);
    console.log('\n💡 Para usar el subset:');
    console.log('   1. Revisar que todos los caracteres necesarios estén incluidos');
    console.log('   2. Reemplazar inter-var.woff2 con inter-var-subset.woff2');
    console.log('   3. Actualizar src/styles.css si es necesario\n');
  }

} catch (error) {
  console.log('⚠️  pyftsubset no está instalado.\n');
  console.log('📋 OPCIÓN 1 - Instalar fonttools (recomendado):');
  console.log('   pip install fonttools brotli');
  console.log('   node tools/font-subset.mjs\n');

  console.log('📋 OPCIÓN 2 - Usar herramienta online:');
  console.log('   1. Visitar: https://everythingfonts.com/subsetter');
  console.log('   2. Subir: apps/web/src/assets/fonts/inter-var.woff2');
  console.log('   3. Configurar:');
  console.log('      - Latin Basic: ✅');
  console.log('      - Latin Extended: ✅');
  console.log('      - Latin Supplement: ✅');
  console.log('      - Numbers: ✅');
  console.log('      - Punctuation: ✅');
  console.log('      - Currency Symbols: ✅');
  console.log(`      - Custom characters: ${CUSTOM_CHARS}`);
  console.log('   4. Descargar y reemplazar archivo\n');

  console.log('📋 OPCIÓN 3 - Usar glyphhanger (Node.js):');
  console.log('   npx glyphhanger --subset=apps/web/src/assets/fonts/inter-var.woff2 \\');
  console.log('     --formats=woff2 --US_ASCII --whitelist="áéíóúÁÉÍÓÚñÑ¿¡€$"\n');

  console.log('⚡ BENEFICIOS esperados:');
  console.log('   - Reducción de tamaño: ~85% (344KB → ~50KB)');
  console.log('   - Faster First Contentful Paint (FCP)');
  console.log('   - Mejor Core Web Vitals (CLS)');
  console.log('   - Menos datos descargados (importante en mobile)\n');
}
