import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.development.local' });

const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCars() {
  const { data: carsWithPhotos } = await supabase
    .from('car_photos')
    .select('car_id');

  const carIdsWithPhotos = new Set(carsWithPhotos?.map(p => p.car_id) || []);

  const { data: allCars } = await supabase
    .from('cars')
    .select('id, brand_text_backup, model_text_backup, year')
    .eq('status', 'active');

  const carsWithoutPhotos = (allCars || []).filter(
    car => !carIdsWithPhotos.has(car.id)
  );

  console.log(`📊 Total autos activos: ${allCars?.length || 0}`);
  console.log(`✅ Autos con fotos: ${carIdsWithPhotos.size}`);
  console.log(`❌ Autos SIN fotos: ${carsWithoutPhotos.length}`);
  console.log(`⏱️  Tiempo estimado: ~${Math.ceil(carsWithoutPhotos.length * 20 / 60)} minutos`);
  
  if (carsWithoutPhotos.length > 0) {
    console.log('\n🚗 Primeros 5 autos sin fotos:');
    carsWithoutPhotos.slice(0, 5).forEach((car, i) => {
      console.log(`  ${i + 1}. ${car.brand_text_backup} ${car.model_text_backup} ${car.year}`);
    });
  }
}

checkCars();
