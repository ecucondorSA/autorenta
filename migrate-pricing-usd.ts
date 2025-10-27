#!/usr/bin/env -S npx tsx

/**
 * Migración simplificada: Agregar columnas y actualizar valores
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function migrate() {
  console.log('🔧 Migrando a sistema de pricing basado en USD\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    // 1. Actualizar Chevrolet Cruze 2025
    console.log('1. Actualizando Chevrolet Cruze 2025...');
    const { error: e1 } = await supabase
      .from('cars')
      .update({
        value_usd: 18000,
        daily_rate_percentage: 0.0030,
        pricing_strategy: 'standard'
      })
      .ilike('model', '%cruze%')
      .gte('year', 2023);
    if (e1) console.error('Error:', e1);
    else console.log('   ✅ Cruze actualizado\n');
    
    // 2. Actualizar Chevrolet Onix 2023
    console.log('2. Actualizando Chevrolet Onix 2023...');
    const { error: e2 } = await supabase
      .from('cars')
      .update({
        value_usd: 15000,
        daily_rate_percentage: 0.0035,
        pricing_strategy: 'economy'
      })
      .ilike('model', '%onix%');
    if (e2) console.error('Error:', e2);
    else console.log('   ✅ Onix actualizado\n');
    
    // 3. Actualizar Nissan Versa 2021
    console.log('3. Actualizando Nissan Versa 2021...');
    const { error: e3 } = await supabase
      .from('cars')
      .update({
        value_usd: 14000,
        daily_rate_percentage: 0.0040,
        pricing_strategy: 'economy'
      })
      .ilike('model', '%versa%');
    if (e3) console.error('Error:', e3);
    else console.log('   ✅ Versa actualizado\n');
    
    // 4. Actualizar Renault Sandero Stepway
    console.log('4. Actualizando Renault Sandero Stepway...');
    const { error: e4 } = await supabase
      .from('cars')
      .update({
        value_usd: 19000,
        daily_rate_percentage: 0.0032,
        pricing_strategy: 'standard'
      })
      .ilike('model', '%sandero%');
    if (e4) console.error('Error:', e4);
    else console.log('   ✅ Sandero actualizado\n');
    
    // 5. Actualizar Hyundai Creta 2022
    console.log('5. Actualizando Hyundai Creta 2022...');
    const { error: e5 } = await supabase
      .from('cars')
      .update({
        value_usd: 25000,
        daily_rate_percentage: 0.0028,
        pricing_strategy: 'standard'
      })
      .ilike('model', '%creta%')
      .eq('year', 2022);
    if (e5) console.error('Error:', e5);
    else console.log('   ✅ Creta 2022 actualizado\n');
    
    // 6. Actualizar Hyundai Creta 2025
    console.log('6. Actualizando Hyundai Creta 2025...');
    const { error: e6 } = await supabase
      .from('cars')
      .update({
        value_usd: 32000,
        daily_rate_percentage: 0.0026,
        pricing_strategy: 'premium'
      })
      .ilike('model', '%creta%')
      .gte('year', 2025);
    if (e6) console.error('Error:', e6);
    else console.log('   ✅ Creta 2025 actualizado\n');
    
    // 7. Verificar resultados
    console.log('📊 Verificando resultados...\n');
    const { data: cars } = await supabase
      .from('cars')
      .select('title, value_usd, daily_rate_percentage, pricing_strategy')
      .not('value_usd', 'is', null)
      .order('value_usd', { ascending: false });
    
    if (cars) {
      console.log('Autos actualizados:');
      console.log('='.repeat(80));
      cars.forEach(car => {
        console.log(`${car.title.padEnd(40)} | $${car.value_usd?.toLocaleString().padStart(8)} USD | ${((car.daily_rate_percentage || 0) * 100).toFixed(2)}% | ${car.pricing_strategy}`);
      });
      console.log('='.repeat(80));
    }
    
    console.log('\n✨ Migración completada exitosamente');
    console.log('\n📌 Siguiente paso: npx tsx update-all-cars-pricing.ts');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
