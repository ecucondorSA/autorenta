#!/usr/bin/env -S npx tsx

/**
 * Script para actualizar el tipo de cambio USD/ARS desde Binance
 * Se ejecuta manualmente o mediante cron job
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';
const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';
const MARGIN_PERCENT = 20; // 20% de margen sobre precio Binance

async function getBinanceRate(pair: string): Promise<number> {
  try {
    const response = await fetch(`${BINANCE_API}?symbol=${pair}`);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Error fetching Binance rate for ${pair}:`, error);
    throw error;
  }
}

async function updateExchangeRate() {
  console.log('🔄 Actualizando tipo de cambio USD/ARS...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Obtener cotización de Binance
    const binanceRate = await getBinanceRate('USDTARS');
    console.log(`📊 Tasa Binance: 1 USD = ${binanceRate.toFixed(2)} ARS`);

    // 2. Calcular tasa de plataforma (con margen)
    const marginAbsolute = binanceRate * (MARGIN_PERCENT / 100);
    const platformRate = binanceRate + marginAbsolute;
    console.log(`💰 Tasa Plataforma (+${MARGIN_PERCENT}%): 1 USD = ${platformRate.toFixed(2)} ARS\n`);

    // 3. Desactivar tasas anteriores
    const { error: deactivateError } = await supabase
      .from('exchange_rates')
      .update({ is_active: false })
      .eq('pair', 'USDTARS')
      .eq('is_active', true);

    if (deactivateError) {
      console.error('❌ Error desactivando tasas anteriores:', deactivateError);
    } else {
      console.log('✅ Tasas anteriores desactivadas');
    }

    // 4. Insertar nueva tasa
    const { data, error: insertError } = await supabase
      .from('exchange_rates')
      .insert({
        pair: 'USDTARS',
        source: 'binance',
        binance_rate: binanceRate,
        platform_rate: platformRate,
        margin_percent: MARGIN_PERCENT,
        margin_absolute: marginAbsolute,
        is_active: true,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error insertando nueva tasa: ${insertError.message}`);
    }

    console.log('✅ Nueva tasa insertada correctamente');
    console.log(`📅 Última actualización: ${new Date().toLocaleString()}\n`);
    console.log('Datos guardados:');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('❌ Error actualizando tipo de cambio:', error);
    throw error;
  }
}

// Ejecutar
updateExchangeRate()
  .then(() => {
    console.log('\n✨ Tipo de cambio actualizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
