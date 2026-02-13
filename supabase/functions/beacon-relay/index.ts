import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// BEACON RELAY EDGE FUNCTION
// AutoRenta Mesh - 2026-01-30
//
// Receives beacon relay data from scouts and:
//   1. Validates the AR-Protocol payload
//   2. Finds or creates a security event
//   3. Records the relay
//   4. Triggers push notifications to the vehicle owner
// ============================================================================

// AR-Protocol constants
const MAGIC_BYTE_1 = 0x41; // 'A'
const MAGIC_BYTE_2 = 0x52; // 'R'
const PAYLOAD_LENGTH = 25;

// Alert type mapping
const ALERT_TYPES: Record<number, string> = {
  0x01: 'SOS',
  0x02: 'THEFT',
  0x03: 'CRASH',
  0x04: 'SILENT',
};

interface BeaconRelayRequest {
  payload: string; // Base64 encoded AR-Protocol payload
  scout_location: {
    latitude: number;
    longitude: number;
  };
  rssi: number;
  device_id: string;
}

interface DecodedBeacon {
  type: string;
  bookingIdHash: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * Decode a base64 payload into AR-Protocol message
 */
function decodePayload(base64Payload: string): DecodedBeacon | null {
  try {
    // Decode base64
    const binary = atob(base64Payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Validate length
    if (bytes.length < PAYLOAD_LENGTH) {
      console.warn('[BeaconRelay] Payload too short:', bytes.length);
      return null;
    }

    // Validate magic bytes
    if (bytes[0] !== MAGIC_BYTE_1 || bytes[1] !== MAGIC_BYTE_2) {
      console.warn('[BeaconRelay] Invalid magic bytes');
      return null;
    }

    // Validate CRC16
    const storedCrc = (bytes[23] << 8) | bytes[24];
    const calculatedCrc = calculateCRC16(bytes.slice(0, 23));
    if (storedCrc !== calculatedCrc) {
      console.warn('[BeaconRelay] CRC mismatch:', storedCrc, 'vs', calculatedCrc);
      return null;
    }

    // Decode fields
    const type = ALERT_TYPES[bytes[2]] || 'SOS';

    // Booking ID Hash (bytes 3-10)
    const hashBytes = bytes.slice(3, 11);
    const bookingIdHash = Array.from(hashBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Latitude (bytes 11-14, Float32)
    const latView = new DataView(bytes.buffer, bytes.byteOffset + 11, 4);
    const latitude = latView.getFloat32(0, false); // Big endian

    // Longitude (bytes 15-18, Float32)
    const lngView = new DataView(bytes.buffer, bytes.byteOffset + 15, 4);
    const longitude = lngView.getFloat32(0, false);

    // Timestamp (bytes 19-22, Uint32)
    const tsView = new DataView(bytes.buffer, bytes.byteOffset + 19, 4);
    const timestamp = tsView.getUint32(0, false);

    return {
      type,
      bookingIdHash,
      latitude,
      longitude,
      timestamp,
    };
  } catch (error) {
    console.error('[BeaconRelay] Decode error:', error);
    return null;
  }
}

/**
 * CRC-16-CCITT calculation
 */
function calculateCRC16(data: Uint8Array): number {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }
  return crc & 0xffff;
}

/**
 * Send push notification to the vehicle owner
 */
async function notifyOwner(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  alertType: string,
  bookingId: string | null,
  carId: string | null
): Promise<void> {
  try {
    // Find the owner to notify
    let ownerId: string | null = null;

    if (carId) {
      const { data: car } = await supabase
        .from('cars')
        .select('owner_id')
        .eq('id', carId)
        .single();
      ownerId = car?.owner_id;
    }

    if (!ownerId && bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('cars(owner_id)')
        .eq('id', bookingId)
        .single();
      ownerId = (booking?.cars as { owner_id: string })?.owner_id;
    }

    if (!ownerId) {
      console.log('[BeaconRelay] No owner found to notify');
      return;
    }

    // Create notification
    const titles: Record<string, string> = {
      SOS: '🚨 Alerta de Emergencia',
      THEFT: '🚗 Alerta de Robo',
      CRASH: '💥 Alerta de Accidente',
      SILENT: '⚠️ Silencio Sospechoso',
    };

    const bodies: Record<string, string> = {
      SOS: 'Se detectó una señal de emergencia de tu vehículo',
      THEFT: 'Se reportó un posible robo de tu vehículo',
      CRASH: 'Se detectó un posible accidente con tu vehículo',
      SILENT: 'Tu vehículo no está respondiendo, verifica su estado',
    };

    await supabase.from('notifications_queue').insert({
      user_id: ownerId,
      template_code: 'security_alert',
      title: titles[alertType] || '🚨 Alerta de Seguridad',
      body: bodies[alertType] || 'Se detectó una señal de seguridad de tu vehículo',
      data: {
        event_id: eventId,
        alert_type: alertType,
        booking_id: bookingId,
        car_id: carId,
      },
      priority: 'critical',
      channels: ['push', 'sms'],
      cta_link: `/security/event/${eventId}`,
    });

    console.log('[BeaconRelay] Notification queued for owner:', ownerId);
  } catch (error) {
    console.error('[BeaconRelay] Failed to notify owner:', error);
  }
}

// Main handler
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: BeaconRelayRequest = await req.json();

    // Validate required fields
    if (!body.payload || !body.scout_location || !body.device_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: payload, scout_location, device_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Decode the AR-Protocol payload
    const beacon = decodePayload(body.payload);
    if (!beacon) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid beacon payload',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[BeaconRelay] Decoded beacon:', beacon);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get scout's user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let scoutId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      scoutId = user?.id ?? null;
    }

    if (!scoutId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process the beacon relay using the database function
    const { data: result, error } = await supabase.rpc('process_beacon_relay', {
      p_booking_id_hash: beacon.bookingIdHash,
      p_alert_type: beacon.type,
      p_source_lat: beacon.latitude,
      p_source_lng: beacon.longitude,
      p_source_timestamp: beacon.timestamp,
      p_scout_id: scoutId,
      p_scout_lat: body.scout_location.latitude,
      p_scout_lng: body.scout_location.longitude,
      p_rssi: body.rssi || -100,
      p_device_id: body.device_id,
    });

    if (error) {
      console.error('[BeaconRelay] Database error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process relay',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[BeaconRelay] Processed:', result);

    // If this is a new event, notify the owner
    if (result?.is_new_event) {
      // Fetch the event to get booking/car details
      const { data: event } = await supabase
        .from('security_events')
        .select('booking_id, car_id')
        .eq('id', result.event_id)
        .single();

      if (event) {
        await notifyOwner(
          supabase,
          result.event_id,
          beacon.type,
          event.booking_id,
          event.car_id
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: result?.event_id,
        is_new_event: result?.is_new_event,
        points_earned: result?.points_earned,
        message: result?.is_new_event
          ? '¡Gracias! Has detectado una nueva emergencia'
          : 'Relay registrado correctamente',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[BeaconRelay] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
