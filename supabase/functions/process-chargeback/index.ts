/**
 * @fileoverview Edge Function: process-chargeback
 * @version 1.0.0
 * @date 2026-02-01
 *
 * Procesa chargebacks de MercadoPago:
 * 1. Registra el chargeback en la base de datos
 * 2. Debita automáticamente del FGO del renter
 * 3. Bloquea payouts pendientes
 * 4. Notifica al owner y admin
 * 5. Crea un dispute si es necesario
 *
 * Llamado desde mercadopago-webhook cuando detecta status='charged_back'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createChildLogger } from '../_shared/logger.ts';

declare const Deno: any;

const log = createChildLogger('ProcessChargeback');

interface ChargebackRequest {
  mp_payment_id: string;
  amount: number;
  currency?: string;
  reason?: string;
  mp_status?: string;
  mp_case_id?: string;
  payment_data?: Record<string, any>;
}

interface ProcessResult {
  success: boolean;
  chargeback_id?: string;
  action?: string;
  fgo_amount_cents?: number;
  notifications_sent?: string[];
  error?: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parse request body
    const body: ChargebackRequest = await req.json();

    if (!body.mp_payment_id || !body.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mp_payment_id, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info('Processing chargeback:', {
      mp_payment_id: body.mp_payment_id,
      amount: body.amount,
      reason: body.reason,
    });

    // 1. Call the RPC to process chargeback
    const { data: result, error: rpcError } = await supabase.rpc('process_chargeback', {
      p_mp_payment_id: body.mp_payment_id,
      p_amount_cents: Math.round(body.amount * 100),
      p_mp_reason: body.reason || 'Chargeback received from MercadoPago',
      p_mp_status: body.mp_status || 'opened',
      p_mp_case_id: body.mp_case_id || null,
      p_mp_webhook_data: body.payment_data || {},
    });

    if (rpcError) {
      log.error('RPC error processing chargeback:', rpcError);
      throw rpcError;
    }

    log.info('Chargeback processed:', result);

    const processResult: ProcessResult = {
      success: true,
      chargeback_id: result?.chargeback_id,
      action: result?.action,
      fgo_amount_cents: result?.fgo_amount_cents,
      notifications_sent: [],
    };

    // 2. Get chargeback details for notifications
    const { data: chargeback } = await supabase
      .from('chargebacks')
      .select(`
        *,
        booking:bookings(
          id,
          start_date,
          end_date,
          car:cars(
            id,
            brand,
            model,
            owner_id
          )
        ),
        renter:profiles!chargebacks_renter_id_fkey(
          id,
          full_name,
          email
        ),
        owner:profiles!chargebacks_owner_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', result?.chargeback_id)
      .single();

    // 3. Notify owner via multi-channel
    if (chargeback?.owner_id) {
      try {
        const ownerNotification = await supabase.functions.invoke('notify-multi-channel', {
          body: {
            user_id: chargeback.owner_id,
            event_type: 'chargeback_received',
            title: '⚠️ Contracargo Recibido',
            message: `Se ha recibido un contracargo de ${formatCurrency(body.amount)} por la reserva del ${chargeback.booking?.car?.brand} ${chargeback.booking?.car?.model}. El monto ha sido debitado del FGO del arrendatario.`,
            data: {
              chargeback_id: chargeback.id,
              booking_id: chargeback.booking_id,
              amount: body.amount,
              reason: body.reason,
            },
            channels: ['push', 'email'],
          },
        });

        if (!ownerNotification.error) {
          processResult.notifications_sent?.push('owner');

          // Update chargeback with notification timestamp
          await supabase
            .from('chargebacks')
            .update({ owner_notified_at: new Date().toISOString() })
            .eq('id', chargeback.id);
        }
      } catch (notifyError) {
        log.error('Error notifying owner:', notifyError);
      }
    }

    // 4. Notify admins
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin')
        .limit(5);

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await supabase.functions.invoke('notify-multi-channel', {
            body: {
              user_id: admin.id,
              event_type: 'admin_chargeback_alert',
              title: '🚨 ALERTA: Nuevo Contracargo',
              message: `Contracargo de ${formatCurrency(body.amount)} - Renter: ${chargeback?.renter?.full_name || 'N/A'} - Booking: ${chargeback?.booking_id || 'N/A'}`,
              data: {
                chargeback_id: chargeback?.id,
                booking_id: chargeback?.booking_id,
                renter_id: chargeback?.renter_id,
                amount: body.amount,
                fgo_debited: result?.fgo_amount_cents,
              },
              channels: ['push', 'email'],
            },
          });
        }
        processResult.notifications_sent?.push('admins');

        // Update chargeback with admin notification timestamp
        await supabase
          .from('chargebacks')
          .update({ admin_notified_at: new Date().toISOString() })
          .eq('id', chargeback?.id);
      }
    } catch (adminNotifyError) {
      log.error('Error notifying admins:', adminNotifyError);
    }

    // 5. Create automatic dispute if FGO was insufficient
    if (result?.action === 'insufficient_fgo' && chargeback?.booking_id) {
      try {
        const { data: dispute } = await supabase
          .from('disputes')
          .insert({
            booking_id: chargeback.booking_id,
            opened_by: chargeback.owner_id,
            reason: 'chargeback',
            description: `Contracargo automático de MercadoPago por ${formatCurrency(body.amount)}. El renter no tiene saldo suficiente en FGO para cubrir el monto.`,
            status: 'opened',
            metadata: {
              chargeback_id: chargeback.id,
              mp_payment_id: body.mp_payment_id,
              amount_cents: Math.round(body.amount * 100),
              auto_created: true,
            },
          })
          .select()
          .single();

        if (dispute) {
          // Link dispute to chargeback
          await supabase
            .from('chargebacks')
            .update({ dispute_id: dispute.id, status: 'disputed' })
            .eq('id', chargeback.id);

          processResult.action = 'disputed';
          log.info('Created automatic dispute:', dispute.id);
        }
      } catch (disputeError) {
        log.error('Error creating dispute:', disputeError);
      }
    }

    // 6. Log to chargeback audit trail
    await supabase.from('dispute_timeline').insert({
      dispute_id: chargeback?.dispute_id,
      event_type: 'chargeback_processed',
      body: `Chargeback procesado: ${result?.action}. FGO debitado: ${formatCurrency((result?.fgo_amount_cents || 0) / 100)}`,
      metadata: {
        chargeback_id: chargeback?.id,
        mp_payment_id: body.mp_payment_id,
        result: result,
      },
    }).then(() => {}).catch(() => {}); // Non-blocking

    log.info('Chargeback processing complete:', processResult);

    return new Response(
      JSON.stringify(processResult),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    log.error('Error processing chargeback:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}
