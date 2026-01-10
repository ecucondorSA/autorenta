#!/usr/bin/env npx ts-node
/**
 * Script: fix-image-dimensions.ts
 * Agrega width/height a imágenes que no las tienen
 *
 * Uso: npx ts-node tools/scripts/fix-image-dimensions.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

// Mapeo de clases Tailwind a dimensiones en píxeles
const TAILWIND_SIZES: Record<string, number> = {
  'w-4': 16, 'h-4': 16,
  'w-5': 20, 'h-5': 20,
  'w-6': 24, 'h-6': 24,
  'w-8': 32, 'h-8': 32,
  'w-10': 40, 'h-10': 40,
  'w-12': 48, 'h-12': 48,
  'w-14': 56, 'h-14': 56,
  'w-16': 64, 'h-16': 64,
  'w-20': 80, 'h-20': 80,
  'w-24': 96, 'h-24': 96,
  'w-32': 128, 'h-32': 128,
  'w-40': 160, 'h-40': 160,
  'w-48': 192, 'h-48': 192,
  'w-56': 224, 'h-56': 224,
  'w-64': 256, 'h-64': 256,
  'w-full': 400, 'h-full': 300, // Default para full
};

// Aspect ratios comunes
const ASPECT_RATIOS: Record<string, { w: number; h: number }> = {
  'aspect-video': { w: 16, h: 9 },
  'aspect-square': { w: 1, h: 1 },
  'aspect-[4/3]': { w: 4, h: 3 },
  'aspect-[3/2]': { w: 3, h: 2 },
  'aspect-[16/9]': { w: 16, h: 9 },
};

interface ImageFix {
  file: string;
  line: number;
  original: string;
  fixed: string;
  width: number;
  height: number;
}

function extractDimensionsFromClasses(imgTag: string, surroundingHtml: string): { width: number; height: number } | null {
  // Buscar clases en el tag
  const classMatch = imgTag.match(/class="([^"]+)"/);
  const classes = classMatch ? classMatch[1] : '';

  // Buscar dimensiones fijas en clases
  let width = 0;
  let height = 0;

  for (const [cls, size] of Object.entries(TAILWIND_SIZES)) {
    if (classes.includes(cls)) {
      if (cls.startsWith('w-')) width = size;
      if (cls.startsWith('h-')) height = size;
    }
  }

  // Si tiene aspect ratio, calcular dimensiones
  for (const [aspectClass, ratio] of Object.entries(ASPECT_RATIOS)) {
    if (classes.includes(aspectClass) || surroundingHtml.includes(aspectClass)) {
      if (width && !height) {
        height = Math.round(width * ratio.h / ratio.w);
      } else if (height && !width) {
        width = Math.round(height * ratio.w / ratio.h);
      } else if (!width && !height) {
        // Default para aspect-video
        width = 400;
        height = Math.round(400 * ratio.h / ratio.w);
      }
    }
  }

  // Si es object-cover/contain con full, usar defaults
  if ((classes.includes('object-cover') || classes.includes('object-contain')) &&
      (classes.includes('w-full') || classes.includes('h-full'))) {
    if (!width) width = 400;
    if (!height) height = 300;
  }

  // Inferir de contenedor padre
  const parentSizeMatch = surroundingHtml.match(/class="[^"]*(?:w-(\d+)|h-(\d+))[^"]*"/);
  if (parentSizeMatch) {
    if (parentSizeMatch[1] && !width) width = TAILWIND_SIZES[`w-${parentSizeMatch[1]}`] || 0;
    if (parentSizeMatch[2] && !height) height = TAILWIND_SIZES[`h-${parentSizeMatch[2]}`] || 0;
  }

  // Defaults basados en contexto
  if (imgTag.includes('avatar') || imgTag.includes('profile') || imgTag.includes('user')) {
    if (!width) width = 48;
    if (!height) height = 48;
  }

  if (imgTag.includes('car') || imgTag.includes('vehicle') || imgTag.includes('photo')) {
    if (!width) width = 400;
    if (!height) height = 300;
  }

  if (imgTag.includes('thumb') || imgTag.includes('preview')) {
    if (!width) width = 200;
    if (!height) height = 150;
  }

  if (width && height) {
    return { width, height };
  }

  return null;
}

function findImagesWithoutDimensions(directory: string): ImageFix[] {
  const fixes: ImageFix[] = [];

  function processFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Regex para encontrar tags <img> completos (multilinea)
    const imgRegex = /<img\b[^>]*>/gs;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      const imgTag = match[0];

      // Saltar si ya tiene width/height o usa ngSrc/NgOptimizedImage
      if (/\bwidth\s*=|\[width\]|height\s*=|\[height\]|ngSrc|NgOptimizedImage/i.test(imgTag)) {
        continue;
      }

      // Saltar iconos
      if (/icon/i.test(imgTag)) {
        continue;
      }

      // Obtener contexto (100 chars antes y después)
      const startIdx = Math.max(0, match.index - 200);
      const endIdx = Math.min(content.length, match.index + imgTag.length + 200);
      const surroundingHtml = content.substring(startIdx, endIdx);

      // Calcular línea
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Inferir dimensiones
      const dims = extractDimensionsFromClasses(imgTag, surroundingHtml);

      if (dims) {
        // Insertar width/height antes del cierre del tag o después de la última clase
        let fixedTag = imgTag;

        if (imgTag.includes('/>')) {
          fixedTag = imgTag.replace('/>', `\n            width="${dims.width}"\n            height="${dims.height}"\n          />`);
        } else if (imgTag.includes('>')) {
          fixedTag = imgTag.replace('>', `\n            width="${dims.width}"\n            height="${dims.height}"\n          >`);
        }

        fixes.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: lineNumber,
          original: imgTag.substring(0, 80) + (imgTag.length > 80 ? '...' : ''),
          fixed: `Added width="${dims.width}" height="${dims.height}"`,
          width: dims.width,
          height: dims.height,
        });
      }
    }
  }

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && !file.includes('node_modules')) {
        walkDir(filePath);
      } else if (file.endsWith('.html')) {
        processFile(filePath);
      }
    }
  }

  walkDir(directory);
  return fixes;
}

function applyFixes(fixes: ImageFix[]) {
  const fileChanges = new Map<string, string>();

  for (const fix of fixes) {
    const filePath = path.join(process.cwd(), fix.file);

    if (!fileChanges.has(filePath)) {
      fileChanges.set(filePath, fs.readFileSync(filePath, 'utf-8'));
    }

    let content = fileChanges.get(filePath)!;

    // Encontrar el tag original y reemplazarlo
    const imgRegex = /<img\b[^>]*>/gs;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      const imgTag = match[0];

      // Verificar que es el tag correcto (mismo contenido aproximado)
      if (!imgTag.includes(`width=`) && !imgTag.includes(`height=`) &&
          fix.original.includes(imgTag.substring(0, 40))) {

        let fixedTag = imgTag;
        const dims = `width="${fix.width}" height="${fix.height}"`;

        // Insertar antes del cierre
        if (imgTag.trimEnd().endsWith('/>')) {
          fixedTag = imgTag.replace(/\s*\/>$/, `\n            ${dims}\n          />`);
        } else if (imgTag.trimEnd().endsWith('>')) {
          fixedTag = imgTag.replace(/\s*>$/, `\n            ${dims}\n          >`);
        }

        content = content.substring(0, match.index) + fixedTag + content.substring(match.index + imgTag.length);
        fileChanges.set(filePath, content);
        break;
      }
    }
  }

  // Escribir cambios
  for (const [filePath, content] of fileChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath.replace(process.cwd() + '/', '')}`);
  }
}

// Main
const srcDir = path.join(process.cwd(), 'apps/web/src');
console.log(`🔍 Scanning ${srcDir} for images without dimensions...\n`);

const fixes = findImagesWithoutDimensions(srcDir);

console.log(`Found ${fixes.length} images to fix:\n`);

for (const fix of fixes) {
  console.log(`📍 ${fix.file}:${fix.line}`);
  console.log(`   ${fix.fixed}`);
  console.log('');
}

if (DRY_RUN) {
  console.log('\n🔸 DRY RUN - No changes made. Remove --dry-run to apply fixes.');
} else if (fixes.length > 0) {
  console.log('\n⚡ Applying fixes...\n');
  applyFixes(fixes);
  console.log(`\n✅ Fixed ${fixes.length} images!`);
}
