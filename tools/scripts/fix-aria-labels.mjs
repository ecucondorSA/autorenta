import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const files = await glob('apps/web/src/**/*.html');

let totalFixed = 0;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Pattern: Find inputs without aria-label
  const inputRegex = /<input\s+([^>]*?)>/gi;

  content = content.replace(inputRegex, (match) => {
    // Skip if already has aria-label or aria-labelledby
    if (/aria-label/i.test(match)) return match;

    // Skip if it's a hidden, file, checkbox, or radio input
    if (/type=["'](hidden|file|checkbox|radio)["']/i.test(match)) return match;

    // Must have a type that needs labeling
    if (!/type=["'](text|number|email|search|tel|password)["']/i.test(match)) return match;

    // Extract placeholder for label
    const placeholderMatch = match.match(/placeholder=["']([^"']+)["']/i);
    const idMatch = match.match(/id=["']([^"']+)["']/i);
    const formControlMatch = match.match(/formControlName=["']([^"']+)["']/i);

    let label = '';
    if (placeholderMatch) {
      label = placeholderMatch[1];
    } else if (formControlMatch) {
      label = formControlMatch[1]
        .replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase());
    } else if (idMatch) {
      label = idMatch[1]
        .replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, c => c.toUpperCase());
    } else {
      label = 'Campo de entrada';
    }

    // Insert aria-label before the closing >
    const insertPos = match.lastIndexOf('>');
    const newMatch = match.substring(0, insertPos) + ` aria-label="${label}"` + match.substring(insertPos);
    totalFixed++;
    return newMatch;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
});

console.log('\n✅ Total inputs fixed:', totalFixed);
