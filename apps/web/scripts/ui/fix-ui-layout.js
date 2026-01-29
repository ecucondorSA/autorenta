const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src');
const FILE_EXTENSIONS = ['.html', '.ts', '.scss', '.css'];

let filesProcessed = 0;
let replacementsCount = 0;

// Reglas de reemplazo para z-index
const Z_INDEX_REPLACEMENTS = [
    {
        // Busca z-index: 9999; o z-index: 999; en CSS/SCSS/TS
        regex: /(z-index:\s*)(999[0-9]*)/g,
        replace: '$150', // Reemplaza por 50 (un valor alto pero no extremo de Tailwind)
        msg: 'Z-Index: 9999 -> 50'
    },
    {
        // Busca z-[9999] o z-9999 en clases de Tailwind (HTML/TS)
        regex: /(z-\[999[0-9]*\]|z-999[0-9]*)/g,
        replace: 'z-50',
        msg: 'Tailwind Z-Index: z-[9999] -> z-50'
    }
];

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

console.log('🔍 Iniciando script de corrección de Z-Index y áreas de toque...');
console.log('📂 Directorio:', TARGET_DIR);

walkDir(TARGET_DIR, (filePath) => {
    const ext = path.extname(filePath);
    if (!FILE_EXTENSIONS.includes(ext)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileReplacements = 0;

    // --- Parte 1: Normalización de Z-Index ---
    Z_INDEX_REPLACEMENTS.forEach(rule => {
        if (rule.regex.test(content)) {
            const matches = content.match(rule.regex);
            fileReplacements += matches ? matches.length : 0;
            content = content.replace(rule.regex, rule.replace);
            if (matches && matches.length > 0) {
                console.log(`  ${filePath} - Corregido ${matches.length}x: ${rule.msg}`);
            }
        }
    });

    // --- Parte 2: Ajuste de áreas de toque pequeñas ---
    // Esto es más complejo y lo haremos en una segunda iteración si no podemos automatizarlo de forma segura
    // por ahora, nos enfocamos en Z-Index que es más directo.

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        replacementsCount += fileReplacements;
    }
    filesProcessed++;
});

console.log('--------------------------------------------------');
console.log(`🎉 Corrección de Z-Index finalizada.`);
console.log(`📄 Archivos escaneados: ${filesProcessed}`);
console.log(`🛠️  Z-Index normalizados: ${replacementsCount}`);
console.log(`NOTA: La corrección de áreas de toque requiere una revisión más profunda y se abordará en una siguiente fase.`);