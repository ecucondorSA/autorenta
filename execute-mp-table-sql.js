const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLStatements() {
  console.log('🔧 Creando tabla mp_onboarding_states en Supabase...\n');
  
  // Leer el archivo SQL
  const sql = fs.readFileSync('create-mp-onboarding-table.sql', 'utf8');
  
  // Dividir en statements individuales
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Ejecutando ${statements.length} statements SQL...\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    if (statement.length < 10) continue; // Skip very short statements
    
    try {
      const { data, error } = await supabase.rpc('exec', { sql: statement + ';' });
      
      if (error) {
        console.log(`⚠️  Error en statement: ${statement.substring(0, 50)}...`);
        console.log(`   ${error.message}\n`);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.log(`⚠️  Exception: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  
  // Verificar que la tabla existe
  console.log('\n🔍 Verificando tabla mp_onboarding_states...');
  const { data, error } = await supabase
    .from('mp_onboarding_states')
    .select('count')
    .limit(0);
  
  if (error) {
    console.log('❌ La tabla no existe o no es accesible:', error.message);
    console.log('\n📝 Necesitas ejecutar el SQL manualmente en Supabase SQL Editor.');
  } else {
    console.log('✅ Tabla creada y accesible correctamente!');
  }
}

executeSQLStatements()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
