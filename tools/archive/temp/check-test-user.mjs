import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Buscando usuarios de test en Supabase...\n');

// Intentar con varios emails comunes de test
const testEmails = [
  'test-renter@autorenta.com',
  'test@autorenta.com',
  'test@test.com',
  'testing@autorenta.com',
  'testuser@autorenta.com',
  'renter@test.com',
  'test-owner@autorenta.com'
];

console.log('📧 Intentando login con emails de test comunes:\n');

for (const email of testEmails) {
  const passwords = ['TestPassword123!', 'test123', 'password123', '123456'];
  
  for (const password of passwords) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (data?.user) {
        console.log(`✅ ENCONTRADO!`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Email confirmado: ${data.user.email_confirmed_at ? 'Sí' : 'No'}`);
        console.log(`   Creado: ${data.user.created_at}`);
        process.exit(0);
      }
    } catch (e) {
      // Ignorar errores y continuar
    }
  }
}

console.log('❌ No se encontraron usuarios de test con credenciales comunes.\n');
console.log('📝 Necesitas crear el usuario de test manualmente:\n');
console.log('   Email: test-renter@autorenta.com');
console.log('   Password: TestPassword123!\n');
console.log('🔗 Dashboard: https://obxvffplochgeiclibng.supabase.co/project/obxvffplochgeiclibng/auth/users');

process.exit(1);
