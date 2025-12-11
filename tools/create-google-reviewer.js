
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NG_APP_SUPABASE_URL;
const supabaseServiceKey = envConfig.NG_APP_SUPABASE_ANON_KEY; // Usamos Anon Key ya que no tenemos Service Key en env local

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NG_APP_SUPABASE_URL y NG_APP_SUPABASE_ANON_KEY son requeridos en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_USER = {
  email: 'demo.renter@autorenta.com',
  password: 'Autorentar2025!',
  fullName: 'Google Reviewer',
  phone: '+5491112345678'
};

async function main() {
  console.log(`🔍 Verificando usuario: ${TEST_USER.email}`);

  // 1. Intentar iniciar sesión para ver si existe
  let { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  let userId;

  if (signInError && signInError.message.includes('Invalid login credentials')) {
      // Podría existir con otro password o no existir. Intentamos registrar.
      console.log('✨ Usuario no logueado. Intentando registrar...');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
        options: {
          data: {
            full_name: TEST_USER.fullName
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
             console.log('ℹ️ El usuario ya existe pero el password era incorrecto. No se puede resetear sin Service Key.');
             console.log('⚠️ Por favor borra el usuario manualmente en Supabase o usa el password existente.');
             process.exit(1);
        }
        console.error('Error registrando usuario:', signUpError);
        process.exit(1);
      }
      
      if (signUpData.user) {
          console.log(`✅ Usuario registrado con ID: ${signUpData.user.id}`);
          userId = signUpData.user.id;
          session = signUpData.session; // Puede ser null si requiere confirmación de email
      }
  } else if (session) {
      console.log(`✅ Usuario logueado correctamente con ID: ${session.user.id}`);
      userId = session.user.id;
  } else {
      console.error('Error inesperado verificando usuario:', signInError);
      process.exit(1);
  }

  if (!userId) {
      console.log('⚠️ El usuario fue creado pero requiere confirmación de email o aprobación manual.');
      console.log('⚠️ No se puede continuar con la configuración del perfil automáticamente.');
      process.exit(1);
  }

  // 2. Crear o actualizar el perfil en public.profiles
  console.log('👤 Intentando configurar perfil verificado (puede fallar por RLS)...');
  
  const profileData = {
    id: userId,
    full_name: TEST_USER.fullName,
    role: 'renter', // Usuario puede elegir rol
    country: 'AR',
    currency: 'ARS',
    locale: 'es-AR',
    // Intentamos setear campos protegidos, si RLS bloquea, fallará o ignorará
    kyc: 'verified', 
    onboarding: 'complete',
    tos_accepted_at: new Date().toISOString(),
    id_verified: true,
    email_verified: true,
    phone_verified: true,
    phone: TEST_USER.phone,
    driver_license_number: 'GOOGLE-DEMO-LICENSE',
    driver_license_country: 'AR',
    driver_license_expiry: '2030-01-01',
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profileData)
    .select()
    .single();

  if (profileError) {
    console.warn('⚠️ Error actualizando perfil completo (probablemente RLS):', profileError.message);
    console.log('ℹ️ Generando script SQL para ejecución manual...');
    generateSqlScript(userId, TEST_USER.email);
  } else {
    console.log('✅ Perfil actualizado correctamente. (Verifica en dashboard si los campos KYC se guardaron)');
    
    // Verificamos si realmente se guardó el estado KYC (a veces RLS permite update pero ignora campos)
    const { data: verifyProfile } = await supabase.from('profiles').select('kyc').eq('id', userId).single();
    if (verifyProfile && verifyProfile.kyc !== 'verified') {
        console.warn('⚠️ RLS ignoró los campos de verificación.');
        console.log('ℹ️ Generando script SQL para ejecución manual...');
        generateSqlScript(userId, TEST_USER.email);
    } else {
        console.log('✨ Los permisos parecen haberse aplicado correctamente.');
    }
  }

  console.log('\n🎉 Proceso finalizado.');
  console.log('----------------------------------------');
  console.log('Credenciales para Google Review:');
  console.log(`User: ${TEST_USER.email}`);
  console.log(`Pass: ${TEST_USER.password}`);
  console.log('----------------------------------------');
}

function generateSqlScript(userId, email) {
    const sql = `
-- EJECUTAR EN EDITOR SQL DE SUPABASE DASHBOARD
-- Para usuario: ${email}
UPDATE public.profiles
SET 
  kyc = 'verified',
  onboarding = 'complete',
  id_verified = true,
  email_verified = true,
  phone_verified = true,
  driver_license_status = 'approved', -- Asegurando campo si existe
  role = 'renter'
WHERE id = '${userId}';

-- Asegurar confirmación de email en Auth
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = '${userId}';
`;
    console.log('\n⬇️ COPIA Y EJECUTA ESTE SQL EN SUPABASE: ⬇️');
    console.log(sql);
}

main();
