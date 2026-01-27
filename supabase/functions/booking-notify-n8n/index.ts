// ============================================
// EDGE FUNCTION: booking-notify-n8n
// Propósito: Notificar a n8n cuando cambia el status de un booking
// Llamado por: Database trigger on bookings table
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

interface BookingChangePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
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
    const oldStatus = payload.old_record?.status;
    const newStatus = payload.record?.status;

    if (oldStatus === newStatus) {
      console.log('[Booking Notify n8n] Status unchanged, skipping');
      return new Response(JSON.stringify({ skipped: true, reason: 'status_unchanged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Booking Notify n8n] Status changed: ${oldStatus} -> ${newStatus}`);

    // Llamar al webhook de n8n
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.text();
    console.log('[Booking Notify n8n] n8n response:', response.status, result);

    return new Response(JSON.stringify({
      success: true,
      n8nStatus: response.status,
      oldStatus,
      newStatus
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Booking Notify n8n] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
