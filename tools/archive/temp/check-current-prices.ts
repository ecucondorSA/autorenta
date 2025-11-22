#!/usr/bin/env -S npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function checkPrices() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const { data: cars } = await supabase
    .from('cars')
    .select('title, price_per_day, currency')
    .order('price_per_day', { ascending: false });
  
  console.log('PRECIOS ACTUALES EN LA DB:\n');
  console.log('='.repeat(80));
  
  cars?.forEach(car => {
    const priceUsd = car.currency === 'ARS' ? car.price_per_day / 1745.64 : car.price_per_day;
    console.log(`${car.title.padEnd(45)} | ${car.price_per_day.toLocaleString().padStart(10)} ${car.currency}/día | ~$${priceUsd.toFixed(2)} USD/día`);
  });
  
  console.log('='.repeat(80));
}

checkPrices();
