#!/usr/bin/env -S npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

async function fixPair() {
  console.log('🔧 Corrigiendo par de monedas en exchange_rates...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // 1. Verificar qué pares existen
  const { data: existing } = await supabase
    .from('exchange_rates')
    .select('pair, is_active, last_updated')
    .order('last_updated', { ascending: false })
    .limit(5);
  
  console.log('Pares existentes:');
  console.table(existing);
  
  // 2. Desactivar cualquier par que NO sea USDTARS
  const { error: deactivateError } = await supabase
    .from('exchange_rates')
    .update({ is_active: false })
    .neq('pair', 'USDTARS')
    .eq('is_active', true);
  
  if (deactivateError) {
    console.error('Error desactivando pares incorrectos:', deactivateError);
  } else {
    console.log('\n✅ Desactivados todos los pares que NO son USDTARS');
  }
  
  // 3. Verificar si existe USDTARS activo
  const { data: arsRate, error: arsError } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('pair', 'USDTARS')
    .eq('is_active', true)
    .maybeSingle();
  
  if (arsRate) {
    console.log('\n✅ Par USDTARS ya existe y está activo');
    console.log(`   Tasa: ${arsRate.platform_rate} ARS/USD`);
    console.log(`   Última actualización: ${arsRate.last_updated}`);
  } else {
    console.log('\n⚠️  No hay par USDTARS activo, ejecutá update-exchange-rate.ts');
  }
  
  // 4. Estado final
  const { data: final } = await supabase
    .from('exchange_rates')
    .select('pair, is_active, platform_rate')
    .eq('is_active', true);
  
  console.log('\n📊 Estado final (solo activos):');
  console.table(final);
}

fixPair().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
