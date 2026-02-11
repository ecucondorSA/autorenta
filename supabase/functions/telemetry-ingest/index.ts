import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { device_id, lat, lng, speed, battery, ignition, timestamp } = await req.json();

    if (!device_id || !lat || !lng) {
      throw new Error('Missing required telemetry fields');
    }

    // 1. Buscar el auto asociado a este dispositivo
    // (Asumimos una columna 'gps_device_id' en la tabla cars o una tabla de mapeo)
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, status, owner_id')
      .eq('metadata->>gps_device_id', device_id)
      .single();

    if (carError || !car) {
      console.warn(`[Telemetry] Unknown device: ${device_id}`);
      return new Response(JSON.stringify({ error: 'Device not registered' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Buscar si hay una reserva activa para este auto ahora
    const now = new Date().toISOString();
    const { data: activeBooking } = await supabase
      .from('bookings')
      .select('id, renter_id, status')
      .eq('car_id', car.id)
      .eq('status', 'in_progress')
      .lte('start_time', now)
      .gte('end_time', now)
      .maybeSingle();

    // 3. Insertar telemetría en 'driver_telemetry' si hay booking, 
    // o en 'car_tracking_points' (tabla histórica) si no.
    
    // Usaremos driver_telemetry para análisis de conducción del usuario
    if (activeBooking) {
        const { error: insertError } = await supabase
        .from('driver_telemetry')
        .insert({
            booking_id: activeBooking.id,
            user_id: activeBooking.renter_id,
            car_id: car.id,
            speed: speed ?? 0,
            location: `POINT(${lng} ${lat})`,
            metadata: {
                battery,
                ignition,
                device_id,
                source: 'hardware_iot'
            },
            recorded_at: timestamp || now
        });
        
        if (insertError) console.error('[Telemetry] Error logging driver telemetry:', insertError);
    }

    // 4. Lógica de "Defensa Activa" (Simplificada)
    // Si el auto se mueve sin reserva activa -> ALERTA ROJA
    if (!activeBooking && speed > 10 && ignition) {
        console.error(`[SECURITY ALERT] Car ${car.id} moving without active booking!`);
        // Aquí se dispararía la alerta al dueño o al sistema de recuperación
        await supabase.from('monitoring_alerts').insert({
            type: 'unauthorized_movement',
            severity: 'critical',
            car_id: car.id,
            details: { speed, lat, lng, device_id }
        });
    }

    return new Response(JSON.stringify({ success: true, tracking: !!activeBooking }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process telemetry' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
