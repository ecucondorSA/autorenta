/**
 * Vehicle Location Update Edge Function
 *
 * Receives GPS updates from the mobile app during active rentals.
 * Stores location history and checks geofences for alerts.
 *
 * This is the primary endpoint for continuous vehicle tracking in LATAM
 * where theft and fraud are significant concerns.
 *
 * POST /vehicle-location-update
 *   Body: { booking_id, latitude, longitude, accuracy?, heading?, speed?, battery_level?, ... }
 *
 * Features:
 * - Stores location in vehicle_location_history
 * - Checks geofences and creates alerts if needed
 * - Speed limit monitoring
 * - Battery level tracking
 * - Supports both foreground and background tracking
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// =============================================================================
// TYPES
// =============================================================================

interface LocationUpdateRequest {
  booking_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;  // m/s
  source?: 'app' | 'background' | 'iot_device';
  device_id?: string;
  battery_level?: number;
  is_charging?: boolean;
  network_type?: string;
  timestamp?: string;  // ISO timestamp of when location was captured
}

interface LocationUpdateResponse {
  success: boolean;
  location_id?: string;
  alerts?: Alert[];
  error?: string;
  message?: string;
}

interface Alert {
  type: 'geofence_exit' | 'geofence_enter' | 'speed_limit' | 'low_battery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// ENVIRONMENT
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Constants
const LOW_BATTERY_THRESHOLD = 15;  // Alert when battery < 15%
const SPEED_LIMIT_KMH = 120;       // Default speed limit

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: LocationUpdateRequest = await req.json();
    const {
      booking_id,
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      source = 'app',
      device_id,
      battery_level,
      is_charging,
      network_type,
      timestamp
    } = payload;

    // Validate required fields
    if (!booking_id || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: booking_id, latitude, longitude'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid coordinates'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[vehicle-location-update] Booking ${booking_id}: ${latitude}, ${longitude}`);

    // Create Supabase client with user's auth
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabaseUser
      .from('bookings')
      .select('id, status, renter_id, owner_id, car_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[vehicle-location-update] Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify booking is in progress
    if (booking.status !== 'in_progress') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Booking is not active',
          message: `Booking status is "${booking.status}". Location tracking only available for active rentals.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if tracking is enabled for this booking
    const { data: settings } = await supabase
      .from('booking_tracking_settings')
      .select('*')
      .eq('booking_id', booking_id)
      .single();

    if (settings && !settings.tracking_enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tracking disabled',
          message: 'GPS tracking has been disabled for this booking'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the RPC function to record location and check geofences
    const { data: result, error: rpcError } = await supabase
      .rpc('record_vehicle_location', {
        p_booking_id: booking_id,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: accuracy,
        p_altitude: altitude,
        p_heading: heading,
        p_speed: speed,
        p_source: source,
        p_battery_level: battery_level,
        p_is_charging: is_charging,
        p_network_type: network_type
      });

    if (rpcError) {
      console.error('[vehicle-location-update] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record location' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process alerts from RPC result
    const alerts: Alert[] = [];

    if (result?.alerts && Array.isArray(result.alerts)) {
      for (const alert of result.alerts) {
        if (alert.type === 'geofence_exit') {
          alerts.push({
            type: 'geofence_exit',
            severity: 'warning',
            message: `Vehículo salió de la zona permitida (${alert.geofence_name || 'Zona principal'})`,
            data: { distance_km: alert.distance_km }
          });

          // Send push notification to owner
          await sendAlertNotification(supabase, booking.owner_id, {
            title: '⚠️ Alerta de Geofencing',
            body: `Tu vehículo salió de la zona permitida. Distancia: ${alert.distance_km}km`,
            booking_id
          });
        }

        if (alert.type === 'speed_limit') {
          alerts.push({
            type: 'speed_limit',
            severity: 'warning',
            message: `Velocidad excesiva detectada: ${alert.speed_kmh} km/h (límite: ${alert.limit_kmh} km/h)`,
            data: { speed_kmh: alert.speed_kmh, limit_kmh: alert.limit_kmh }
          });
        }
      }
    }

    // Check battery level
    if (battery_level !== undefined && battery_level < LOW_BATTERY_THRESHOLD && !is_charging) {
      alerts.push({
        type: 'low_battery',
        severity: 'info',
        message: `Batería baja del dispositivo: ${battery_level}%`,
        data: { battery_level }
      });
    }

    const response: LocationUpdateResponse = {
      success: true,
      location_id: result?.location_id,
      alerts: alerts.length > 0 ? alerts : undefined
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vehicle-location-update] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Send push notification for tracking alerts
 */
async function sendAlertNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notification: { title: string; body: string; booking_id: string }
): Promise<void> {
  try {
    // Insert notification record
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'tracking_alert',
      title: notification.title,
      body: notification.body,
      data: { booking_id: notification.booking_id },
      read: false
    });

    // Try to send push notification via Edge Function
    const pushFunctionUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co')}/send-push-notification`;

    await fetch(pushFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        data: { booking_id: notification.booking_id, type: 'tracking_alert' }
      })
    }).catch(err => {
      console.log('[vehicle-location-update] Push notification error (non-fatal):', err);
    });

  } catch (error) {
    console.log('[vehicle-location-update] Notification error (non-fatal):', error);
    // Non-fatal - don't fail the location update
  }
}
