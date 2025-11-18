#!/usr/bin/env node
/**
 * Create Test Renter User for E2E Tests
 * Creates test-renter@autorenta.com with password TestPassword123!
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.test');
  console.error('Required: NG_APP_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const renterEmail = 'test-renter@autorenta.com';
const renterPassword = 'TestPassword123!';

console.log('🔧 Creando usuario de test renter...\n');

// Check if user already exists
const { data: existingUser } = await supabase.auth.admin.listUsers();
const userExists = existingUser?.users?.find(u => u.email === renterEmail);

if (userExists) {
  console.log(`✅ Usuario ${renterEmail} ya existe`);
  console.log(`   User ID: ${userExists.id}`);

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userExists.id)
    .single();

  if (profile) {
    console.log(`✅ Perfil existe`);
    console.log(`   Nombre: ${profile.full_name || 'N/A'}`);
    console.log(`   Role: ${profile.role || 'N/A'}`);
  } else {
    console.log(`⚠️  Perfil no existe, creando...`);
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userExists.id,
        full_name: 'Test Renter',
        role: 'locatario',
        default_currency: 'ARS',
      });

    if (profileError) {
      console.error(`❌ Error al crear perfil: ${profileError.message}`);
    } else {
      console.log(`✅ Perfil creado exitosamente`);
    }
  }

  process.exit(0);
}

// Create new user
console.log(`📝 Creando usuario ${renterEmail}...`);

try {
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: renterEmail,
    password: renterPassword,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: 'Test Renter',
      default_currency: 'ARS',
    },
  });

  if (createError) {
    console.error(`❌ Error al crear usuario: ${createError.message}`);
    process.exit(1);
  }

  if (!newUser?.user) {
    console.error('❌ No se pudo crear el usuario');
    process.exit(1);
  }

  console.log(`✅ Usuario creado exitosamente`);
  console.log(`   User ID: ${newUser.user.id}`);
  console.log(`   Email: ${newUser.user.email}`);

  // Wait a bit for trigger to create profile
  console.log(`\n⏳ Esperando que se cree el perfil automáticamente...`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if profile was created by trigger
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', newUser.user.id)
    .single();

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it manually
      console.log(`⚠️  Perfil no se creó automáticamente, creando manualmente...`);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          full_name: 'Test Renter',
          role: 'locatario',
          default_currency: 'ARS',
        });

      if (insertError) {
        console.error(`❌ Error al crear perfil: ${insertError.message}`);
        process.exit(1);
      }
      console.log(`✅ Perfil creado manualmente`);
    } else {
      console.error(`❌ Error al verificar perfil: ${profileError.message}`);
      process.exit(1);
    }
  } else {
    console.log(`✅ Perfil creado automáticamente`);
    console.log(`   Nombre: ${profile.full_name || 'N/A'}`);
    console.log(`   Role: ${profile.role || 'N/A'}`);
  }

  // Verify login works
  console.log(`\n🔐 Verificando login...`);
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: renterEmail,
    password: renterPassword,
  });

  if (loginError) {
    console.error(`❌ Error al verificar login: ${loginError.message}`);
    process.exit(1);
  }

  console.log(`✅ Login verificado exitosamente`);
  console.log(`\n✅ Usuario de test renter creado y configurado correctamente\n`);

} catch (error) {
  console.error(`❌ Error inesperado: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}








