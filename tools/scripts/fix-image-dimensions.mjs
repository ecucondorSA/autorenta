#!/usr/bin/env node
/**
 * Script: fix-image-dimensions.mjs
 * Agrega width/height a imágenes que no las tienen
 *
 * Uso: node tools/scripts/fix-image-dimensions.mjs [--dry-run] [--apply]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const DRY_RUN = !process.argv.includes('--apply');

// Mapeo de clases Tailwind a dimensiones
const TAILWIND_SIZES = {
  'w-4': 16, 'h-4': 16,
  'w-5': 20, 'h-5': 20,
  'w-6': 24, 'h-6': 24,
  'w-8': 32, 'h-8': 32,
  'w-10': 40, 'h-10': 40,
  'w-12': 48, 'h-12': 48,
  'w-16': 64, 'h-16': 64,
  'w-20': 80, 'h-20': 80,
  'w-24': 96, 'h-24': 96,
  'w-32': 128, 'h-32': 128,
  'w-48': 192, 'h-48': 192,
  'w-64': 256, 'h-64': 256,
};

function extractDimensions(imgTag, context) {
  const classMatch = imgTag.match(/class="([^"]+)"/);
  const classes = classMatch ? classMatch[1] : '';
  const allContext = classes + ' ' + context;

  let width = 0, height = 0;

  // Buscar dimensiones en clases
  for (const [cls, size] of Object.entries(TAILWIND_SIZES)) {
    if (allContext.includes(cls)) {
      if (cls.startsWith('w-')) width = size;
      if (cls.startsWith('h-')) height = size;
    }
  }

  // Aspect ratios
  if (allContext.includes('aspect-video')) {
    if (width && !height) height = Math.round(width * 9 / 16);
    if (height && !width) width = Math.round(height * 16 / 9);
    if (!width && !height) { width = 400; height = 225; }
  }

  if (allContext.includes('aspect-square')) {
    if (width && !height) height = width;
    if (height && !width) width = height;
  }

  // Defaults por contexto
  if (!width || !height) {
    if (/avatar|profile|user/i.test(imgTag)) {
      width = width || 48; height = height || 48;
    } else if (/car|vehicle|photo/i.test(imgTag)) {
      width = width || 400; height = height || 300;
    } else if (/thumb|preview/i.test(imgTag)) {
      width = width || 200; height = height || 150;
    } else if (allContext.includes('object-cover') || allContext.includes('w-full')) {
      width = width || 400; height = height || 300;
    }
  }

  return width && height ? { width, height } : null;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixes = [];

  // Encontrar tags <img> completos
  const imgRegex = /<img\b[^>]*>/g;
  let match;
  let newContent = content;
  let offset = 0;

  while ((match = imgRegex.exec(content)) !== null) {
    const imgTag = match[0];

    // Saltar si ya tiene dimensiones
    if (/\bwidth\s*=|\[width\]|height\s*=|\[height\]|ngSrc/i.test(imgTag)) continue;
    if (/icon/i.test(imgTag)) continue;

    // Contexto
    const start = Math.max(0, match.index - 300);
    const end = Math.min(content.length, match.index + imgTag.length + 100);
    const context = content.substring(start, end);

    const dims = extractDimensions(imgTag, context);
    if (!dims) continue;

    const line = content.substring(0, match.index).split('\n').length;

    // Crear nuevo tag
    let newTag = imgTag;
    const attrs = `width="${dims.width}" height="${dims.height}"`;

    if (imgTag.includes('/>')) {
      newTag = imgTag.replace(/\s*\/>$/, ` ${attrs} />`);
    } else {
      newTag = imgTag.replace(/\s*>$/, ` ${attrs}>`);
    }

    fixes.push({
      file: filePath.replace(ROOT + '/', ''),
      line,
      dims,
    });

    if (!DRY_RUN) {
      const pos = match.index + offset;
      newContent = newContent.substring(0, pos) + newTag + newContent.substring(pos + imgTag.length);
      offset += newTag.length - imgTag.length;
    }
  }

  if (!DRY_RUN && fixes.length > 0) {
    fs.writeFileSync(filePath, newContent);
  }

  return fixes;
}

function walkDir(dir, fixes = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.includes('node_modules')) {
      walkDir(filePath, fixes);
    } else if (file.endsWith('.html')) {
      fixes.push(...processFile(filePath));
    }
  }
  return fixes;
}

// Main
console.log('🔍 Scanning for images without dimensions...\n');

const srcDir = path.join(ROOT, 'apps/web/src');
const fixes = walkDir(srcDir);

console.log(`Found ${fixes.length} images to fix:\n`);

for (const fix of fixes) {
  console.log(`📍 ${fix.file}:${fix.line}`);
  console.log(`   Added: width="${fix.dims.width}" height="${fix.dims.height}"`);
}

if (DRY_RUN) {
  console.log('\n🔸 DRY RUN - No changes made.');
  console.log('   Run with --apply to apply fixes.');
} else {
  console.log(`\n✅ Fixed ${fixes.length} images!`);
}
