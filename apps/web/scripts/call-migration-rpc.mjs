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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔧 Llamando función RPC para agregar "both" al enum...\n');

async function callMigration() {
  try {
    const { data, error } = await supabase.rpc('add_both_to_user_role_enum');

    if (error) {
      console.error('❌ Error al llamar la función RPC:', error.message);
      console.log('\n📝 La función RPC no existe. Primero ejecuta:');
      console.log('   scripts/create-migration-function.sql');
      console.log('\nEn Supabase Dashboard → SQL Editor\n');
      process.exit(1);
    }

    console.log('✅ Resultado:', data);

    if (data.success) {
      console.log('\n✅', data.message);
      console.log('\n🔍 Verificando enum actualizado...');

      // Verificar
      const { data: profiles } = await supabase
        .from('profiles')
        .select('role')
        .limit(100);

      const uniqueRoles = [...new Set(profiles.map(p => p.role))];
      console.log('Valores de role disponibles:', uniqueRoles);
    } else {
      console.log('\n❌', data.message);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

callMigration();
