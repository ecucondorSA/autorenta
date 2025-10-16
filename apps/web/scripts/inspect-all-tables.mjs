#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Leer variables de entorno
const envFile = resolve(process.cwd(), '.env.development.local');
const envContent = readFileSync(envFile, 'utf-8');
const envVars = {};

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!key) continue;
  envVars[key] = value;
}

const supabaseUrl = envVars.NG_APP_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔍 Inspeccionando base de datos completa de Supabase...\n');

async function inspectAllTables() {
  const tables = ['profiles', 'cars', 'car_photos', 'bookings', 'payments', 'payment_intents'];

  for (const table of tables) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Tabla: ${table}`);
    console.log('='.repeat(60));

    try {
      const { data, error } = await supabase.from(table).select('*').limit(3);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        continue;
      }

      console.log(`   📈 Total de registros (muestra): ${data?.length || 0}`);

      if (data && data.length > 0) {
        console.log('\n   📋 Estructura del primer registro:');
        const first = data[0];
        Object.keys(first).forEach(key => {
          const value = first[key];
          const type = value === null ? 'null' : typeof value;
          const preview = value === null ? 'null' :
                         type === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
                         JSON.stringify(value).substring(0, 50);
          console.log(`      - ${key}: ${type} = ${preview}`);
        });

        if (data.length > 1) {
          console.log(`\n   📦 Se encontraron ${data.length} registros (mostrando muestra)`);
        }
      } else {
        console.log('   ⚠️  No hay datos en esta tabla');
      }
    } catch (err) {
      console.error(`   ❌ Error inesperado:`, err.message);
    }
  }

  // Verificar buckets de storage
  console.log(`\n${'='.repeat(60)}`);
  console.log('📦 Storage Buckets');
  console.log('='.repeat(60));

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('   ❌ Error:', error.message);
    } else {
      console.log(`   Total de buckets: ${buckets?.length || 0}`);
      buckets?.forEach(bucket => {
        console.log(`   - ${bucket.name} (public: ${bucket.public}, created: ${bucket.created_at})`);
      });
    }
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }

  console.log('\n✅ Inspección completada\n');
}

inspectAllTables();
