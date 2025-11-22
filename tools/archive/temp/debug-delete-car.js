const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDeleteCar() {
  console.log('🔍 Investigando por qué no se pueden eliminar autos...\n');
  
  // 1. Listar autos existentes
  const { data: cars, error: carsError } = await supabase
    .from('cars')
    .select('id, brand, model, year, owner_id, status')
    .limit(3);
  
  if (carsError) {
    console.log('❌ Error listando autos:', carsError);
    return;
  }
  
  console.log(`📋 Autos en BD: ${cars.length}`);
  cars.forEach(car => {
    console.log(`  - ${car.brand} ${car.model} ${car.year} (${car.id.substring(0,8)}...)`);
    console.log(`    Owner: ${car.owner_id.substring(0,8)}...`);
    console.log(`    Status: ${car.status}`);
  });
  
  if (cars.length === 0) {
    console.log('\n✅ No hay autos para probar');
    return;
  }
  
  const testCar = cars[0];
  console.log(`\n🧪 Probando eliminación del auto: ${testCar.brand} ${testCar.model}`);
  console.log(`   ID: ${testCar.id}`);
  
  // 2. Verificar tablas relacionadas
  console.log('\n🔗 Verificando relaciones en otras tablas...');
  
  const tables = [
    'bookings',
    'car_photos',
    'car_features',
    'reviews'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .eq('car_id', testCar.id);
      
      if (!error && data) {
        const count = data.length;
        if (count > 0) {
          console.log(`  ⚠️  ${table}: ${count} registro(s) relacionado(s)`);
        } else {
          console.log(`  ✅ ${table}: Sin relaciones`);
        }
      }
    } catch (err) {
      console.log(`  ℹ️  ${table}: Tabla no existe o no accesible`);
    }
  }
  
  // 3. Verificar RLS policies
  console.log('\n🔒 Verificando RLS policies en tabla cars...');
  
  const { data: policies, error: policiesError } = await supabase
    .rpc('exec', { 
      sql: `
        SELECT tablename, policyname, cmd, qual 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'cars' AND cmd = 'DELETE';
      `
    });
  
  if (policiesError) {
    console.log('  ℹ️  No se pudo verificar policies (función exec no disponible)');
  } else if (policies && policies.length > 0) {
    console.log(`  📜 Policies DELETE encontradas: ${policies.length}`);
    policies.forEach(p => {
      console.log(`     - ${p.policyname}`);
    });
  } else {
    console.log('  ⚠️  No hay policies DELETE definidas');
  }
  
  // 4. Intentar eliminar (con service key, debería funcionar)
  console.log('\n🗑️  Intentando DELETE con service_role key...');
  
  const { error: deleteError } = await supabase
    .from('cars')
    .delete()
    .eq('id', testCar.id)
    .eq('owner_id', testCar.owner_id);
  
  if (deleteError) {
    console.log('❌ Error al eliminar:', deleteError);
    console.log('   Code:', deleteError.code);
    console.log('   Message:', deleteError.message);
    console.log('   Details:', deleteError.details);
    console.log('   Hint:', deleteError.hint);
  } else {
    console.log('✅ Eliminación exitosa con service key');
    console.log('⚠️  Esto significa que el problema es:');
    console.log('   1. RLS policy para DELETE no permite al owner eliminar');
    console.log('   2. O hay un problema con la autenticación del usuario');
  }
  
  console.log('\n📊 Recomendaciones:');
  console.log('   1. Verificar RLS policies en Supabase Dashboard');
  console.log('   2. Revisar que el owner_id coincida con el user_id autenticado');
  console.log('   3. Verificar foreign keys con ON DELETE CASCADE');
}

debugDeleteCar()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
