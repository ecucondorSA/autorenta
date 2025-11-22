#!/usr/bin/env node
/**
 * Verify Test Setup for Booking History Tests
 * Checks if test user exists and if there are active cars
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
  console.error('❌ Missing Supabase credentials in .env.test');
  console.error('Required: NG_APP_SUPABASE_URL, NG_APP_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const renterEmail = 'test-renter@autorenta.com';
const renterPassword = 'TestPassword123!';

console.log('🔍 Verificando setup de tests...\n');

// 1. Verificar autenticación del usuario
console.log('1️⃣ Verificando usuario test-renter@autorenta.com...');
try {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: renterEmail,
    password: renterPassword,
  });

  if (authError) {
    console.error(`❌ Error de autenticación: ${authError.message}`);
    console.error(`   Código: ${authError.status}`);

    if (authError.message.includes('Invalid login credentials')) {
      console.error('\n💡 Solución: El usuario no existe o la contraseña es incorrecta.');
      console.error('   Crea el usuario en Supabase Dashboard o ejecuta:');
      console.error('   database/create-test-user.sql\n');
    }
  } else if (authData?.user) {
    console.log(`✅ Usuario autenticado correctamente`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);
  } else {
    console.error('❌ No se pudo obtener datos del usuario');
  }
} catch (error) {
  console.error(`❌ Error inesperado: ${error.message}`);
}

console.log('\n2️⃣ Verificando perfil en public.profiles...');
try {
  // Primero obtener el user ID desde auth
  const { data: authUser } = await supabase.auth.admin.getUserByEmail(renterEmail).catch(() => ({ data: { user: null } }));

  if (!authUser?.user?.id) {
    console.error('❌ Usuario no encontrado en auth.users');
    console.error('   Necesitas crear el usuario primero');
  } else {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', authUser.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.error('❌ Perfil no encontrado en public.profiles');
        console.error('   El usuario existe en auth.users pero no tiene perfil');
      } else {
        console.error(`❌ Error al buscar perfil: ${profileError.message}`);
      }
    } else if (profile) {
      console.log(`✅ Perfil encontrado`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Nombre: ${profile.full_name || 'N/A'}`);
      console.log(`   Role: ${profile.role || 'N/A'}`);
    }
  }
} catch (error) {
  console.error(`❌ Error inesperado: ${error.message}`);
}

console.log('\n3️⃣ Verificando autos activos...');
try {
  const { data: cars, error: carsError } = await supabase
    .from('cars')
    .select('id, owner_id, brand, model, status')
    .eq('status', 'active')
    .limit(5);

  if (carsError) {
    console.error(`❌ Error al buscar autos: ${carsError.message}`);
  } else if (!cars || cars.length === 0) {
    console.error('❌ No hay autos activos en la base de datos');
    console.error('\n💡 Solución: Crea un auto de test con status="active"');
    console.error('   Puedes usar el script: database/create-test-car.sql\n');
  } else {
    console.log(`✅ Encontrados ${cars.length} auto(s) activo(s):`);
    cars.forEach((car, i) => {
      console.log(`   ${i + 1}. ${car.brand} ${car.model} (ID: ${car.id})`);
    });
  }
} catch (error) {
  console.error(`❌ Error inesperado: ${error.message}`);
}

console.log('\n✅ Verificación completada\n');

