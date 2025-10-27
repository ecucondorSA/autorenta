#!/usr/bin/env -S npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function findAbnormalPrices() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('🔍 Buscando autos con precios anormales...\n');
  
  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, title, brand, model, price_per_day, currency, status')
    .eq('currency', 'ARS')
    .order('price_per_day', { ascending: true })
    .limit(50);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total de autos encontrados: ${cars.length}\n`);
  console.log('PRECIOS SOSPECHOSOS (< 5,000 ARS/día):\n');
  
  const suspiciousCars = cars.filter(car => car.price_per_day < 5000);
  
  if (suspiciousCars.length === 0) {
    console.log('✅ No se encontraron precios sospechosos\n');
  } else {
    suspiciousCars.forEach((car: any) => {
      console.log(`${car.title}`);
      console.log(`  Precio actual: ${car.price_per_day} ARS/día (~$${(car.price_per_day / 1745.64).toFixed(2)} USD/día)`);
      console.log(`  Sugerencia: ${car.price_per_day * 1000} ARS/día (~$${((car.price_per_day * 1000) / 1745.64).toFixed(2)} USD/día)`);
      console.log(`  ID: ${car.id}\n`);
    });
    
    console.log(`\n⚠️  Encontrados ${suspiciousCars.length} auto(s) con precios sospechosos`);
    console.log('Ejecuta fix-all-prices.ts para corregirlos automáticamente');
  }
  
  console.log('\n\nPRECIOS NORMALES (> 5,000 ARS/día):\n');
  const normalCars = cars.filter(car => car.price_per_day >= 5000).slice(0, 10);
  normalCars.forEach((car: any) => {
    console.log(`${car.title}: ${car.price_per_day} ARS/día (~$${(car.price_per_day / 1745.64).toFixed(2)} USD/día)`);
  });
}

findAbnormalPrices();
