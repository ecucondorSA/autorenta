import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Creando usuario de test en Supabase...\n');

try {
  // Crear usuario con Admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'renter.test@autorenta.com',
    password: 'TestRenter123!',
    email_confirm: true,
    user_metadata: {
      role: 'locatario',
      created_for: 'e2e-testing'
    }
  });

  if (error) {
    console.error('❌ Error al crear usuario:', error.message);
    
    if (error.message.includes('already registered')) {
      console.log('\n⚠️  El usuario ya existe. Intentando verificar...\n');
      
      // Intentar login
      const supabaseClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU');
      
      const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
        email: 'renter.test@autorenta.com',
        password: 'TestRenter123!'
      });
      
      if (loginData?.user) {
        console.log('✅ Usuario verificado exitosamente!');
        console.log(`   Email: ${loginData.user.email}`);
        console.log(`   User ID: ${loginData.user.id}`);
        console.log(`   Email confirmado: ${loginData.user.email_confirmed_at ? 'Sí' : 'No'}`);
      } else {
        console.log('❌ No se pudo verificar el usuario existente.');
      }
    }
    process.exit(1);
  }

  console.log('✅ Usuario de test creado exitosamente!\n');
  console.log('📧 Credenciales:');
  console.log(`   Email: renter.test@autorenta.com`);
  console.log(`   Password: TestRenter123!`);
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Email confirmado: ${data.user.email_confirmed_at ? 'Sí' : 'No'}\n`);
  
  // Verificar que funciona el login
  console.log('🔐 Verificando login...');
  
  const supabaseClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU');
  
  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: 'renter.test@autorenta.com',
    password: 'TestRenter123!'
  });
  
  if (loginError) {
    console.log('❌ Error en login:', loginError.message);
    process.exit(1);
  }
  
  console.log('✅ Login verificado exitosamente!\n');
  console.log('🎉 Todo listo para ejecutar tests E2E!');
  
} catch (err) {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
}
