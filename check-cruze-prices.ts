#!/usr/bin/env -S npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function checkCruzePrices() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { data, error } = await supabase
    .from('cars')
    .select('id, brand, model, title, price_per_day, currency, region_id')
    .ilike('model', '%cruze%')
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Autos Cruze encontrados:\n');
  data.forEach((car: any) => {
    console.log(`${car.title}`);
    console.log(`  Precio: ${car.price_per_day} ${car.currency}/día`);
    console.log(`  Region ID: ${car.region_id || 'N/A'}`);
    console.log(`  Car ID: ${car.id}\n`);
  });
}

checkCruzePrices();
