#!/usr/bin/env node

/**
 * Script de Diagnóstico de Realtime - AutoRenta
 * Ejecuta consultas SQL para diagnosticar problemas de rendimiento en Realtime
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer variables de entorno
const envPath = join(__dirname, '../apps/web/.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.NG_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envVars.NG_APP_SUPABASE_SERVICE_ROLE_KEY || envVars.NG_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: No se encontraron las credenciales de Supabase en .env.local');
  console.error('Necesitas: NG_APP_SUPABASE_URL y NG_APP_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🔍 Ejecutando diagnóstico de Realtime...\n');

const results = {
  timestamp: new Date().toISOString(),
  queries: {}
};

/**
 * Ejecuta una consulta SQL y guarda los resultados
 */
async function runQuery(name, sql, description) {
  console.log(`📊 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error(`❌ Error en ${name}:`, error.message);
      results.queries[name] = { error: error.message, sql };
    } else {
      console.log(`✅ ${name}: ${data?.length || 0} resultados`);
      results.queries[name] = { data, sql };
    }
  } catch (err) {
    console.error(`❌ Excepción en ${name}:`, err.message);
    results.queries[name] = { error: err.message, sql };
  }
}

/**
 * Ejecuta SQL directo usando el método de PostgreSQL REST API
 */
async function runDirectSQL(name, sql, description) {
  console.log(`📊 ${description}...`);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Error en ${name}:`, data);
      results.queries[name] = { error: data, sql };
    } else {
      console.log(`✅ ${name}: ${Array.isArray(data) ? data.length : 'OK'} resultados`);
      results.queries[name] = { data, sql };
    }
  } catch (err) {
    console.error(`❌ Excepción en ${name}:`, err.message);
    results.queries[name] = { error: err.message, sql };
  }
}

// =====================================================
// CONSULTAS DE DIAGNÓSTICO
// =====================================================

async function runDiagnostics() {
  // 1. Funciones que usan realtime.broadcast_changes
  await runDirectSQL(
    'realtime_functions',
    `
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      LEFT(pg_get_functiondef(p.oid), 200) AS function_preview
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast_changes%'
       OR pg_get_functiondef(p.oid) ILIKE '%realtime.send%'
    ORDER BY n.nspname, p.proname;
    `,
    'Buscando funciones que usan Realtime'
  );

  // 2. Triggers asociados
  await runDirectSQL(
    'realtime_triggers',
    `
    SELECT
      t.tgname AS trigger_name,
      c.relname AS table_name,
      n.nspname AS schema_name,
      p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
    ORDER BY c.relname, t.tgname;
    `,
    'Listando triggers en tablas públicas'
  );

  // 3. Sesiones activas
  await runDirectSQL(
    'active_sessions',
    `
    SELECT
      pid,
      usename,
      application_name,
      state,
      EXTRACT(EPOCH FROM (NOW() - query_start))::int AS query_duration_seconds,
      LEFT(query, 100) AS query_preview
    FROM pg_stat_activity
    WHERE state != 'idle'
      AND pid != pg_backend_pid()
    ORDER BY query_start DESC
    LIMIT 20;
    `,
    'Consultando sesiones activas'
  );

  // 4. Bloqueos activos
  await runDirectSQL(
    'active_locks',
    `
    SELECT
      l.locktype,
      l.mode,
      l.granted,
      c.relname AS relation,
      a.usename,
      a.state,
      LEFT(a.query, 100) AS query_preview
    FROM pg_locks l
    LEFT JOIN pg_stat_activity a ON l.pid = a.pid
    LEFT JOIN pg_class c ON l.relation = c.oid
    WHERE NOT l.granted
    LIMIT 20;
    `,
    'Consultando bloqueos activos'
  );

  // 5. Políticas RLS
  await runDirectSQL(
    'rls_policies',
    `
    SELECT
      schemaname,
      tablename,
      policyname,
      cmd,
      LEFT(qual::text, 100) AS policy_condition
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
    `,
    'Listando políticas RLS'
  );

  // 6. Índices existentes
  await runDirectSQL(
    'existing_indexes',
    `
    SELECT
      schemaname,
      tablename,
      indexname,
      LEFT(indexdef, 150) AS index_definition
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
    `,
    'Verificando índices existentes'
  );

  // 7. Tablas con más actividad
  await runDirectSQL(
    'table_activity',
    `
    SELECT
      schemaname,
      relname AS table_name,
      n_tup_ins AS inserts,
      n_tup_upd AS updates,
      n_tup_del AS deletes,
      n_live_tup AS live_rows,
      n_dead_tup AS dead_rows
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
    LIMIT 20;
    `,
    'Analizando actividad de tablas'
  );

  // Guardar resultados
  const outputPath = join(__dirname, 'realtime-diagnosis-results.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n✅ Diagnóstico completado!`);
  console.log(`📄 Resultados guardados en: ${outputPath}`);

  // Resumen
  console.log('\n📊 RESUMEN:');
  Object.entries(results.queries).forEach(([name, result]) => {
    if (result.error) {
      console.log(`  ❌ ${name}: ERROR`);
    } else if (Array.isArray(result.data)) {
      console.log(`  ✅ ${name}: ${result.data.length} registros`);
    } else {
      console.log(`  ✅ ${name}: OK`);
    }
  });
}

// Ejecutar
runDiagnostics().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
