const fs = require('fs');
const path = require('path');

// Configuración
const ROOT_DIR = 'apps/web/src';
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist'];

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  bold: '\x1b[1m'
};

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.html')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Regex para encontrar botones/links con flex y gap
  // Captura: <tag ... class="..." ...>contenido</tag>
  // Nota: El parsing de HTML con regex es frágil, esto es una heurística para auditoría
  const buttonRegex = /<(a|button)[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;

  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const [fullMatch, tag, classes, innerContent] = match;
    const lineNumber = content.substring(0, match.index).split('\n').length;

    // Criterio 1: Tiene flex y gap?
    if (
      (classes.includes('flex') || classes.includes('inline-flex')) &&
      classes.includes('gap-')
    ) {
      // Criterio 2: Tiene un icono?
      if (innerContent.includes('<app-icon') || innerContent.includes('<svg')) {
        // Criterio 3: Tiene texto visible?
        // Eliminamos tags HTML para ver si queda texto
        const textContent = innerContent.replace(/<[^>]*>/g, '').trim();
        
        if (textContent.length > 0) {
          // Criterio 4: Análisis de espaciado sospechoso
          // Si el texto no tiene un span con padding compensatorio (pr-*, pl-*) 
          // o si el botón no tiene clases de padding asimétrico evidente.
          
          const hasPaddingAdjustment = innerContent.includes('pr-') || innerContent.includes('pl-') || innerContent.includes('padding-');
          const isJustIcon = textContent.length === 0;

          if (!isJustIcon && !hasPaddingAdjustment) {
             // Limpiamos el contenido para mostrarlo en el log
             const cleanContent = innerContent.replace(/\s+/g, ' ').trim().substring(0, 50);
             
             issues.push({
               line: lineNumber,
               tag,
               classes: classes.split(' ').filter(c => c.includes('gap') || c.includes('flex')).join(' '),
               preview: cleanContent + (cleanContent.length === 50 ? '...' : '')
             });
          }
        }
      }
    }
  }

  return issues;
}

function main() {
  console.log(`${colors.bold}${colors.cyan}🔍 Iniciando escaneo de botones con espaciado desbalanceado...${colors.reset}\n`);
  
  const files = getAllFiles(ROOT_DIR);
  let totalIssues = 0;
  let filesWithIssues = 0;

  files.forEach(file => {
    const issues = analyzeFile(file);
    if (issues.length > 0) {
      console.log(`${colors.yellow}📄 ${file}${colors.reset}`);
      issues.forEach(issue => {
        console.log(`  ${colors.red}Line ${issue.line}:${colors.reset} [${issue.tag}] .${issue.classes}`);
        console.log(`    ${colors.bold}Contenido:${colors.reset} ${issue.preview}`);
      });
      console.log('');
      totalIssues += issues.length;
      filesWithIssues++;
    }
  });

  console.log(`${colors.bold}════════════════════════════════════════${colors.reset}`);
  if (totalIssues > 0) {
    console.log(`${colors.red}❌ Se encontraron ${totalIssues} posibles problemas en ${filesWithIssues} archivos.${colors.reset}`);
    console.log(`${colors.cyan}Tip: Busca botones donde el 'gap-' empuja el texto y falta padding compensatorio (pr-1, etc).${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ No se encontraron problemas obvios de espaciado en botones.${colors.reset}`);
  }
}

main();
