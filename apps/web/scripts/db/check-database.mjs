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

console.log('🔍 Verificando base de datos de Supabase...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabase() {
  try {
    // 1. Verificar si existe la tabla profiles
    console.log('1️⃣  Verificando tabla profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('   ❌ Error al consultar tabla profiles:', profilesError.message);
      if (profilesError.code === '42P01') {
        console.error('   ⚠️  La tabla profiles NO EXISTE');
        return;
      }
    } else {
      console.log('   ✅ Tabla profiles existe');
      console.log(`   📊 Registros encontrados: ${profiles?.length || 0}`);
    }

    // 2. Verificar estructura de la tabla
    console.log('\n2️⃣  Verificando estructura de la tabla...');
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles'
        ORDER BY ordinal_position;
      `
    });

    if (columnsError) {
      console.log('   ⚠️  No se pudo verificar la estructura (necesita función RPC)');
    } else {
      console.log('   Columnas:', columns);
    }

    // 3. Verificar políticas RLS
    console.log('\n3️⃣  Verificando políticas RLS...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE tablename = 'profiles';
      `
    });

    if (policiesError) {
      console.log('   ⚠️  No se pudo verificar las políticas RLS (necesita función RPC)');
    } else {
      console.log('   Políticas:', policies);
    }

    // 4. Verificar si RLS está habilitado
    console.log('\n4️⃣  Verificando si RLS está habilitado...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;
      `
    });

    if (rlsError) {
      console.log('   ⚠️  No se pudo verificar el estado de RLS');
    } else {
      console.log('   Estado RLS:', rlsStatus);
    }

    // 5. Verificar trigger de creación automática
    console.log('\n5️⃣  Verificando trigger de creación automática...');
    const { data: triggers, error: triggersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'users' AND trigger_schema = 'auth';
      `
    });

    if (triggersError) {
      console.log('   ⚠️  No se pudo verificar triggers');
    } else {
      console.log('   Triggers:', triggers);
    }

    // 6. Verificar usuarios y perfiles
    console.log('\n6️⃣  Verificando usuarios y perfiles...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('   ❌ Error al listar usuarios:', usersError.message);
    } else {
      console.log(`   👥 Total de usuarios: ${users?.length || 0}`);

      if (users && users.length > 0) {
        console.log('\n   Verificando perfiles para cada usuario:');
        for (const user of users) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.log(`   ❌ Usuario ${user.email} NO tiene perfil (${profileError.message})`);
          } else {
            console.log(`   ✅ Usuario ${user.email} tiene perfil:`, profile);
          }
        }
      }
    }

    // 7. Verificar bucket de avatars
    console.log('\n7️⃣  Verificando bucket de storage para avatars...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('   ❌ Error al listar buckets:', bucketsError.message);
    } else {
      const avatarsBucket = buckets.find(b => b.name === 'avatars');
      if (avatarsBucket) {
        console.log('   ✅ Bucket "avatars" existe:', avatarsBucket);
      } else {
        console.log('   ❌ Bucket "avatars" NO existe');
        console.log('   📋 Buckets disponibles:', buckets.map(b => b.name).join(', '));
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

checkDatabase();
