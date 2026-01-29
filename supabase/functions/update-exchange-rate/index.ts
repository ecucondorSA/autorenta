// Supabase Edge Function para actualizar tipo de cambio automáticamente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price'
const MARGIN_PERCENT = 20

Deno.serve(async (req) => {
  try {
    console.log('🔄 Actualizando tipo de cambio USD/ARS...')

    const binanceResponse = await fetch(`${BINANCE_API}?symbol=USDTARS`)
    const binanceData = await binanceResponse.json()
    const binanceRate = parseFloat(binanceData.price)
    
    const marginAbsolute = binanceRate * (MARGIN_PERCENT / 100)
    const platformRate = binanceRate + marginAbsolute

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('exchange_rates')
      .update({ is_active: false })
      .eq('pair', 'USDTARS')
      .eq('is_active', true)

    const { data } = await supabaseClient
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
      .single()

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
