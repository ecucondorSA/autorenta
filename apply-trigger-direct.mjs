import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: 'public' }
});

console.log('📝 Aplicando trigger de notificaciones de chat...\n');

// Leer el contenido completo
const sqlContent = readFileSync('supabase/migrations/20251027_trigger_chat_notifications.sql', 'utf8');

console.log('📄 Contenido del SQL:');
console.log('─'.repeat(60));
console.log(sqlContent);
console.log('─'.repeat(60));
console.log('\n⚠️  No se puede aplicar automáticamente via API REST');
console.log('\n✅ SOLUCIÓN: Aplicar manualmente en Supabase Dashboard\n');
console.log('1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new');
console.log('2. Copiar el contenido de: supabase/migrations/20251027_trigger_chat_notifications.sql');
console.log('3. Pegar en el editor SQL');
console.log('4. Click en "RUN"\n');

// Verificar si ya existe el trigger
console.log('🔍 Verificando si el trigger ya existe...\n');

const { data, error } = await supabase
  .from('pg_trigger')
  .select('*')
  .eq('tgname', 'trigger_notify_new_chat_message')
  .maybeSingle();

if (error && error.code !== 'PGRST116') {
  console.error('❌ Error verificando trigger:', error);
} else if (data) {
  console.log('✅ El trigger YA EXISTE en la base de datos');
  console.log('Datos:', data);
} else {
  console.log('❌ El trigger NO existe todavía');
  console.log('\n👉 Necesitas aplicarlo manualmente (pasos arriba)');
}
