const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.development.local' });

const supabaseUrl = process.env.NG_APP_SUPABASE_URL;
const supabaseKey = process.env.NG_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCarPrice() {
  console.log('🔍 Verificando precios de autos...\n');
  
  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, title, brand, model, price_per_day, currency, status')
    .eq('status', 'available')
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📊 Encontrados ${cars.length} autos:\n`);
  cars.forEach(car => {
    console.log(`Auto: ${car.title}`);
    console.log(`  - ID: ${car.id}`);
    console.log(`  - Marca: ${car.brand} ${car.model}`);
    console.log(`  - Precio/día: ${car.price_per_day}`);
    console.log(`  - Moneda: ${car.currency}`);
    console.log(`  - Estado: ${car.status}`);
    console.log('');
  });
}

checkCarPrice().catch(console.error);
