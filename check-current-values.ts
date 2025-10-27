#!/usr/bin/env -S npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function checkCurrentValues() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('🔍 Verificando valores REALES en la base de datos...\n');
  
  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, title, brand, model, year, value_usd, price_per_day, currency')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Columnas existentes en la tabla cars:');
  if (cars && cars.length > 0) {
    console.log(Object.keys(cars[0]).join(', '));
  }
  
  console.log('\n' + '='.repeat(120));
  console.log('AUTOS EN LA BASE DE DATOS:');
  console.log('='.repeat(120));
  
  cars?.forEach(car => {
    console.log(`${car.title}`);
    console.log(`  ID: ${car.id}`);
    console.log(`  Valor USD (DB): ${car.value_usd || 'NO DEFINIDO'}`);
    console.log(`  Precio actual: ${car.price_per_day} ${car.currency}/día`);
    console.log('');
  });
}

checkCurrentValues();
