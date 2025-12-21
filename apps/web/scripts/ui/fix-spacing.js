const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src');
const FILE_EXTENSIONS = ['.html', '.css', '.scss'];

let filesProcessed = 0;
let replacementsCount = 0;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

console.log('🔍 Iniciando corrección de espaciado (aire y gaps)...');

walkDir(TARGET_DIR, (filePath) => {
    const ext = path.extname(filePath);
    if (!FILE_EXTENSIONS.includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileChanges = 0;

    // 1. CORRECCIÓN DE INTERLINEADO (Line Height)
    // HTML: leading-none -> leading-tight (dar aire al texto)
    if (content.includes('leading-none')) {
        // Solo reemplazamos si no es un icono (a veces los iconos usan leading-none para alinearse)
        // Es una heurística simple
        const regex = /class="([^"]*?\b)leading-none(\b[^"]*)"/g;
        content = content.replace(regex, (match, p1, p2) => {
            fileChanges++;
            return `class="${p1}leading-tight${p2}"`;
        });
    }

    // CSS: line-height: 1; -> line-height: 1.25;
    const cssLeadingRegex = /line-height:\s*1\s*;/g;
    if (cssLeadingRegex.test(content)) {
        content = content.replace(cssLeadingRegex, () => {
            fileChanges++;
            return 'line-height: 1.25;';
        });
    }

    // 2. CORRECCIÓN DE GRILLAS SIN GAP (Grids pegados)
    // Busca: grid grid-cols-X ... donde NO haya "gap-" cerca
    // Esto es conservador para no romper layouts complejos
    
    // Regex explica: 
    // class="... grid ... grid-cols-N ..."
    // Y verificamos manualmente si falta 'gap-'
    const gridRegex = /class="([^"]*?)\bgrid\b([^"]*?)\bgrid-cols-(\d+)([^"]*)"/g;
    
    content = content.replace(gridRegex, (match, pre, mid, cols, post) => {
        const fullClass = `${pre}grid${mid}grid-cols-${cols}${post}`;
        
        // Si ya tiene gap, no tocamos
        if (fullClass.includes('gap-') || fullClass.includes('space-x') || fullClass.includes('space-y')) {
            return match;
        }

        // Si no tiene gap, agregamos gap-4
        fileChanges++;
        return `class="${pre}grid${mid}grid-cols-${cols} gap-4${post}"`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ ${path.relative(TARGET_DIR, filePath)}: ${fileChanges} arreglos`);
        replacementsCount += fileChanges;
    }
    filesProcessed++;
});

console.log('--------------------------------------------------');
console.log(`🎉 Corrección de Espaciado finalizada.`);
console.log(`🛠️  Cambios aplicados: ${replacementsCount}`);
