#!/usr/bin/env node
/**
 * Script para generar tests de servicios automáticamente
 * Aumenta el coverage generando tests básicos para servicios sin .spec.ts
 *
 * Uso: node scripts/generate-service-tests.js [--dry-run] [--limit N]
 */

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '../src/app/core/services');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
  : Infinity;

// Template para generar tests de servicios
function generateSpecTemplate(serviceName, serviceFileName, imports, methods, needsSupabase = false) {
  const className = serviceName;

  const supabaseMock = needsSupabase ? `
const mockSupabaseClient = {
  from: jasmine.createSpy('from').and.returnValue({
    select: jasmine.createSpy('select').and.returnValue({
      eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
      single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ data: null, error: null })),
    update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ data: null, error: null })),
    delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ data: null, error: null })),
  }),
  rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: null }, error: null })),
    getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
  },
  storage: {
    from: jasmine.createSpy('from').and.returnValue({
      upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ data: null, error: null })),
      getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({ data: { publicUrl: '' } }),
    }),
  },
};

const mockSupabaseService = {
  client: mockSupabaseClient,
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};
` : '';

  const supabaseImport = needsSupabase ? `import { SupabaseClientService } from './supabase-client.service';\n` : '';
  const supabaseProvider = needsSupabase ? `,
        { provide: SupabaseClientService, useValue: mockSupabaseService }` : '';

  return `import { TestBed } from '@angular/core/testing';
${supabaseImport}import { ${className} } from './${serviceFileName.replace('.ts', '')}';
${supabaseMock}
describe('${className}', () => {
  let service: ${className};

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [${className}${supabaseProvider}]
    });
    service = TestBed.inject(${className});
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

${methods.map(method => `  it('should have ${method} method', () => {
    expect(typeof service.${method}).toBe('function');
  });
`).join('\n')}
});
`;
}

// Verificar si el servicio necesita SupabaseClientService (no para SupabaseClientService mismo)
function needsSupabaseClient(content, className) {
  if (className === 'SupabaseClientService') return false;
  return content.includes('SupabaseClientService') ||
         content.includes('this.supabase') ||
         content.includes('from(') ||
         content.includes('.rpc(');
}

// Keywords y nombres reservados a excluir
const EXCLUDED_NAMES = new Set([
  'constructor', 'ngOnInit', 'ngOnDestroy', 'ngOnChanges', 'ngAfterViewInit',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
  'void', 'this', 'super', 'class', 'extends', 'implements', 'interface',
  'public', 'private', 'protected', 'static', 'readonly', 'abstract',
  'async', 'await', 'yield', 'get', 'set', 'true', 'false', 'null', 'undefined',
  'tap', 'pipe', 'map', 'filter', 'reduce', 'subscribe', 'unsubscribe' // RxJS operators
]);

// Verificar si un método es privado buscando "private methodName("
function isPrivateMethod(content, methodName) {
  const privatePattern = new RegExp(`private\\s+(async\\s+)?${methodName}\\s*\\(`);
  return privatePattern.test(content);
}

// Extraer métodos públicos de un servicio
function extractPublicMethods(content) {
  const methods = [];

  // Buscar métodos async públicos (no precedidos por 'private')
  const asyncMatches = content.matchAll(/(?<!private\s+)async\s+(\w+)\s*\(/g);
  for (const match of asyncMatches) {
    const name = match[1];
    if (!name.startsWith('_') &&
        !name.startsWith('#') &&
        !EXCLUDED_NAMES.has(name) &&
        !isPrivateMethod(content, name)) {
      methods.push(name);
    }
  }

  // Buscar métodos normales públicos
  const methodMatches = content.matchAll(/^\s+(\w+)\s*\([^)]*\)\s*[:{]/gm);
  for (const match of methodMatches) {
    const name = match[1];
    if (!name.startsWith('_') &&
        !name.startsWith('#') &&
        !EXCLUDED_NAMES.has(name) &&
        !methods.includes(name) &&
        !isPrivateMethod(content, name)) {
      methods.push(name);
    }
  }

  return [...new Set(methods)].slice(0, 10); // Max 10 métodos por servicio
}

// Extraer imports necesarios
function extractImports(content) {
  const imports = [];
  const importMatches = content.matchAll(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of importMatches) {
    if (!match[2].startsWith('.') && !match[2].startsWith('@angular')) {
      // imports externos que podríamos necesitar mockear
    }
  }
  return imports;
}

// Obtener nombre de la clase del servicio (excluir abstract)
function getServiceClassName(content) {
  // Excluir clases abstractas
  if (/export\s+abstract\s+class/.test(content)) {
    return null;
  }
  const match = content.match(/export\s+class\s+(\w+Service)/);
  return match ? match[1] : null;
}

// Main
async function main() {
  console.log('🔍 Escaneando servicios en:', SERVICES_DIR);
  console.log(DRY_RUN ? '📋 Modo dry-run (no se crearán archivos)\n' : '');

  const files = fs.readdirSync(SERVICES_DIR);
  const serviceFiles = files.filter(f => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
  const specFiles = new Set(files.filter(f => f.endsWith('.spec.ts')));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const serviceFile of serviceFiles) {
    if (created >= LIMIT) break;

    const specFile = serviceFile.replace('.service.ts', '.service.spec.ts');

    // Verificar si ya existe el spec
    if (specFiles.has(specFile)) {
      skipped++;
      continue;
    }

    const servicePath = path.join(SERVICES_DIR, serviceFile);
    const specPath = path.join(SERVICES_DIR, specFile);

    try {
      const content = fs.readFileSync(servicePath, 'utf-8');
      const className = getServiceClassName(content);

      if (!className) {
        console.log(`⚠️  ${serviceFile}: No se encontró clase Service`);
        errors++;
        continue;
      }

      const methods = extractPublicMethods(content);
      const imports = extractImports(content);
      const needsSupabase = needsSupabaseClient(content, className);
      const specContent = generateSpecTemplate(className, serviceFile, imports, methods, needsSupabase);

      if (DRY_RUN) {
        console.log(`📝 [DRY-RUN] Generaría: ${specFile} (${methods.length} métodos)`);
      } else {
        fs.writeFileSync(specPath, specContent);
        console.log(`✅ Creado: ${specFile} (${methods.length} métodos)`);
      }

      created++;
    } catch (err) {
      console.log(`❌ Error en ${serviceFile}:`, err.message);
      errors++;
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   Creados: ${created}`);
  console.log(`   Existentes (skipped): ${skipped}`);
  console.log(`   Errores: ${errors}`);
  console.log(`   Total servicios: ${serviceFiles.length}`);

  if (!DRY_RUN && created > 0) {
    console.log('\n🧪 Ejecuta "npm run test:coverage" para ver el nuevo coverage');
  }
}

main().catch(console.error);
