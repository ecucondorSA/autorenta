const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllBookings() {
  console.log('🔍 Verificando TODAS las reservas en la BD...\n');
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, car_id, status, start_date, end_date')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Total de reservas: ${bookings.length}\n`);
  
  if (bookings.length === 0) {
    console.log('✅ No hay reservas en la base de datos');
    console.log('\n💡 Esto significa que todos los autos deberían poder eliminarse.');
    console.log('   Si ves el mensaje de error, puede ser un problema de caché o RLS.');
    return;
  }
  
  // Agrupar por car_id
  const byCar = {};
  bookings.forEach(b => {
    if (!byCar[b.car_id]) {
      byCar[b.car_id] = [];
    }
    byCar[b.car_id].push(b);
  });
  
  console.log('Reservas por auto:\n');
  for (const [carId, carBookings] of Object.entries(byCar)) {
    const { data: car } = await supabase
      .from('cars')
      .select('brand, model, year')
      .eq('id', carId)
      .single();
    
    const carName = car ? `${car.brand} ${car.model} ${car.year}` : 'Auto no encontrado';
    console.log(`🚗 ${carName}`);
    console.log(`   Car ID: ${carId.substring(0, 8)}...`);
    console.log(`   Reservas: ${carBookings.length}`);
    carBookings.forEach(b => {
      console.log(`     - ${b.status} | ${b.start_date}`);
    });
    console.log();
  }
}

checkAllBookings().then(() => process.exit(0));
