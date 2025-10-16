#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Leer variables de entorno del archivo .env.development.local
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
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function inspectTable() {
  console.log('🔍 Inspeccionando tabla profiles...\n');

  // Obtener todos los registros para ver la estructura
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total de registros: ${profiles?.length || 0}\n`);

  if (profiles && profiles.length > 0) {
    console.log('📋 Estructura del primer registro:');
    console.log(JSON.stringify(profiles[0], null, 2));

    console.log('\n📝 Columnas disponibles:');
    Object.keys(profiles[0]).forEach(key => {
      console.log(`   - ${key}: ${typeof profiles[0][key]}`);
    });
  } else {
    console.log('⚠️  No hay registros en la tabla');
  }
}

inspectTable();
