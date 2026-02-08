import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ajusta paths relativos desde la raíz del repo
const repoRoot = path.resolve(__dirname, '../..');
const supabaseTypesPath = path.join(repoRoot, 'apps/web/src/app/core/types/database.types.ts');
const appPath = path.join(repoRoot, 'apps/web/src/app');

if (!fs.existsSync(supabaseTypesPath)) {
  console.error('No se encontró database.types.ts en', supabaseTypesPath);
  process.exit(1);
}

const text = fs.readFileSync(supabaseTypesPath, 'utf8');
const tables: string[] = [];
const regex = /\n\s*([a-zA-Z0-9_]+): \{\n\s*Row:/g;
let match: RegExpExecArray | null;
while ((match = regex.exec(text))) {
  tables.push(match[1]);
}

const missing: string[] = [];
const hits: Record<string, number> = {};

for (const t of tables) {
  try {
    const cmd = `rg -n ${t} ${appPath}`;
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    const count = out.trim() ? out.split('\n').length : 0;
    hits[t] = count;
    if (count === 0) missing.push(t);
  } catch {
    // rg exit 1 means no matches
    hits[t] = 0;
    missing.push(t);
  }
}

console.log(JSON.stringify({ totalTables: tables.length, missingCount: missing.length, missing }, null, 2));
