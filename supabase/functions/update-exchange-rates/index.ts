import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';


interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

/**
 * Edge Function: Update Exchange Rates
 *
 * Actualiza las tasas de cambio desde Binance API cada hora (vía cron job)
 *
 * Características:
 * - Consulta precio USDT/ARS desde Binance spot market
 * - Calcula platform_rate con margen del 20%
 * - Inserta nueva tasa en exchange_rates table
 * - Desactiva tasas anteriores (is_active = false)
 * - Calcula volatilidad comparando con tasa anterior
 *
 * Configuración de Cron:
 * - Supabase Dashboard → Edge Functions → update-exchange-rates
 * - Cron schedule: "0 * * * *" (cada hora en punto)
 *
 * Invocación manual:
 * curl -X POST https://[project-ref].supabase.co/functions/v1/update-exchange-rates \
 *   -H "Authorization: Bearer [anon-key]"
 */

serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🔄 Iniciando actualización de cotización desde Binance...');

    // 1. Obtener tasa actual de Binance
    const binanceResponse = await fetch(
      'https://api.binance.com/api/v3/ticker/price?symbol=USDTARS'
    );

    if (!binanceResponse.ok) {
      throw new Error(`Binance API error: ${binanceResponse.status}`);
    }

    const binanceData: BinanceTickerResponse = await binanceResponse.json();
    const binanceRate = parseFloat(binanceData.price);

    if (isNaN(binanceRate) || binanceRate <= 0) {
      throw new Error(`Invalid rate from Binance: ${binanceData.price}`);
    }

    console.log(`✅ Tasa de Binance: 1 USD = ${binanceRate} ARS`);

    // 2. Calcular platform_rate con margen configurable desde variable de entorno
    // Default: 10% si no está definida la variable
    const marginPercent = parseFloat(Deno.env.get('PLATFORM_MARGIN_PERCENT') || '10.0');
    const platformRate = Math.round(binanceRate * (1 + marginPercent / 100) * 100) / 100;
    const marginAbsolute = Math.round((platformRate - binanceRate) * 100) / 100;

    console.log(
      `💰 Platform rate (con ${marginPercent}% margen): 1 USD = ${platformRate} ARS (margen: ${marginAbsolute} ARS)`
    );

    // 3. Conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Obtener tasa anterior para calcular volatilidad
    const { data: previousRate } = await supabase
      .from('exchange_rates')
      .select('binance_rate, rate')
      .eq('pair', 'USDTARS')
      .eq('is_active', true)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    let volatility24h = null;
    if (previousRate) {
      const prevRate = previousRate.binance_rate ?? previousRate.rate;
      const priceDiff = binanceRate - prevRate;
      volatility24h = prevRate > 0 ? Math.round((priceDiff / prevRate) * 10000) / 100 : null; // Porcentaje con 2 decimales
      console.log(`📊 Volatilidad 24h: ${volatility24h}%`);
    }

    // 5. Upsert tasa (unique constraint en pair)
    const { data: newRate, error: insertError } = await supabase
      .from('exchange_rates')
      .upsert({
        pair: 'USDTARS',
        source: 'binance',
        rate: platformRate,
        binance_rate: binanceRate,
        platform_rate: platformRate,
        margin_percent: marginPercent,
        margin_absolute: marginAbsolute,
        volatility_24h: volatility24h,
        is_active: true,
      }, { onConflict: 'pair' })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    console.log('✅ Nueva tasa insertada:', newRate);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exchange rate updated successfully',
        data: {
          pair: 'USDTARS',
          binance_rate: binanceRate,
          platform_rate: platformRate,
          margin_percent: marginPercent,
          margin_absolute: marginAbsolute,
          volatility_24h: volatility24h,
          updated_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error en update-exchange-rates:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
