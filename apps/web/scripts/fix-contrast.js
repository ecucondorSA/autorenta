const fs = require('fs');
const path = require('path');

// Configuración
const TARGET_DIR = path.join(__dirname, '../src');
const FILE_EXTENSIONS = ['.css', '.scss', '.less', '.html', '.ts'];

// Mapeo de reemplazos: De RGBA (Bajo Contraste) -> HEX (Alto Contraste)
const REPLACEMENTS = [
    // --- CSS: TEXTO OSCURO (MODO CLARO) ---
    {
        regex: /rgba\(\s*15,\s*23,\s*42,\s*0?\.5[0-9]*\s*\)/g,
        hex: '#475569',
        name: 'CSS: Slate 600 (was ~55%)'
    },
    {
        regex: /rgba\(\s*15,\s*23,\s*42,\s*0?\.[67][0-9]*\s*\)/g,
        hex: '#334155',
        name: 'CSS: Slate 700 (was ~65%)'
    },
    {
        regex: /rgba\(\s*15,\s*23,\s*42,\s*0?\.8[0-9]*\s*\)/g,
        hex: '#1e293b',
        name: 'CSS: Slate 800 (was ~80%)'
    },

    // --- CSS: TEXTO CLARO (MODO OSCURO) ---
    {
        regex: /rgba\(\s*226,\s*232,\s*240,\s*0?\.6[0-9]*\s*\)/g,
        hex: '#cbd5e1',
        name: 'CSS: Slate 300 (was ~65%)'
    },
    {
        regex: /rgba\(\s*226,\s*232,\s*240,\s*0?\.7[0-9]*\s*\)/g,
        hex: '#e2e8f0',
        name: 'CSS: Slate 200 (was ~75%)'
    },
    {
        regex: /rgba\(\s*226,\s*232,\s*240,\s*0\.[89][0-9]*\s*\)/g,
        hex: '#f1f5f9',
        name: 'CSS: Slate 100 (was ~85%)'
    },

    // --- TAILWIND CLASSES (HTML/TS) ---
    // Reemplaza clases de texto que suelen tener bajo contraste por versiones más legibles
    
    // Grises muy claros usados como texto (Mal contraste sobre blanco)
    {
        regex: /text-gray-300(?!\s*dark:)/g, 
        hex: 'text-gray-500', 
        name: 'TW: text-gray-300 -> 500 (Light Mode)'
    },
    {
        regex: /text-gray-400(?!\s*dark:)/g, 
        hex: 'text-gray-500', 
        name: 'TW: text-gray-400 -> 500 (Light Mode)'
    },
    {
        regex: /text-slate-300(?!\s*dark:)/g, 
        hex: 'text-slate-500', 
        name: 'TW: text-slate-300 -> 500 (Light Mode)'
    },
    {
        regex: /text-slate-400(?!\s*dark:)/g, 
        hex: 'text-slate-500', 
        name: 'TW: text-slate-400 -> 500 (Light Mode)'
    },

    // Colores semánticos claros usados como texto (Ej: text-success-light)
    // Se reemplazan por versiones "-strong" o "-600/700"
    {
        regex: /text-success-light(?!\s*dark:)/g,
        hex: 'text-success-strong',
        name: 'TW: text-success-light -> strong'
    },
    {
        regex: /text-warning-light(?!\s*dark:)/g,
        hex: 'text-warning-strong',
        name: 'TW: text-warning-light -> strong'
    },
    {
        regex: /text-error-light(?!\s*dark:)/g,
        hex: 'text-error-strong',
        name: 'TW: text-error-light -> strong'
    }
];

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

console.log('🔍 Iniciando auditoría extendida de contraste (CSS + Tailwind)...');
console.log('📂 Directorio:', TARGET_DIR);

walkDir(TARGET_DIR, (filePath) => {
    const ext = path.extname(filePath);
    if (!FILE_EXTENSIONS.includes(ext)) return;

    // Leer archivo
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileReplacements = 0;

    // Aplicar reemplazos
    REPLACEMENTS.forEach(rule => {
        if (rule.regex.test(content)) {
            const matches = content.match(rule.regex);
            fileReplacements += matches ? matches.length : 0;
            content = content.replace(rule.regex, rule.hex);
        }
    });

    // Guardar si hubo cambios
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Corregido: ${path.relative(TARGET_DIR, filePath)} (${fileReplacements} cambios)`);
        replacementsCount += fileReplacements;
    }
    filesProcessed++;
});

console.log('--------------------------------------------------');
console.log(`🎉 Finalizado.`);
console.log(`📄 Archivos escaneados: ${filesProcessed}`);
console.log(`🛠️  Problemas de contraste corregidos: ${replacementsCount}`);