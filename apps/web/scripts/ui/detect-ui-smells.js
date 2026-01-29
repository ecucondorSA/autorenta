const fs = require('fs');
const path = require('path');

// Configuración
const TARGET_DIR = path.join(__dirname, '../src');
const REPORT_FILE = path.join(__dirname, '../ui-smells-report.md');
const FILE_EXTENSIONS = ['.html', '.ts', '.scss', '.css'];

// Reglas de Detección de "Olores Visuales"
const RULES = [
    // --- 1. RUPTURA DE PALABRAS Y TEXTO FEO ---
    {
        id: 'BAD_BREAK',
        regex: /\b(break-all|hyphens-auto|word-break: break-all)\b/g,
        level: 'WARNING',
        msg: '⚠️ Ruptura forzada de palabras ("pala-bras"). Puede cortar textos feo.'
    },
    {
        id: 'TINY_WIDTH',
        regex: /\b(w-\[10px\]|w-\[20px\]|w-4|width:\s*[1-2]0px)\b/g,
        level: 'WARNING',
        msg: '⚠️ Contenedor muy estrecho. Riesgo de que el texto se desborde o corte.'
    },
    {
        id: 'TINY_TEXT',
        regex: /\b(text-\[.*px\]|text-xxs|font-size:\s*[0-9]px)\b/g,
        level: 'INFO',
        msg: 'ℹ️ Texto posiblemente ilegible (tamaño hardcodeado o muy pequeño).'
    },

    // --- 2. FALTA DE ESPACIO / RESPIRO ---
    {
        id: 'NO_BREATHING',
        regex: /\b(leading-none|leading-3|line-height:\s*1|line-height:\s*0\.)\b/g,
        level: 'WARNING',
        msg: '⚠️ Interlineado muy apretado. Falta "aire" entre líneas.'
    },
    {
        id: 'CROWDED_GRID',
        regex: /\b(grid-cols-\d+)\b(?!.*\b(gap-\d+)\b)/g,
        level: 'WARNING',
        msg: '⚠️ Grid sin "gap" detectado cerca. Elementos podrían estar pegados.'
    },
    {
        id: 'TIGHT_TRACKING',
        regex: /\b(tracking-tighter)\b/g,
        level: 'INFO',
        msg: 'ℹ️ Letras muy pegadas (tracking-tighter). Dificulta la lectura.'
    },

    // --- 3. RENDERING / BUENAS PRÁCTICAS ---
    {
        id: 'Z_INDEX_HACK',
        regex: /\b(z-\[999+\]|z-index:\s*999+)\b/g,
        level: 'ERROR',
        msg: '🚨 Z-Index Hack (9999). Esto indica problemas de apilamiento mal resueltos.'
    },
    {
        id: 'IMPORTANT_FLAG',
        regex: /!important/g,
        level: 'WARNING',
        msg: '⚠️ Uso de !important. Dificulta el mantenimiento y la cascada CSS.'
    },
    {
        id: 'EMPTY_BUTTON',
        regex: /<button[^>]*>\s*<\/button>/g,
        level: 'ERROR',
        msg: '🚨 Botón vacío (sin texto ni icono). Mal renderizado y inaccesible.'
    },
    {
        id: 'FIXED_HEIGHT_TEXT',
        regex: /\b(h-\[.*px\]|height:\s*[0-9]+px)\b/g,
        level: 'INFO',
        msg: 'ℹ️ Altura fija detectada. Si el texto crece, se cortará o romperá el layout.'
    }
];

let issuesFound = [];

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

console.log('🔍 Iniciando escaneo de Defectos de UI/UX...');
console.log('📂 Directorio:', TARGET_DIR);

walkDir(TARGET_DIR, (filePath) => {
    const ext = path.extname(filePath);
    if (!FILE_EXTENSIONS.includes(ext)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        RULES.forEach(rule => {
            if (rule.regex.test(line)) {
                // Ignore comments generally
                if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;

                issuesFound.push({
                    file: path.relative(TARGET_DIR, filePath),
                    line: index + 1,
                    code: line.trim().substring(0, 100) + (line.length > 100 ? '...' : ''),
                    level: rule.level,
                    msg: rule.msg
                });
            }
        });
    });
});

// Generar Reporte
let reportContent = '# 🕵️ Reporte de Defectos Visuales (UI Smells)\n\n';
reportContent += `Fecha: ${new Date().toLocaleString()}\n`;
reportContent += `Total problemas encontrados: ${issuesFound.length}\n\n`;

// Agrupar por archivo
const grouped = issuesFound.reduce((acc, issue) => {
    acc[issue.file] = acc[issue.file] || [];
    acc[issue.file].push(issue);
    return acc;
}, {});

for (const [file, issues] of Object.entries(grouped)) {
    reportContent += `### 📄 ${file}\n`;
    issues.forEach(i => {
        const icon = i.level === 'ERROR' ? '🔴' : (i.level === 'WARNING' ? '🟠' : '🔵');
        reportContent += `- ${icon} **Línea ${i.line}:** ${i.msg}\n`;
        reportContent += `  \`${i.code}\`\n`;
    });
    reportContent += '\n';
}

fs.writeFileSync(REPORT_FILE, reportContent);

console.log('--------------------------------------------------');
console.log(`🎉 Escaneo finalizado.`);
console.log(`🔴 Errores Críticos: ${issuesFound.filter(i => i.level === 'ERROR').length}`);
console.log(`🟠 Advertencias: ${issuesFound.filter(i => i.level === 'WARNING').length}`);
console.log(`📝 Reporte detallado guardado en: ${REPORT_FILE}`);
