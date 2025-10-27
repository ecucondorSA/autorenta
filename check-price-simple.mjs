import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NG_APP_SUPABASE_URL;
const supabaseKey = process.env.NG_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: cars, error } = await supabase
  .from('cars')
  .select('id, title, brand, model, price_per_day, currency, status')
  .eq('status', 'available')
  .limit(5);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log(`📊 Encontrados ${cars?.length || 0} autos:\n`);
  cars?.forEach(car => {
    console.log(`Auto: ${car.title}`);
    console.log(`  - ID: ${car.id}`);
    console.log(`  - Precio/día: ${car.price_per_day} (tipo: ${typeof car.price_per_day})`);
    console.log(`  - Moneda: ${car.currency}`);
    console.log('');
  });
}
