import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';

// Conexión con Transaction Pooler
const connectionString = 'postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

console.log('🔌 Conectando a Supabase con Transaction Pooler...\n');

try {
  await client.connect();
  console.log('✅ Conectado exitosamente\n');

  // Leer el archivo SQL
  const sqlContent = readFileSync('supabase/migrations/20251027_trigger_chat_notifications.sql', 'utf8');
  
  console.log('📝 Aplicando migración...\n');
  
  // Ejecutar el SQL completo
  const result = await client.query(sqlContent);
  
  console.log('✅ Migración aplicada exitosamente\n');
  
  // Verificar que el trigger fue creado
  const checkTrigger = await client.query(`
    SELECT tgname, tgtype 
    FROM pg_trigger 
    WHERE tgname = 'trigger_notify_new_chat_message';
  `);
  
  if (checkTrigger.rows.length > 0) {
    console.log('✅ Trigger verificado:');
    console.log(checkTrigger.rows);
  } else {
    console.log('⚠️  Trigger no encontrado después de la migración');
  }
  
  // Verificar que la función fue creada
  const checkFunction = await client.query(`
    SELECT proname, pronargs 
    FROM pg_proc 
    WHERE proname = 'notify_new_chat_message';
  `);
  
  if (checkFunction.rows.length > 0) {
    console.log('\n✅ Función verificada:');
    console.log(checkFunction.rows);
  } else {
    console.log('\n⚠️  Función no encontrada después de la migración');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nDetalles:', error);
} finally {
  await client.end();
  console.log('\n🔌 Desconectado');
}
