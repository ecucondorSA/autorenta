// =============================================
// DYNAMIC PRICING EDGE FUNCTION
// Calculates real-time hourly rates based on:
// - Day of week, Hour of day, User history
// - Supply/Demand ratio, Special events
// =============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

interface PricingRequest {
  region_id: string;
  rental_start: string; // ISO timestamp
  rental_hours: number;
  car_id?: string; // Optional: for car-specific pricing
}

interface PricingResponse {
  price_per_hour: number;
  total_price: number;
  currency: string;
  breakdown: {
    base_price: number;
    day_factor: number;
    hour_factor: number;
    user_factor: number;
    demand_factor: number;
    event_factor: number;
    total_multiplier: number;
  };
  details: {
    user_rentals: number;
    day_of_week: number;
    hour_of_day: number;
  };
  surge_active: boolean;
  surge_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client with user's JWT
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: PricingRequest = await req.json();
    const { region_id, rental_start, rental_hours, car_id } = body;

    // Validate inputs
    if (!region_id || !rental_start || !rental_hours) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: region_id, rental_start, rental_hours' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rental_hours < 1 || rental_hours > 720) {
      return new Response(
        JSON.stringify({ error: 'Rental hours must be between 1 and 720 (30 days)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call RPC function to calculate price
    const { data: pricingData, error: pricingError } = await supabaseClient.rpc(
      'calculate_dynamic_price',
      {
        p_region_id: region_id,
        p_user_id: user.id,
        p_rental_start: rental_start,
        p_rental_hours: rental_hours,
      }
    );

    if (pricingError) {
      console.error('Pricing calculation error:', pricingError);
      return new Response(
        JSON.stringify({ error: 'Failed to calculate pricing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if surge pricing is active
    const totalMultiplier = pricingData.breakdown.total_multiplier;
    const surgeActive = totalMultiplier > 1.15;
    let surgeMessage: string | undefined;

    if (surgeActive) {
      const surgePercent = Math.round((totalMultiplier - 1) * 100);
      if (pricingData.breakdown.demand_factor > 0.15) {
        surgeMessage = `⚡ Alta demanda (+${surgePercent}%) - Reserva ahora antes que suba`;
      } else if (pricingData.breakdown.event_factor > 0) {
        surgeMessage = `🎉 Evento especial - Tarifa ajustada (+${surgePercent}%)`;
      } else {
        surgeMessage = `📈 Hora pico (+${surgePercent}%)`;
      }
    } else if (totalMultiplier < 0.95) {
      const discountPercent = Math.round((1 - totalMultiplier) * 100);
      surgeMessage = `💰 Descuento disponible (-${discountPercent}%) - ¡Aprovecha!`;
    }

    const response: PricingResponse = {
      ...pricingData,
      surge_active: surgeActive,
      surge_message: surgeMessage,
    };

    // Log calculation for audit trail (optional)
    if (car_id) {
      await supabaseClient.from('pricing_calculations').insert({
        user_id: user.id,
        region_id,
        base_price: pricingData.breakdown.base_price,
        day_factor: pricingData.breakdown.day_factor,
        hour_factor: pricingData.breakdown.hour_factor,
        user_factor: pricingData.breakdown.user_factor,
        demand_factor: pricingData.breakdown.demand_factor,
        event_factor: pricingData.breakdown.event_factor,
        final_price: pricingData.price_per_hour,
        calculation_details: pricingData,
      });
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
