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

console.log('🔧 Corrigiendo base de datos de Supabase...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixDatabase() {
  try {
    // 1. Crear bucket de avatars si no existe
    console.log('1️⃣  Creando bucket "avatars"...');
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    const avatarsBucket = existingBuckets?.find(b => b.name === 'avatars');

    if (!avatarsBucket) {
      const { data: newBucket, error: bucketError } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
      });

      if (bucketError) {
        console.error('   ❌ Error al crear bucket:', bucketError.message);
      } else {
        console.log('   ✅ Bucket "avatars" creado exitosamente');
      }
    } else {
      console.log('   ℹ️  Bucket "avatars" ya existe');
    }

    // 2. Verificar y crear perfiles para usuarios sin perfil
    console.log('\n2️⃣  Verificando perfiles de usuarios...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('   ❌ Error al listar usuarios:', usersError.message);
      return;
    }

    console.log(`   👥 Total de usuarios: ${users?.length || 0}`);

    if (users && users.length > 0) {
      for (const user of users) {
        // Verificar si el usuario tiene perfil
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id);

        if (profileError) {
          console.error(`   ❌ Error al buscar perfil para ${user.email}:`, profileError.message);
          continue;
        }

        if (!profiles || profiles.length === 0) {
          // Crear perfil para el usuario
          console.log(`   📝 Creando perfil para ${user.email}...`);

          const newProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            default_currency: user.user_metadata?.default_currency || 'ARS',
            role: 'locatario',
            is_admin: false
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error(`   ❌ Error al crear perfil:`, createError.message);
          } else {
            console.log(`   ✅ Perfil creado para ${user.email}:`, createdProfile);
          }
        } else if (profiles.length === 1) {
          console.log(`   ✅ Usuario ${user.email} ya tiene perfil`);
        } else {
          console.log(`   ⚠️  Usuario ${user.email} tiene ${profiles.length} perfiles (debería tener solo 1)`);
          console.log('   📋 Perfiles:', profiles);
        }
      }
    }

    // 3. Verificar políticas RLS (información)
    console.log('\n3️⃣  Verificando políticas RLS...');
    console.log('   ℹ️  Para verificar/configurar políticas RLS, ve a:');
    console.log(`   🔗 ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/auth/policies`);
    console.log('\n   Las políticas necesarias son:');
    console.log('   - Users can view own profile (SELECT con auth.uid() = id)');
    console.log('   - Users can update own profile (UPDATE con auth.uid() = id)');
    console.log('   - Users can insert own profile (INSERT con auth.uid() = id)');
    console.log('   - Authenticated users can view all profiles (SELECT para usuarios autenticados)');

    // 4. Verificar trigger de creación automática (información)
    console.log('\n4️⃣  Información sobre trigger de creación automática...');
    console.log('   ℹ️  Para configurar el trigger que crea perfiles automáticamente:');
    console.log(`   🔗 ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/database/functions`);
    console.log('\n   SQL necesario (copiar en SQL Editor):');
    console.log(`
-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, default_currency, role, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'default_currency', 'ARS'),
    'locatario',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función al crear un nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
    `);

    console.log('\n✅ Correcciones completadas');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Configurar políticas RLS en el dashboard de Supabase');
    console.log('   2. Crear el trigger para creación automática de perfiles');
    console.log('   3. Verificar que el bucket "avatars" tenga las políticas correctas');

  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

fixDatabase();
