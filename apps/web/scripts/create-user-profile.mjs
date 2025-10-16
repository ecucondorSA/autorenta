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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan credenciales de Supabase en .env.development.local');
  process.exit(1);
}

console.log('👤 Creando perfil para el usuario actual...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUserProfile() {
  try {
    // Obtener el usuario actual
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error al obtener usuarios:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      return;
    }

    console.log(`👥 Total de usuarios encontrados: ${users.length}\n`);

    // Crear perfil para cada usuario que no tenga uno
    for (const user of users) {
      console.log(`\n📧 Usuario: ${user.email}`);

      // Verificar si ya tiene perfil
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);

      if (checkError) {
        console.error(`   ❌ Error al verificar perfil: ${checkError.message}`);
        continue;
      }

      if (existingProfiles && existingProfiles.length > 0) {
        console.log(`   ✅ Ya tiene perfil:`, existingProfiles[0]);
        continue;
      }

      // Crear nuevo perfil
      console.log(`   📝 Creando perfil...`);

      const newProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
        role: 'renter', // Rol por defecto
        country: 'AR'
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error(`   ❌ Error al crear perfil: ${createError.message}`);
        console.error(`   Detalles:`, createError);
      } else {
        console.log(`   ✅ Perfil creado exitosamente:`, createdProfile);
      }
    }

    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

createUserProfile();
