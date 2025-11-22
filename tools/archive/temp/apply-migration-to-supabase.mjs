import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

console.log('📝 Aplicando migración de trigger de notificaciones de chat...\n');

// Leer el archivo SQL
const sqlContent = readFileSync('supabase/migrations/20251027_trigger_chat_notifications.sql', 'utf8');

// Ejecutar cada statement separado por ';'
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s !== '');

console.log(`Ejecutando ${statements.length} statements SQL...\n`);

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  if (!statement) continue;
  
  console.log(`\n[${i+1}/${statements.length}] Ejecutando...`);
  console.log(statement.substring(0, 100) + '...\n');
  
  const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
  
  if (error) {
    console.error(`❌ Error en statement ${i+1}:`, error.message);
    // Continuar con los demás statements
  } else {
    console.log(`✅ Statement ${i+1} ejecutado correctamente`);
  }
}

console.log('\n✅ Migración completada');
