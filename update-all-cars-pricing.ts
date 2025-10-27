#!/usr/bin/env -S npx tsx

/**
 * Script para actualizar precios de TODOS los autos
 * basado en su value_usd y el tipo de cambio actual
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

interface Car {
  id: string;
  title: string;
  year: number;
  value_usd: number;
  daily_rate_percentage: number;
  price_override_ars: number | null;
  price_per_day: number;
}

async function calculateDailyPriceArs(
  valueUsd: number,
  dailyRatePercentage: number,
  vehicleYear: number,
  fxRate: number
): Promise<number> {
  // Calcular antigüedad
  const currentYear = new Date().getFullYear();
  const age = currentYear - vehicleYear;
  
  // Descuento por antigüedad (5% por año, máximo 30%)
  const ageDiscount = Math.min(age * 0.05, 0.30);
  
  // Tasa base en USD
  const baseRateUsd = valueUsd * dailyRatePercentage;
  
  // Ajustar por antigüedad
  const adjustedRateUsd = baseRateUsd * (1 - ageDiscount);
  
  // Convertir a ARS y redondear
  const dailyRateArs = Math.round(adjustedRateUsd * fxRate);
  
  return dailyRateArs;
}

async function updateAllCarsPricing() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('🔄 Actualizando precios de todos los autos...\n');
  
  try {
    // 1. Obtener tipo de cambio actual
    const { data: fxData, error: fxError } = await supabase
      .from('exchange_rates')
      .select('platform_rate')
      .eq('pair', 'USDTARS')
      .eq('is_active', true)
      .single();
    
    if (fxError || !fxData) {
      throw new Error('No se pudo obtener tipo de cambio actual');
    }
    
    const fxRate = fxData.platform_rate;
    console.log(`💱 Tipo de cambio actual: 1 USD = ${fxRate.toFixed(2)} ARS\n`);
    
    // 2. Obtener todos los autos con value_usd definido y sin override manual
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('id, title, year, value_usd, daily_rate_percentage, price_override_ars, price_per_day')
      .not('value_usd', 'is', null)
      .is('price_override_ars', null)
      .order('value_usd', { ascending: false });
    
    if (carsError) {
      throw new Error(`Error al obtener autos: ${carsError.message}`);
    }
    
    if (!cars || cars.length === 0) {
      console.log('ℹ️  No hay autos para actualizar');
      return;
    }
    
    console.log(`📋 Encontrados ${cars.length} auto(s) para actualizar\n`);
    
    // 3. Actualizar cada auto
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const car of cars as Car[]) {
      try {
        const dailyRatePercentage = car.daily_rate_percentage || 0.003;
        
        const newPrice = await calculateDailyPriceArs(
          car.value_usd,
          dailyRatePercentage,
          car.year,
          fxRate
        );
        
        const oldPrice = car.price_per_day;
        const difference = newPrice - oldPrice;
        const percentChange = ((difference / oldPrice) * 100).toFixed(1);
        
        console.log(`${car.title}`);
        console.log(`  Valor: $${car.value_usd.toLocaleString()} USD`);
        console.log(`  Porcentaje: ${(dailyRatePercentage * 100).toFixed(2)}%`);
        console.log(`  Precio anterior: ${oldPrice.toLocaleString()} ARS/día`);
        console.log(`  Precio nuevo: ${newPrice.toLocaleString()} ARS/día`);
        console.log(`  Cambio: ${difference > 0 ? '+' : ''}${difference.toLocaleString()} ARS (${percentChange}%)`);
        
        // Actualizar en base de datos
        const { error: updateError } = await supabase
          .from('cars')
          .update({
            price_per_day: newPrice,
            last_price_update: new Date().toISOString(),
          })
          .eq('id', car.id);
        
        if (updateError) {
          throw new Error(`Error al actualizar: ${updateError.message}`);
        }
        
        console.log(`  ✅ Actualizado\n`);
        updatedCount++;
        
      } catch (error) {
        console.error(`  ❌ Error: ${error}\n`);
        errorCount++;
      }
    }
    
    // 4. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));
    console.log(`Total autos procesados: ${cars.length}`);
    console.log(`✅ Actualizados: ${updatedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`💱 Tipo de cambio usado: ${fxRate.toFixed(2)} ARS/USD`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  }
}

// Ejecutar
updateAllCarsPricing()
  .then(() => {
    console.log('\n✨ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
