// ============================================
// EDGE FUNCTION: booking-notify-n8n
// Propósito: Notificar a n8n cuando cambia el status de un booking
// Llamado por: Database trigger on bookings table
// Enhanced: Includes enriched data for multi-channel notifications
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

interface BookingChangePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

interface EnrichedBookingPayload {
  event_type: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: string;
  booking: {
    id: string;
    status: string;
    old_status?: string;
    start_date: string;
    end_date: string;
    total_price: number;
    currency: string;
    created_at: string;
  };
  renter: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    notification_preferences?: {
      push: boolean;
      email: boolean;
      whatsapp: boolean;
    };
  } | null;
  owner: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    notification_preferences?: {
      push: boolean;
      email: boolean;
      whatsapp: boolean;
    };
  } | null;
  car: {
    id: string;
    brand: string;
    model: string;
    year: number;
    plate?: string;
    photo_url?: string;
  } | null;
  template_code: string;
  channels: {
    renter: ('push' | 'email' | 'whatsapp')[];
    owner: ('push' | 'email' | 'whatsapp')[];
  };
}

// Determine template code based on status transition
function getTemplateCode(oldStatus: string | undefined, newStatus: string): string {
  // New booking
  if (!oldStatus && newStatus === 'pending_payment') {
    return 'booking_created';
  }

  // Status transitions
  const transitions: Record<string, Record<string, string>> = {
    pending_payment: {
      pending_owner_approval: 'payment_completed',
      cancelled: 'booking_cancelled',
    },
    pending_owner_approval: {
      confirmed: 'booking_confirmed',
      cancelled: 'booking_rejected',
    },
    confirmed: {
      in_progress: 'booking_started',
      cancelled: 'booking_cancelled',
    },
    in_progress: {
      pending_return: 'return_reminder',
    },
    pending_return: {
      completed: 'booking_completed',
      dispute: 'dispute_opened',
    },
    dispute: {
      completed: 'dispute_resolved',
    },
  };

  return transitions[oldStatus || '']?.[newStatus] || `status_${newStatus}`;
}

// Determine which channels to use based on template and user preferences
function getNotificationChannels(
  templateCode: string,
  preferences?: { push?: boolean; email?: boolean; whatsapp?: boolean }
): ('push' | 'email' | 'whatsapp')[] {
  const defaultPrefs = { push: true, email: true, whatsapp: false };
  const prefs = { ...defaultPrefs, ...preferences };

  // High priority templates get all channels user has enabled
  const highPriority = [
    'booking_confirmed',
    'booking_started',
    'return_reminder',
    'booking_completed',
    'dispute_opened',
  ];

  // Medium priority - push + email
  const mediumPriority = [
    'payment_completed',
    'booking_cancelled',
    'booking_rejected',
  ];

  const channels: ('push' | 'email' | 'whatsapp')[] = [];

  if (prefs.push) channels.push('push');

  if (highPriority.includes(templateCode)) {
    if (prefs.email) channels.push('email');
    if (prefs.whatsapp) channels.push('whatsapp');
  } else if (mediumPriority.includes(templateCode)) {
    if (prefs.email) channels.push('email');
  }

  return channels;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: BookingChangePayload = await req.json();
    console.log('[Booking Notify n8n] Received:', JSON.stringify(payload, null, 2));

    // URL del webhook de n8n (configurar según ambiente)
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || 'http://host.docker.internal:5678/webhook/booking-status-change';

    // Solo notificar en cambios de status
    const oldStatus = payload.old_record?.status as string | undefined;
    const newStatus = payload.record?.status as string;

    if (oldStatus === newStatus && payload.type !== 'INSERT') {
      console.log('[Booking Notify n8n] Status unchanged, skipping');
      return new Response(JSON.stringify({ skipped: true, reason: 'status_unchanged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Booking Notify n8n] Status changed: ${oldStatus} -> ${newStatus}`);

    // Create Supabase client to fetch related data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bookingId = payload.record.id as string;
    const renterId = payload.record.renter_id as string;
    const ownerId = payload.record.owner_id as string;
    const carId = payload.record.car_id as string;

    // Fetch enriched data in parallel
    const [renterResult, ownerResult, carResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, phone, notification_preferences')
        .eq('id', renterId)
        .single(),
      supabase
        .from('profiles')
        .select('id, email, full_name, phone, notification_preferences')
        .eq('id', ownerId)
        .single(),
      supabase
        .from('cars')
        .select('id, brand, model, year, plate, photos')
        .eq('id', carId)
        .single(),
    ]);

    // Get template code based on status transition
    const templateCode = getTemplateCode(oldStatus, newStatus);

    // Determine channels for each party
    const renterPrefs = renterResult.data?.notification_preferences as { push?: boolean; email?: boolean; whatsapp?: boolean } | undefined;
    const ownerPrefs = ownerResult.data?.notification_preferences as { push?: boolean; email?: boolean; whatsapp?: boolean } | undefined;

    const renterChannels = getNotificationChannels(templateCode, renterPrefs);
    const ownerChannels = getNotificationChannels(templateCode, ownerPrefs);

    // Build enriched payload
    const enrichedPayload: EnrichedBookingPayload = {
      event_type: payload.type,
      timestamp: new Date().toISOString(),
      booking: {
        id: bookingId,
        status: newStatus,
        old_status: oldStatus,
        start_date: payload.record.start_date as string,
        end_date: payload.record.end_date as string,
        total_price: payload.record.total_price as number,
        currency: (payload.record.currency as string) || 'ARS',
        created_at: payload.record.created_at as string,
      },
      renter: renterResult.data
        ? {
            id: renterResult.data.id,
            email: renterResult.data.email,
            full_name: renterResult.data.full_name,
            phone: renterResult.data.phone,
            notification_preferences: renterPrefs,
          }
        : null,
      owner: ownerResult.data
        ? {
            id: ownerResult.data.id,
            email: ownerResult.data.email,
            full_name: ownerResult.data.full_name,
            phone: ownerResult.data.phone,
            notification_preferences: ownerPrefs,
          }
        : null,
      car: carResult.data
        ? {
            id: carResult.data.id,
            brand: carResult.data.brand,
            model: carResult.data.model,
            year: carResult.data.year,
            plate: carResult.data.plate,
            photo_url: carResult.data.photos?.[0] || null,
          }
        : null,
      template_code: templateCode,
      channels: {
        renter: renterChannels,
        owner: ownerChannels,
      },
    };

    console.log('[Booking Notify n8n] Enriched payload:', JSON.stringify(enrichedPayload, null, 2));

    // Call n8n webhook with enriched data
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload),
    });

    const result = await response.text();
    console.log('[Booking Notify n8n] n8n response:', response.status, result);

    return new Response(
      JSON.stringify({
        success: true,
        n8nStatus: response.status,
        oldStatus,
        newStatus,
        templateCode,
        channels: enrichedPayload.channels,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Booking Notify n8n] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
