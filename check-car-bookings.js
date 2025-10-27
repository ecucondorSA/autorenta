const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookings() {
  console.log('🔍 Verificando autos y sus reservas...\n');
  
  // Obtener todos los autos con su conteo de reservas
  const { data: cars, error } = await supabase
    .from('cars')
    .select(`
      id,
      brand,
      model,
      year,
      owner_id,
      status
    `)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Encontrados ${cars.length} autos\n`);
  
  for (const car of cars) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, start_date, end_date')
      .eq('car_id', car.id);
    
    const bookingCount = bookings?.length || 0;
    const activeBookings = bookings?.filter(b => 
      ['pending', 'confirmed', 'in_progress'].includes(b.status)
    ) || [];
    
    const icon = bookingCount > 0 ? '🔒' : '✅';
    const canDelete = bookingCount === 0 ? 'SÍ' : 'NO';
    
    console.log(`${icon} ${car.brand} ${car.model} ${car.year}`);
    console.log(`   ID: ${car.id.substring(0, 8)}...`);
    console.log(`   Status: ${car.status}`);
    console.log(`   Reservas totales: ${bookingCount}`);
    console.log(`   Reservas activas: ${activeBookings.length}`);
    console.log(`   ¿Se puede eliminar?: ${canDelete}`);
    
    if (bookingCount > 0) {
      console.log(`   Reservas:`);
      bookings.forEach(b => {
        console.log(`     - ${b.status} (${b.start_date})`);
      });
    }
    console.log();
  }
  
  console.log('\n💡 Leyenda:');
  console.log('   🔒 = No se puede eliminar (tiene reservas)');
  console.log('   ✅ = Se puede eliminar (sin reservas)');
}

checkBookings().then(() => process.exit(0));
