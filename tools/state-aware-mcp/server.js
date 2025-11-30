#!/usr/bin/env node
/**
 * Autorenta Data MCP Server
 *
 * Proporciona herramientas de gestión de datos para desarrollo y pruebas:
 *
 * CAPA DE DATOS (Supabase):
 *   - verify_db_record: Verificar existencia de registros
 *   - reset_test_state: Limpiar y sembrar datos de prueba (Fixtures)
 *   - get_user_state: Obtener estado completo de un usuario
 *   - query_db: Ejecutar consultas SQL de solo lectura
 *
 * CAPA DE CÓDIGO (Solo Lectura):
 *   - read_component_source: Buscar código fuente de un componente
 *   - find_selector_definition: Encontrar dónde se define un selector
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
  process.env.NG_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpc3FqbW9rbGl2enB3dWZoc2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ4Mjc4MywiZXhwIjoyMDc4MDU4NzgzfQ.SiACo6rXnbu0B091FZEgmyoXK0-EzxKd9YeO4pls0eQ';

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
      { table: 'cars', data: { status: 'active' } }
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
          title: 'Compact Car A',
          description: 'Economical and good for city driving.',
          brand: 'Honda',
          model: 'Fit',
          year: 2020,
          price_per_day: 30000,
          currency: 'ARS',
          city: 'Buenos Aires',
          province: 'Buenos Aires',
          country: 'AR',
          status: 'active',
          latitude: -34.59,
          longitude: -58.38,
          category_code: 'economy' // Maps to a compact/small car
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Mid-size Sedan B',
          description: 'Comfortable for families, good mileage.',
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
          category_code: 'standard' // Maps to Sedan
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Luxury Sedan C',
          description: 'High-end features and performance.',
          brand: 'Mercedes-Benz',
          model: 'C-Class',
          year: 2023,
          price_per_day: 90000,
          currency: 'ARS',
          city: 'Buenos Aires',
          province: 'Buenos Aires',
          country: 'AR',
          status: 'active',
          latitude: -34.61,
          longitude: -58.37,
          category_code: 'premium' // Maps to higher-end Sedan
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Compact SUV D',
          description: 'Versatile for city and light off-road.',
          brand: 'Jeep',
          model: 'Renegade',
          year: 2021,
          price_per_day: 70000,
          currency: 'ARS',
          city: 'Córdoba',
          province: 'Córdoba',
          country: 'AR',
          status: 'active',
          latitude: -31.4201,
          longitude: -64.1888,
          category_code: 'premium' // Maps to SUV
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Large SUV E',
          description: 'Spacious and powerful, ideal for trips.',
          brand: 'Ford',
          model: 'Explorer',
          year: 2023,
          price_per_day: 120000,
          currency: 'ARS',
          city: 'Córdoba',
          province: 'Córdoba',
          country: 'AR',
          status: 'active',
          latitude: -31.43,
          longitude: -64.19,
          category_code: 'premium' // Maps to large SUV
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Pickup Truck F',
          description: 'Heavy duty, great for work or adventure.',
          brand: 'Ford',
          model: 'Ranger',
          year: 2023,
          price_per_day: 100000,
          currency: 'ARS',
          city: 'Mendoza',
          province: 'Mendoza',
          country: 'AR',
          status: 'active',
          latitude: -32.88,
          longitude: -68.84,
          category_code: 'premium' // Maps to Truck/Utility
        }
      },
      {
        table: 'cars',
        data: {
          title: 'Economy Car G',
          description: 'Very cheap and good for short distances.',
          brand: 'Fiat',
          model: 'Mobi',
          year: 2019,
          price_per_day: 25000,
          currency: 'ARS',
          city: 'Rosario',
          province: 'Santa Fe',
          country: 'AR',
          status: 'active',
          latitude: -32.94,
          longitude: -60.67,
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
Útil para evitar race conditions.
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
    description: `Limpia y resiembra datos de prueba usando fixtures predefinidas.
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
Útil para diagnóstico.`,
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
Busca en: templates HTML, componentes TS.`,
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Selector a buscar (ej: #submit-btn, [data-testid="pay"])'
        }
      },
      required: ['selector']
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
      return { success: false, error: result.error };
    }
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

  const { fixture_name, fixture: fixture_alias, user_id, custom_data } = args;
  const fixtureKey = fixture_name || fixture_alias;
  const fixture = TEST_FIXTURES[fixtureKey];

  if (!fixture) {
    return {
      success: false,
      error: `Fixture "${fixtureKey}" not found. Available: ${Object.keys(TEST_FIXTURES).join(', ')}`
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
        if (seedItem.table === 'cars') {
          data.owner_id = user_id;
        }
        if (seedItem.table === 'bookings') {
          data.renter_id = user_id;
        }
      }

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

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, car_id, start_at, end_at, total_cents')
      .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
      .in('status', ['pending_payment', 'reserved', 'confirmed', 'in_progress'])
      .limit(10);

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
  const normalized = query.trim().toLowerCase();
  if (!normalized.startsWith('select')) {
    return { error: 'Only SELECT queries are allowed' };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { query_text: query });

    if (!rpcError && rpcData) {
      return { success: true, data: rpcData, row_count: rpcData?.length || 0 };
    }

    const countMatch = query.match(/SELECT\s+COUNT\([^)]*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (countMatch) {
      const [, countAlias, tableName, whereClause] = countMatch;
      let queryBuilder = supabase.from(tableName).select('*', { count: 'exact', head: true });

      if (whereClause) {
        const ownerIdMatch = whereClause.match(/owner_id\s*=\s*['"]([^'"]+)['"]/i);
        if (ownerIdMatch) queryBuilder = queryBuilder.eq('owner_id', ownerIdMatch[1]);

        const statusMatch = whereClause.match(/status\s*=\s*['"]([^'"]+)['"]/i);
        if (statusMatch) queryBuilder = queryBuilder.eq('status', statusMatch[1]);
        
        const categoryMatch = whereClause.match(/category_code\s*=\s*['"]([^'"]+)['"]/i);
        if (categoryMatch) queryBuilder = queryBuilder.eq('category_code', categoryMatch[1]);
        
        const minPriceMatch = whereClause.match(/price_per_day\s*>=\s*(\d+)/i);
        if (minPriceMatch) queryBuilder = queryBuilder.gte('price_per_day', parseInt(minPriceMatch[1], 10));
        
        const maxPriceMatch = whereClause.match(/price_per_day\s*<=\s*(\d+)/i);
        if (maxPriceMatch) queryBuilder = queryBuilder.lte('price_per_day', parseInt(maxPriceMatch[1], 10));
      }

      const { count, error: countError } = await queryBuilder;
      if (countError) return { error: `Query failed: ${countError.message}` };

      return { success: true, data: [{ [countAlias]: count }], row_count: 1 };
    }

    return {
      error: `Query failed: ${rpcError?.message || 'Unable to parse query'}. Note: Complex queries may require RPC function exec_sql.`
    };
  } catch (err) {
    return { error: err.message };
  }
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

      if (component_name) {
        const namePattern = new RegExp(`class\\s+${component_name}`, 'i');
        if (namePattern.test(content)) match = true;
      }

      if (selector) {
        if (content.includes(selector)) match = true;
      }

      if (match) {
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

        if (results.length >= 3) break;
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
  const { selector } = args;
  const results = [];
  const searchPatterns = [
    `${PROJECT_ROOT}/apps/web/src/**/*.html`,
    `${PROJECT_ROOT}/apps/web/src/**/*.ts`
  ];

  for (const pattern of searchPatterns) {
    const files = await glob(pattern, { nodir: true, ignore: ['**/node_modules/**', '**/dist/**'] });
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes(selector)) {
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
          lines: matchingLines.slice(0, 5)
        });
      }
    }
  }

  return {
    selector,
    total_files: results.length,
    results: results.slice(0, 10)
  };
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

async function handleToolCall(name, args) {
  switch (name) {
    // Capa de Datos
    case 'wait_for_db_record': return await waitForDbRecord(args);
    case 'verify_db_record': return await verifyDbRecord(args);
    case 'reset_test_state': return await resetTestState(args);
    case 'get_user_state': return await getUserState(args);
    case 'query_db': return await queryDb(args);

    // Capa de Código
    case 'read_component_source': return await readComponentSource(args);
    case 'find_selector_definition': return await findSelectorDefinition(args);

    default: return { error: `Unknown tool: ${name}` };
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: 'autorenta-data-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args || {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message }, null, 2) }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Autorenta Data MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
