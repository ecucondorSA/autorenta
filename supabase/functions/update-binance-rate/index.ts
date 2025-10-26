import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Fetching USDT/ARS rate from Binance...')
    
    // Obtener precio de USDT/ARS de Binance P2P
    const binanceResponse = await fetch(
      'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset: 'USDT',
          fiat: 'ARS',
          merchantCheck: true,
          page: 1,
          payTypes: [],
          publisherType: null,
          rows: 10,
          tradeType: 'BUY',
        }),
      }
    )

    if (!binanceResponse.ok) {
      throw new Error(`Binance API error: ${binanceResponse.status}`)
    }

    const binanceData = await binanceResponse.json()
    
    if (!binanceData.data || binanceData.data.length === 0) {
      throw new Error('No data from Binance')
    }

    // Obtener el promedio de los primeros 5 anuncios
    const topAds = binanceData.data.slice(0, 5)
    const avgRate = topAds.reduce((sum: number, ad: any) => sum + parseFloat(ad.adv.price), 0) / topAds.length
    
    console.log(`✅ Binance rate: 1 USD = ${avgRate.toFixed(2)} ARS`)

    // Calcular margen de la plataforma (ejemplo: 3%)
    const platformMargin = 0.03
    const platformRate = avgRate * (1 + platformMargin)
    
    // Calcular volatilidad (diferencia entre el precio más alto y más bajo)
    const prices = topAds.map((ad: any) => parseFloat(ad.adv.price))
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const volatility = ((maxPrice - minPrice) / avgRate) * 100

    // Guardar en Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert({
        pair: 'USDT/ARS',
        source: 'binance_p2p',
        binance_rate: avgRate,
        platform_rate: platformRate,
        margin_percent: platformMargin * 100,
        margin_absolute: platformRate - avgRate,
        volatility_24h: volatility,
        last_updated: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'pair',
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    console.log('✅ Exchange rate updated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        pair: 'USDT/ARS',
        binance_rate: avgRate,
        platform_rate: platformRate,
        margin_percent: platformMargin * 100,
        volatility_24h: volatility,
        updated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
