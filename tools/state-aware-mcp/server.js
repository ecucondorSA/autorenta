#!/usr/bin/env node
/**
 * State-Aware MCP Server
 *
 * Proporciona herramientas forenses para E2E testing:
 *
 * CAPA DE DATOS (Supabase):
 *   - verify_db_record: Verificar existencia de registros
 *   - reset_test_state: Limpiar y sembrar datos de test
 *   - get_user_state: Obtener estado completo de un usuario
 *   - query_db: Ejecutar consultas SQL de solo lectura
 *
 * CAPA DE EJECUCIÓN (Playwright):
 *   - get_browser_console_logs: Obtener logs de consola del navegador
 *   - analyze_trace_network: Analizar tráfico de red de un trace
 *   - get_test_artifacts: Listar screenshots y videos de tests fallidos
 *   - parse_playwright_report: Analizar reporte HTML de Playwright
 *
 * CAPA DE CÓDIGO:
 *   - read_component_source: Buscar código fuente de un componente
 *   - find_selector_definition: Encontrar dónde se define un selector
 *   - patch_test_file: Aplicar correcciones quirúrgicas a tests
 *   - analyze_test_structure: Analizar estructura de un archivo de test
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const PROJECT_ROOT = process.env.PROJECT_ROOT || '/home/edu/autorenta';
const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NG_APP_SUPABASE_ANON_KEY || '';

// Inicializar Supabase si hay credenciales
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Fixtures predefinidas para reset_test_state
const TEST_FIXTURES = {
  'empty_cart': {
    description: 'Carrito vacío para usuario de test',
    cleanup: ['bookings', 'wallet_transactions'],
    seed: []
  },
  'cart_with_3_items': {
    description: 'Carrito con 3 autos disponibles',
    cleanup: ['bookings'],
    seed: [
      { table: 'cars', data: { status: 'approved', is_available: true } }
    ]
  },
  'user_with_wallet': {
    description: 'Usuario con balance en wallet',
    cleanup: ['wallet_transactions'],
    seed: [
      { table: 'wallets', upsert: true, data: { balance_cents: 100000, available_balance_cents: 100000 } }
    ]
  },
  'booking_pending_payment': {
    description: 'Booking pendiente de pago',
    cleanup: ['booking_inspections'],
    seed: [
      { table: 'bookings', data: { status: 'pending_payment' } }
    ]
  },
  'booking_confirmed': {
    description: 'Booking confirmado listo para check-in',
    seed: [
      { table: 'bookings', data: { status: 'confirmed' } }
    ]
  },
  'search_results': {
    description: 'Autos para búsqueda y filtros',
    cleanup: ['cars'],
    seed: [
      {
        table: 'cars',
        data: {
          title: 'Toyota Corolla 2022',
          description: 'Excelente estado, poco uso',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2022,
          price_per_day: 50000,
          currency: 'ARS',
          city: 'Buenos Aires',
          province: 'Buenos Aires',
          country: 'AR',
          status: 'active',
          latitude: -34.6037,
          longitude: -58.3816,
          category_code: 'standard'
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Ford Ranger 4x4',
          description: 'Ideal para viajes largos',
          brand: 'Ford',
          model: 'Ranger',
          year: 2023,
          price_per_day: 80000,
          currency: 'ARS',
          city: 'Buenos Aires',
          province: 'Buenos Aires',
          country: 'AR',
          status: 'active',
          latitude: -34.6037,
          longitude: -58.3816,
          category_code: 'premium'
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Fiat Cronos',
          description: 'Económico y confiable',
          brand: 'Fiat',
          model: 'Cronos',
          year: 2021,
          price_per_day: 40000,
          currency: 'ARS',
          city: 'Córdoba',
          province: 'Córdoba',
          country: 'AR',
          status: 'active',
          latitude: -31.4201,
          longitude: -64.1888,
          category_code: 'economy'
        }
      }
    ]
  }
};

// ============================================================================
// DEFINICIÓN DE HERRAMIENTAS
// ============================================================================

const TOOLS = [
  // --- CAPA DE DATOS ---
  {
    name: 'wait_for_db_record',
    description: `Espera hasta que un registro exista en la base de datos (polling).
Útil para evitar race conditions en tests asíncronos.
Retorna: { success: boolean, record: object | null, error?: string }`,
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string' },
        column: { type: 'string' },
        value: { type: 'string' },
        select: { type: 'string', default: '*' },
        timeout_ms: { type: 'number', default: 10000 },
        interval_ms: { type: 'number', default: 500 }
      },
      required: ['table', 'column', 'value']
    }
  },
  {
    name: 'verify_db_record',
    description: `Verifica si existe un registro en la base de datos Supabase.
Útil para confirmar si el seed funcionó o si un usuario/item realmente existe.
Retorna: { exists: boolean, record: object | null, error?: string }`,
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Nombre de la tabla (ej: profiles, bookings, cars, wallets)'
        },
        column: {
          type: 'string',
          description: 'Columna a buscar (ej: email, id, status)'
        },
        value: {
          type: 'string',
          description: 'Valor a buscar'
        },
        select: {
          type: 'string',
          description: 'Columnas a retornar (default: *)',
          default: '*'
        }
      },
      required: ['table', 'column', 'value']
    }
  },
  {
    name: 'reset_test_state',
    description: `Limpia y resiembra datos de test usando fixtures predefinidas.
Fixtures disponibles: ${Object.keys(TEST_FIXTURES).join(', ')}
Ejecuta cleanup (DELETE) y luego seed (INSERT/UPSERT).`,
    inputSchema: {
      type: 'object',
      properties: {
        fixture_name: {
          type: 'string',
          description: `Nombre de la fixture: ${Object.keys(TEST_FIXTURES).join(', ')}`
        },
        user_id: {
          type: 'string',
          description: 'ID del usuario para el cual aplicar la fixture (opcional)'
        },
        custom_data: {
          type: 'object',
          description: 'Datos adicionales para merge con la fixture'
        }
      },
      required: ['fixture_name']
    }
  },
  {
    name: 'get_user_state',
    description: `Obtiene el estado completo de un usuario incluyendo:
- Perfil
- Wallet (balance, transacciones recientes)
- Bookings activos
- Autos publicados (si es owner)
Útil para diagnóstico completo.`,
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'UUID del usuario'
        },
        email: {
          type: 'string',
          description: 'Email del usuario (alternativa a user_id)'
        }
      }
    }
  },
  {
    name: 'query_db',
    description: `Ejecuta una consulta SQL de solo lectura (SELECT) en la base de datos.
IMPORTANTE: Solo permite SELECT, no permite INSERT/UPDATE/DELETE.
Útil para consultas complejas que no se pueden hacer con verify_db_record.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta SQL (solo SELECT permitido)'
        },
        params: {
          type: 'array',
          items: { type: 'string' },
          description: 'Parámetros para la consulta (opcional)'
        }
      },
      required: ['query']
    }
  },

  // --- CAPA DE EJECUCIÓN ---
  {
    name: 'get_browser_console_logs',
    description: `Lee los logs de consola del navegador desde un archivo de trace de Playwright.
Busca: errores JS, 404s, CORS, warnings.
Retorna logs categorizados por severidad.`,
    inputSchema: {
      type: 'object',
      properties: {
        trace_path: {
          type: 'string',
          description: 'Ruta al archivo .zip de trace de Playwright'
        },
        test_name: {
          type: 'string',
          description: 'Nombre del test para buscar trace automáticamente'
        },
        severity: {
          type: 'string',
          enum: ['all', 'error', 'warning', 'info'],
          description: 'Filtrar por severidad (default: all)',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'analyze_trace_network',
    description: `Analiza el tráfico de red de un trace de Playwright.
Filtra llamadas fallidas (4xx/5xx), latencias altas, CORS errors.
Útil para: "¿El botón falló porque el backend devolvió 500?"`,
    inputSchema: {
      type: 'object',
      properties: {
        trace_path: {
          type: 'string',
          description: 'Ruta al archivo .zip de trace'
        },
        test_name: {
          type: 'string',
          description: 'Nombre del test para buscar trace automáticamente'
        },
        filter: {
          type: 'string',
          enum: ['all', 'failed', 'slow', 'api_only'],
          description: 'Filtro de requests (default: failed)',
          default: 'failed'
        },
        slow_threshold_ms: {
          type: 'number',
          description: 'Umbral para considerar request "lenta" (default: 3000)',
          default: 3000
        }
      }
    }
  },
  {
    name: 'get_test_artifacts',
    description: `Lista screenshots, videos y traces de tests fallidos.
Busca en test-results/ y playwright-report/.
Retorna rutas a artifacts para análisis posterior.`,
    inputSchema: {
      type: 'object',
      properties: {
        test_name: {
          type: 'string',
          description: 'Filtrar por nombre de test (parcial OK)'
        },
        type: {
          type: 'string',
          enum: ['all', 'screenshots', 'videos', 'traces'],
          description: 'Tipo de artifact a buscar',
          default: 'all'
        },
        failed_only: {
          type: 'boolean',
          description: 'Solo mostrar artifacts de tests fallidos',
          default: true
        }
      }
    }
  },
  {
    name: 'parse_playwright_report',
    description: `Analiza el reporte HTML/JSON de Playwright.
Extrae: tests fallidos, duración, errores, stack traces.
Retorna resumen estructurado del reporte.`,
    inputSchema: {
      type: 'object',
      properties: {
        report_path: {
          type: 'string',
          description: 'Ruta al reporte (default: playwright-report/)',
          default: 'playwright-report/'
        },
        format: {
          type: 'string',
          enum: ['summary', 'failed', 'detailed'],
          description: 'Nivel de detalle del análisis',
          default: 'failed'
        }
      }
    }
  },

  // --- CAPA DE CÓDIGO ---
  {
    name: 'read_component_source',
    description: `Busca y lee el código fuente de un componente Angular.
Busca por: nombre del componente, data-testid, selector CSS.
Retorna: contenido del archivo .ts y .html si existe.`,
    inputSchema: {
      type: 'object',
      properties: {
        component_name: {
          type: 'string',
          description: 'Nombre del componente (ej: CarDetailPage, BookingWizard)'
        },
        selector: {
          type: 'string',
          description: 'Selector CSS o data-testid a buscar en el código'
        },
        search_in: {
          type: 'string',
          enum: ['components', 'pages', 'services', 'all'],
          description: 'Dónde buscar (default: all)',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'find_selector_definition',
    description: `Encuentra dónde se define un selector específico en el código.
Busca en: templates HTML, componentes TS, archivos de test.
Útil para: "El test busca #submit-btn, ¿dónde está definido?"`,
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector a buscar (ej: #submit-btn, [data-testid="pay"])'
        },
        include_tests: {
          type: 'boolean',
          description: 'Incluir archivos .spec.ts en la búsqueda',
          default: false
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'patch_test_file',
    description: `Aplica una corrección quirúrgica a un archivo de test.
Reemplaza search_string con replace_string.
Crea backup antes de modificar (.bak).`,
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Ruta al archivo de test (relativa a PROJECT_ROOT)'
        },
        search_string: {
          type: 'string',
          description: 'Texto a buscar (debe ser único en el archivo)'
        },
        replace_string: {
          type: 'string',
          description: 'Texto de reemplazo'
        },
        create_backup: {
          type: 'boolean',
          description: 'Crear archivo .bak antes de modificar',
          default: true
        }
      },
      required: ['file_path', 'search_string', 'replace_string']
    }
  },
  {
    name: 'analyze_test_structure',
    description: `Analiza la estructura de un archivo de test.
Extrae: describes, tests, hooks (beforeEach/afterEach), locators usados.
Útil para entender qué hace un test antes de modificarlo.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Ruta al archivo de test'
        },
        extract: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['describes', 'tests', 'hooks', 'locators', 'imports', 'all']
          },
          description: 'Qué extraer del archivo',
          default: ['all']
        }
      },
      required: ['file_path']
    }
  }
];

// ============================================================================
// IMPLEMENTACIÓN DE HERRAMIENTAS
// ============================================================================



async function waitForDbRecord(args) {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const { table, column, value, select = '*', timeout_ms = 10000, interval_ms = 500 } = args;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout_ms) {
    const result = await verifyDbRecord({ table, column, value, select });
    if (result.exists) {
      return { success: true, record: result.record };
    }
    if (result.error && result.error !== 'Supabase not configured') {
      // Si hay un error real (no "not found"), retornarlo
      return { success: false, error: result.error };
    }
    // Esperar antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, interval_ms));
  }

  return { success: false, error: `Timeout waiting for record in ${table} where ${column}=${value}` };
}

async function verifyDbRecord(args) {
  if (!supabase) {
    return { exists: false, error: 'Supabase not configured' };
  }

  const { table, column, value, select = '*' } = args;

  try {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq(column, value)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { exists: false, record: null };
      }
      return { exists: false, error: error.message };
    }

    return { exists: true, record: data };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function resetTestState(args) {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const { fixture_name, user_id, custom_data } = args;
  const fixture = TEST_FIXTURES[fixture_name];

  if (!fixture) {
    return {
      success: false,
      error: `Fixture "${fixture_name}" not found. Available: ${Object.keys(TEST_FIXTURES).join(', ')}`
    };
  }

  const results = { cleanup: [], seed: [], errors: [] };

  try {
    // Cleanup
    for (const table of fixture.cleanup || []) {
      let query = supabase.from(table).delete();
      if (user_id) {
        query = query.or(`renter_id.eq.${user_id},owner_id.eq.${user_id},user_id.eq.${user_id}`);
      }
      const { error } = await query;
      if (error) {
        results.errors.push(`Cleanup ${table}: ${error.message}`);
      } else {
        results.cleanup.push(table);
      }
    }

    // Seed
    for (const seedItem of fixture.seed || []) {
      const data = { ...seedItem.data, ...(custom_data || {}) };
      if (user_id) {
        data.user_id = user_id;
        // También asignar owner_id si la tabla lo requiere (ej: cars)
        if (seedItem.table === 'cars') {
          data.owner_id = user_id;
        }
        // También asignar renter_id si la tabla lo requiere (ej: bookings)
        if (seedItem.table === 'bookings') {
          data.renter_id = user_id;
        }
      }

      // Resolver category_code a category_id para autos
      if (data.category_code) {
        const { data: category } = await supabase
          .from('vehicle_categories')
          .select('id')
          .eq('code', data.category_code)
          .single();

        if (category) {
          data.category_id = category.id;
        }
        delete data.category_code;
      }

      let query;
      if (seedItem.upsert) {
        query = supabase.from(seedItem.table).upsert(data);
      } else {
        query = supabase.from(seedItem.table).insert(data);
      }

      const { error } = await query;
      if (error) {
        results.errors.push(`Seed ${seedItem.table}: ${error.message}`);
      } else {
        results.seed.push(seedItem.table);
      }
    }

    return {
      success: results.errors.length === 0,
      fixture: fixture_name,
      description: fixture.description,
      results
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getUserState(args) {
  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  const { user_id, email } = args;

  if (!user_id && !email) {
    return { error: 'Provide either user_id or email' };
  }

  try {
    // Get profile
    let profileQuery = supabase.from('profiles').select('*');
    if (user_id) {
      profileQuery = profileQuery.eq('id', user_id);
    } else {
      profileQuery = profileQuery.eq('email', email);
    }
    const { data: profile, error: profileError } = await profileQuery.single();

    if (profileError) {
      return { error: `Profile not found: ${profileError.message}` };
    }

    const userId = profile.id;

    // Get wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get active bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, car_id, start_at, end_at, total_cents')
      .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
      .in('status', ['pending_payment', 'reserved', 'confirmed', 'in_progress'])
      .limit(10);

    // Get cars (if owner)
    const { data: cars } = await supabase
      .from('cars')
      .select('id, brand, model, status, is_available')
      .eq('owner_id', userId)
      .limit(10);

    return {
      profile,
      wallet: wallet || { balance_cents: 0, available_balance_cents: 0 },
      recent_transactions: transactions || [],
      active_bookings: bookings || [],
      cars: cars || []
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function queryDb(args) {
  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  const { query } = args;

  // Security: only allow SELECT
  const normalized = query.trim().toLowerCase();
  if (!normalized.startsWith('select')) {
    return { error: 'Only SELECT queries are allowed' };
  }

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: query });

    if (error) {
      // Fallback: try with from().select() for simple queries
      return { error: `Query failed: ${error.message}. Note: Complex queries may require RPC function.` };
    }

    return { success: true, data, row_count: data?.length || 0 };
  } catch (err) {
    return { error: err.message };
  }
}

async function getBrowserConsoleLogs(args) {
  const { trace_path, test_name, severity = 'all' } = args;

  let tracePath = trace_path;

  // Auto-find trace if test_name provided
  if (!tracePath && test_name) {
    const patterns = [
      `${PROJECT_ROOT}/test-results/**/*${test_name}*/**/trace.zip`,
      `${PROJECT_ROOT}/playwright-report/**/*${test_name}*/trace.zip`
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, { nodir: true });
      if (files.length > 0) {
        tracePath = files[0];
        break;
      }
    }
  }

  if (!tracePath) {
    return { error: 'Trace file not found. Provide trace_path or valid test_name.' };
  }

  // Note: Full trace parsing requires unzipping and reading JSON
  // For now, return available info
  if (!fs.existsSync(tracePath)) {
    return { error: `Trace file not found: ${tracePath}` };
  }

  return {
    trace_path: tracePath,
    message: 'Trace file found. Full console log parsing requires trace extraction.',
    suggestion: 'Use `npx playwright show-trace ${trace_path}` to view in browser.',
    file_size: fs.statSync(tracePath).size
  };
}

async function analyzeTraceNetwork(args) {
  const { trace_path, test_name, filter = 'failed', slow_threshold_ms = 3000 } = args;

  let tracePath = trace_path;

  // Auto-find trace
  if (!tracePath && test_name) {
    const files = await glob(`${PROJECT_ROOT}/test-results/**/*${test_name}*/trace.zip`, { nodir: true });
    if (files.length > 0) {
      tracePath = files[0];
    }
  }

  if (!tracePath || !fs.existsSync(tracePath)) {
    return {
      error: 'Trace file not found',
      suggestion: 'Run test with `--trace on` to generate trace file'
    };
  }

  return {
    trace_path: tracePath,
    filter,
    slow_threshold_ms,
    message: 'Network analysis requires trace extraction. Use Playwright trace viewer.',
    command: `npx playwright show-trace "${tracePath}"`
  };
}

async function getTestArtifacts(args) {
  const { test_name, type = 'all', failed_only = true } = args;

  const artifacts = {
    screenshots: [],
    videos: [],
    traces: []
  };

  const searchDirs = [
    `${PROJECT_ROOT}/test-results`,
    `${PROJECT_ROOT}/playwright-report`,
    `${PROJECT_ROOT}/e2e/artifacts`
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    // Screenshots
    if (type === 'all' || type === 'screenshots') {
      const screenshots = await glob(`${dir}/**/*.png`, { nodir: true });
      for (const file of screenshots) {
        if (!test_name || file.includes(test_name)) {
          artifacts.screenshots.push({
            path: file,
            name: path.basename(file),
            size: fs.statSync(file).size,
            modified: fs.statSync(file).mtime
          });
        }
      }
    }

    // Videos
    if (type === 'all' || type === 'videos') {
      const videos = await glob(`${dir}/**/*.webm`, { nodir: true });
      for (const file of videos) {
        if (!test_name || file.includes(test_name)) {
          artifacts.videos.push({
            path: file,
            name: path.basename(file),
            size: fs.statSync(file).size
          });
        }
      }
    }

    // Traces
    if (type === 'all' || type === 'traces') {
      const traces = await glob(`${dir}/**/trace.zip`, { nodir: true });
      for (const file of traces) {
        if (!test_name || file.includes(test_name)) {
          artifacts.traces.push({
            path: file,
            name: path.dirname(file).split('/').pop(),
            size: fs.statSync(file).size
          });
        }
      }
    }
  }

  return {
    test_name_filter: test_name || 'none',
    type_filter: type,
    counts: {
      screenshots: artifacts.screenshots.length,
      videos: artifacts.videos.length,
      traces: artifacts.traces.length
    },
    artifacts
  };
}

async function parsePlaywrightReport(args) {
  const { report_path = 'playwright-report/', format = 'failed' } = args;

  const fullPath = path.isAbsolute(report_path)
    ? report_path
    : path.join(PROJECT_ROOT, report_path);

  // Try to find report.json first
  const jsonReportPath = path.join(fullPath, 'report.json');

  if (fs.existsSync(jsonReportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));

      const summary = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        flaky: 0,
        duration_ms: 0,
        failed_tests: []
      };

      // Parse report structure (varies by Playwright version)
      if (report.suites) {
        const parseTests = (suite) => {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              summary.total++;
              const status = test.status || test.results?.[0]?.status;
              if (status === 'passed') summary.passed++;
              else if (status === 'failed') {
                summary.failed++;
                summary.failed_tests.push({
                  title: `${suite.title} > ${spec.title}`,
                  error: test.results?.[0]?.error?.message?.slice(0, 500)
                });
              }
              else if (status === 'skipped') summary.skipped++;
            }
          }
          for (const child of suite.suites || []) {
            parseTests(child);
          }
        };

        for (const suite of report.suites) {
          parseTests(suite);
        }
      }

      return { success: true, format, summary };
    } catch (err) {
      return { error: `Failed to parse report: ${err.message}` };
    }
  }

  // Check if HTML report exists
  const htmlIndex = path.join(fullPath, 'index.html');
  if (fs.existsSync(htmlIndex)) {
    return {
      message: 'HTML report found but JSON report not available.',
      html_report: htmlIndex,
      suggestion: 'Open with: npx playwright show-report'
    };
  }

  return { error: `Report not found at ${fullPath}` };
}

async function readComponentSource(args) {
  const { component_name, selector, search_in = 'all' } = args;

  const searchPaths = [];
  const basePath = `${PROJECT_ROOT}/apps/web/src/app`;

  if (search_in === 'all' || search_in === 'components') {
    searchPaths.push(`${basePath}/**/components/**/*.ts`);
  }
  if (search_in === 'all' || search_in === 'pages') {
    searchPaths.push(`${basePath}/**/pages/**/*.ts`);
    searchPaths.push(`${basePath}/features/**/*.page.ts`);
  }
  if (search_in === 'all' || search_in === 'services') {
    searchPaths.push(`${basePath}/**/services/**/*.ts`);
  }
  if (search_in === 'all') {
    searchPaths.push(`${basePath}/**/*.component.ts`);
  }

  const results = [];

  for (const pattern of searchPaths) {
    const files = await glob(pattern, { nodir: true, ignore: ['**/node_modules/**', '**/*.spec.ts'] });

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      let match = false;

      // Search by component name
      if (component_name) {
        const namePattern = new RegExp(`class\\s+${component_name}`, 'i');
        if (namePattern.test(content)) {
          match = true;
        }
      }

      // Search by selector
      if (selector) {
        if (content.includes(selector)) {
          match = true;
        }
      }

      if (match) {
        // Try to find corresponding HTML template
        const htmlPath = file.replace('.ts', '.html');
        let htmlContent = null;
        if (fs.existsSync(htmlPath)) {
          htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        }

        results.push({
          ts_file: file,
          html_file: fs.existsSync(htmlPath) ? htmlPath : null,
          ts_preview: content.slice(0, 2000),
          html_preview: htmlContent?.slice(0, 2000) || null
        });

        if (results.length >= 3) break; // Limit results
      }
    }
  }

  return {
    search_criteria: { component_name, selector, search_in },
    found: results.length,
    results
  };
}

async function findSelectorDefinition(args) {
  const { selector, include_tests = false } = args;

  const results = [];
  const searchPatterns = [
    `${PROJECT_ROOT}/apps/web/src/**/*.html`,
    `${PROJECT_ROOT}/apps/web/src/**/*.ts`
  ];

  if (include_tests) {
    searchPatterns.push(`${PROJECT_ROOT}/tests/**/*.ts`);
  }

  // Clean selector for regex
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const pattern of searchPatterns) {
    const files = await glob(pattern, {
      nodir: true,
      ignore: ['**/node_modules/**', '**/dist/**']
    });

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      if (content.includes(selector)) {
        // Find line numbers
        const lines = content.split('\n');
        const matchingLines = [];

        lines.forEach((line, index) => {
          if (line.includes(selector)) {
            matchingLines.push({
              line_number: index + 1,
              content: line.trim().slice(0, 200)
            });
          }
        });

        results.push({
          file,
          occurrences: matchingLines.length,
          lines: matchingLines.slice(0, 5) // Limit to first 5 matches
        });
      }
    }
  }

  return {
    selector,
    total_files: results.length,
    results: results.slice(0, 10) // Limit to 10 files
  };
}

async function patchTestFile(args) {
  const { file_path, search_string, replace_string, create_backup = true } = args;

  const fullPath = path.isAbsolute(file_path)
    ? file_path
    : path.join(PROJECT_ROOT, file_path);

  if (!fs.existsSync(fullPath)) {
    return { success: false, error: `File not found: ${fullPath}` };
  }

  // Verify it's a test file
  if (!fullPath.includes('.spec.') && !fullPath.includes('/tests/')) {
    return {
      success: false,
      error: 'Safety check: Can only patch test files (.spec.ts or files in /tests/)'
    };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  // Check if search_string exists and is unique
  const occurrences = (content.match(new RegExp(search_string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

  if (occurrences === 0) {
    return { success: false, error: 'Search string not found in file' };
  }

  if (occurrences > 1) {
    return {
      success: false,
      error: `Search string found ${occurrences} times. Must be unique for safe patching.`
    };
  }

  // Create backup
  if (create_backup) {
    fs.writeFileSync(`${fullPath}.bak`, content);
  }

  // Apply patch
  const newContent = content.replace(search_string, replace_string);
  fs.writeFileSync(fullPath, newContent);

  return {
    success: true,
    file: fullPath,
    backup_created: create_backup ? `${fullPath}.bak` : null,
    search: search_string.slice(0, 100),
    replace: replace_string.slice(0, 100)
  };
}

async function analyzeTestStructure(args) {
  const { file_path, extract = ['all'] } = args;

  const fullPath = path.isAbsolute(file_path)
    ? file_path
    : path.join(PROJECT_ROOT, file_path);

  if (!fs.existsSync(fullPath)) {
    return { error: `File not found: ${fullPath}` };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const result = { file: fullPath };
  const extractAll = extract.includes('all');

  // Extract describes
  if (extractAll || extract.includes('describes')) {
    const describes = [];
    const describeRegex = /(?:describe|test\.describe)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = describeRegex.exec(content)) !== null) {
      describes.push(match[1]);
    }
    result.describes = describes;
  }

  // Extract tests
  if (extractAll || extract.includes('tests')) {
    const tests = [];
    const testRegex = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      tests.push(match[1]);
    }
    result.tests = tests;
  }

  // Extract hooks
  if (extractAll || extract.includes('hooks')) {
    result.hooks = {
      beforeAll: (content.match(/beforeAll/g) || []).length,
      beforeEach: (content.match(/beforeEach/g) || []).length,
      afterEach: (content.match(/afterEach/g) || []).length,
      afterAll: (content.match(/afterAll/g) || []).length
    };
  }

  // Extract locators
  if (extractAll || extract.includes('locators')) {
    const locators = new Set();
    const locatorPatterns = [
      /getByTestId\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
      /locator\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
      /getByRole\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /getByText\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
      /\$\(\s*['"`]([^'"`]+)['"`]\)/g
    ];

    for (const pattern of locatorPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        locators.add(match[1]);
      }
    }
    result.locators = Array.from(locators);
  }

  // Extract imports
  if (extractAll || extract.includes('imports')) {
    const imports = [];
    const importRegex = /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    result.imports = imports;
  }

  result.line_count = content.split('\n').length;

  return result;
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

async function handleToolCall(name, args) {
  switch (name) {
    // Capa de Datos
    case 'wait_for_db_record':
      return await waitForDbRecord(args);
    case 'verify_db_record':
      return await verifyDbRecord(args);
    case 'reset_test_state':
      return await resetTestState(args);
    case 'get_user_state':
      return await getUserState(args);
    case 'query_db':
      return await queryDb(args);

    // Capa de Ejecución
    case 'get_browser_console_logs':
      return await getBrowserConsoleLogs(args);
    case 'analyze_trace_network':
      return await analyzeTraceNetwork(args);
    case 'get_test_artifacts':
      return await getTestArtifacts(args);
    case 'parse_playwright_report':
      return await parsePlaywrightReport(args);

    // Capa de Código
    case 'read_component_source':
      return await readComponentSource(args);
    case 'find_selector_definition':
      return await findSelectorDefinition(args);
    case 'patch_test_file':
      return await patchTestFile(args);
    case 'analyze_test_structure':
      return await analyzeTestStructure(args);

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: 'state-aware-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args || {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('State-Aware MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
