#!/usr/bin/env node
/**
 * Database Fix Script
 * Aplica migrations de Split Payment System a Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL || 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
  console.error('Uso: SUPABASE_SERVICE_ROLE_KEY="your-key" node db_fix.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Iniciando Database Fix...\n');

  try {
    // Leer migration SQL
    const migrationPath = join(__dirname, 'supabase/migrations/20251028_add_split_payment_system.sql');
    console.log(`📄 Leyendo: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Dividir en statements individuales
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Encontrados ${statements.length} statements SQL\n`);

    // Ejecutar cada statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Mostrar tipo de statement
      const statementType = statement.match(/^(CREATE|ALTER|INSERT|UPDATE|DROP|GRANT)/i)?.[1] || 'SQL';
      process.stdout.write(`${i + 1}/${statements.length} - ${statementType}... `);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Algunos errores son esperados (ej: tabla ya existe)
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate')) {
            console.log('⚠️  Ya existe (skip)');
          } else {
            console.log(`❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`⚠️  Errores: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');
    
    const expectedTables = [
      'wallet_split_config',
      'bank_accounts',
      'withdrawal_requests',
      'withdrawal_transactions',
      'booking_risk_snapshots'
    ];

    for (const table of expectedTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: No existe o sin acceso`);
      } else {
        console.log(`✅ ${table}: Tabla accesible`);
      }
    }

    console.log('\n✅ Database Fix completado!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// Ejecutar
applyMigration();
