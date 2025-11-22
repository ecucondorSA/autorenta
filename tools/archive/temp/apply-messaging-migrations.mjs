#!/usr/bin/env node

/**
 * Script to apply messaging system migrations to Supabase
 *
 * Applies:
 * 1. 20251028_create_messages_table_complete.sql
 * 2. 20251028_encrypt_messages_server_side.sql
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node apply-messaging-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada');
  console.error('\nUso:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-key node apply-messaging-migrations.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Aplicando migraciones del sistema de mensajería...\n');

// Migrations to apply
const migrations = [
  {
    name: 'Tabla messages con RLS y Realtime',
    file: 'supabase/migrations/20251028_create_messages_table_complete.sql',
  },
  {
    name: 'Cifrado server-side con pgcrypto',
    file: 'supabase/migrations/20251028_encrypt_messages_server_side.sql',
  }
];

/**
 * Execute a single SQL statement
 */
async function executeStatement(statement, index, total) {
  // Skip empty statements, comments, and testing sections
  if (!statement ||
      statement.startsWith('--') ||
      statement.includes('TESTING QUERIES') ||
      statement.includes('ROLLBACK')) {
    return { success: true, skipped: true };
  }

  console.log(`\n[${index}/${total}] Ejecutando...`);
  console.log(statement.substring(0, 150).replace(/\s+/g, ' ') + '...\n');

  try {
    // Try direct query first
    const { error } = await supabase.rpc('exec_sql', {
      query: statement + ';'
    });

    if (error) {
      // If exec_sql doesn't exist, try direct connection
      if (error.message?.includes('exec_sql')) {
        console.warn('⚠️  exec_sql RPC no disponible, usando método alternativo...');

        // For simple queries, we can use direct connection
        // This is a fallback and may not work for all statements
        const { error: directError } = await supabase.from('_migrations').select('*').limit(1);

        if (directError) {
          throw new Error('No se puede ejecutar SQL directamente. Aplica manualmente via SQL Editor.');
        }
      }

      throw error;
    }

    return { success: true, skipped: false };
  } catch (error) {
    return { success: false, error, skipped: false };
  }
}

/**
 * Apply a single migration file
 */
async function applyMigration(migration) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 ${migration.name}`);
  console.log(`📄 ${migration.file}`);
  console.log('='.repeat(80));

  // Read SQL file
  let sqlContent;
  try {
    sqlContent = readFileSync(migration.file, 'utf8');
  } catch (error) {
    console.error(`❌ Error leyendo archivo: ${error.message}`);
    return { success: false, error };
  }

  // Split into statements
  // More sophisticated split that handles multi-line comments and strings
  const statements = sqlContent
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/) // Split on ; but not inside strings
    .map(s => s.trim())
    .filter(s => {
      // Remove comments and empty lines
      const cleaned = s.replace(/--.*$/gm, '').trim();
      return cleaned &&
             !cleaned.startsWith('/*') &&
             cleaned !== '' &&
             !cleaned.match(/^COMMENT ON/i); // Skip comments for now
    });

  console.log(`\n📊 Total de statements a ejecutar: ${statements.length}\n`);

  let executed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const result = await executeStatement(statement, i + 1, statements.length);

    if (result.skipped) {
      skipped++;
    } else if (result.success) {
      executed++;
      console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
    } else {
      failed++;
      console.error(`❌ Error en statement ${i + 1}:`, result.error?.message || result.error);
      errors.push({
        statement: statement.substring(0, 100),
        error: result.error?.message || result.error
      });

      // Continue with next statement instead of failing completely
    }
  }

  console.log(`\n📊 Resumen de migración: ${migration.name}`);
  console.log(`   ✅ Ejecutados: ${executed}`);
  console.log(`   ⏭️  Omitidos: ${skipped}`);
  console.log(`   ❌ Fallidos: ${failed}`);

  return {
    success: failed === 0,
    executed,
    skipped,
    failed,
    errors
  };
}

/**
 * Main execution
 */
async function main() {
  const results = [];

  for (const migration of migrations) {
    const result = await applyMigration(migration);
    results.push({ migration: migration.name, ...result });

    if (!result.success) {
      console.error(`\n⚠️  Migración "${migration.name}" tuvo ${result.failed} errores`);
      console.error('Continuando con siguiente migración...\n');
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN FINAL');
  console.log('='.repeat(80));

  results.forEach(result => {
    const status = result.success ? '✅' : '⚠️';
    console.log(`\n${status} ${result.migration}`);
    console.log(`   Ejecutados: ${result.executed} | Omitidos: ${result.skipped} | Fallidos: ${result.failed}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n   Errores:');
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.error}`);
        console.log(`      Statement: ${err.statement}...`);
      });
    }
  });

  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  if (totalFailed === 0) {
    console.log('\n✅ ¡Todas las migraciones aplicadas exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Verificar en Supabase Dashboard que las tablas existen');
    console.log('   2. Hacer build del frontend: cd apps/web && npm run build');
    console.log('   3. Deploy a producción');
  } else {
    console.log(`\n⚠️  ${totalFailed} statements fallaron`);
    console.log('   Revisa los errores arriba y aplica manualmente vía SQL Editor si es necesario');
    console.log('   URL: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql');
  }
}

// Run
main().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
