#!/usr/bin/env npx ts-node
/**
 * Script: fix-input-labels.ts
 * Agrega aria-label a inputs que no tienen label asociado
 *
 * Uso: npx ts-node tools/scripts/fix-input-labels.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

interface InputFix {
  file: string;
  line: number;
  inputType: string;
  placeholder: string;
  ariaLabel: string;
}

function findInputsWithoutLabels(directory: string): InputFix[] {
  const fixes: InputFix[] = [];

  function processFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Regex para encontrar inputs
    const inputRegex = /<input\b[^>]*>/gs;
    let match;

    while ((match = inputRegex.exec(content)) !== null) {
      const inputTag = match[0];

      // Saltar si ya tiene aria-label, aria-labelledby, o id con label
      if (/aria-label|aria-labelledby|\[aria-label\]/i.test(inputTag)) {
        continue;
      }

      // Verificar si tiene un <label> asociado
      const idMatch = inputTag.match(/id="([^"]+)"/);
      if (idMatch) {
        const id = idMatch[1];
        // Buscar label for="id" en el archivo
        if (content.includes(`for="${id}"`) || content.includes(`[for]="${id}"`)) {
          continue;
        }
      }

      // Extraer placeholder para usar como aria-label
      const placeholderMatch = inputTag.match(/placeholder="([^"]+)"/);
      const placeholder = placeholderMatch ? placeholderMatch[1] : '';

      // Extraer tipo
      const typeMatch = inputTag.match(/type="([^"]+)"/);
      const inputType = typeMatch ? typeMatch[1] : 'text';

      // Saltar hidden inputs
      if (inputType === 'hidden') continue;

      // Generar aria-label basado en contexto
      let ariaLabel = placeholder;

      if (!ariaLabel) {
        // Inferir del name o formControlName
        const nameMatch = inputTag.match(/(?:name|formControlName)="([^"]+)"/);
        if (nameMatch) {
          ariaLabel = nameMatch[1]
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .trim()
            .toLowerCase()
            .replace(/^\w/, c => c.toUpperCase());
        }
      }

      if (!ariaLabel) {
        ariaLabel = `Campo de ${inputType}`;
      }

      const lineNumber = content.substring(0, match.index).split('\n').length;

      fixes.push({
        file: filePath.replace(process.cwd() + '/', ''),
        line: lineNumber,
        inputType,
        placeholder,
        ariaLabel,
      });
    }

    // También buscar <select> sin label
    const selectRegex = /<select\b[^>]*>/gs;
    while ((match = selectRegex.exec(content)) !== null) {
      const selectTag = match[0];

      if (/aria-label|aria-labelledby|\[aria-label\]/i.test(selectTag)) {
        continue;
      }

      const idMatch = selectTag.match(/id="([^"]+)"/);
      if (idMatch && content.includes(`for="${idMatch[1]}"`)) {
        continue;
      }

      const nameMatch = selectTag.match(/(?:name|formControlName)="([^"]+)"/);
      let ariaLabel = 'Selector';
      if (nameMatch) {
        ariaLabel = nameMatch[1]
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim();
      }

      const lineNumber = content.substring(0, match.index).split('\n').length;

      fixes.push({
        file: filePath.replace(process.cwd() + '/', ''),
        line: lineNumber,
        inputType: 'select',
        placeholder: '',
        ariaLabel,
      });
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

function applyFixes(fixes: InputFix[]) {
  const fileChanges = new Map<string, string>();

  for (const fix of fixes) {
    const filePath = path.join(process.cwd(), fix.file);

    if (!fileChanges.has(filePath)) {
      fileChanges.set(filePath, fs.readFileSync(filePath, 'utf-8'));
    }

    let content = fileChanges.get(filePath)!;
    const lines = content.split('\n');

    // Encontrar la línea y agregar aria-label
    const line = lines[fix.line - 1];
    if (line && (line.includes('<input') || line.includes('<select'))) {
      // Insertar aria-label después del primer espacio o antes del cierre
      const fixed = line.replace(
        /(<(?:input|select)\s+)/,
        `$1aria-label="${fix.ariaLabel}" `
      );
      lines[fix.line - 1] = fixed;
      content = lines.join('\n');
      fileChanges.set(filePath, content);
    }
  }

  for (const [filePath, content] of fileChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath.replace(process.cwd() + '/', '')}`);
  }
}

// Main
const srcDir = path.join(process.cwd(), 'apps/web/src');
console.log(`🔍 Scanning ${srcDir} for inputs without labels...\n`);

const fixes = findInputsWithoutLabels(srcDir);

console.log(`Found ${fixes.length} inputs without proper labels:\n`);

for (const fix of fixes) {
  console.log(`📍 ${fix.file}:${fix.line}`);
  console.log(`   Type: ${fix.inputType}`);
  console.log(`   Will add: aria-label="${fix.ariaLabel}"`);
  console.log('');
}

if (DRY_RUN) {
  console.log('\n🔸 DRY RUN - No changes made. Remove --dry-run to apply fixes.');
} else if (fixes.length > 0) {
  console.log('\n⚡ Applying fixes...\n');
  applyFixes(fixes);
  console.log(`\n✅ Fixed ${fixes.length} inputs!`);
}
