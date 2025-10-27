#!/usr/bin/env -S npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function fixCruzePrices() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('🔧 Corrigiendo precios del Cruze...\n');
  
  // Obtener Cruze
  const { data: cars, error: fetchError } = await supabase
    .from('cars')
    .select('id, title, price_per_day, currency')
    .ilike('model', '%cruze%');
    
  if (fetchError) {
    console.error('Error:', fetchError);
    return;
  }
  
  console.log(`Encontrados ${cars.length} auto(s) Cruze\n`);
  
  for (const car of cars) {
    const oldPrice = car.price_per_day;
    // Si el precio es menor a 1000, multiplicar por 1000 (asumir error de entrada)
    const newPrice = oldPrice < 1000 ? oldPrice * 1000 : oldPrice;
    
    if (newPrice !== oldPrice) {
      console.log(`Actualizando: ${car.title}`);
      console.log(`  Precio anterior: ${oldPrice} ${car.currency}/día`);
      console.log(`  Precio nuevo: ${newPrice} ${car.currency}/día`);
      
      const { error: updateError } = await supabase
        .from('cars')
        .update({ price_per_day: newPrice })
        .eq('id', car.id);
        
      if (updateError) {
        console.error(`  ❌ Error: ${updateError.message}`);
      } else {
        console.log(`  ✅ Actualizado correctamente\n`);
      }
    } else {
      console.log(`${car.title}: Precio OK (${oldPrice} ${car.currency}/día)\n`);
    }
  }
  
  console.log('✨ Proceso completado');
}

fixCruzePrices();
