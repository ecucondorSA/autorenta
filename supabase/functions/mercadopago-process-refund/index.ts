/**
 * Supabase Edge Function: mercadopago-process-refund
 *
 * Procesa reembolsos de MercadoPago (completos o parciales).
 * Integrado con el sistema de cancelaciones de bookings.
 *
 * Flujo:
 * 1. Frontend/Backend llama a esta función con booking_id y tipo de reembolso
 * 2. Obtiene payment_id del booking
 * 3. Calcula monto de reembolso (completo o parcial según penalización)
 * 4. Llama a MercadoPago Refunds API
 * 5. Actualiza booking y wallet con el reembolso
 *
 * Environment Variables Required:
 * - MERCADOPAGO_ACCESS_TOKEN: Access token de Mercado Pago
 * - SUPABASE_URL: URL del proyecto Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Tipos
interface ProcessRefundRequest {
  booking_id: string;
  refund_type: 'full' | 'partial';
  amount?: number;  // Solo para reembolsos parciales
  reason?: string;  // Motivo del reembolso
}

interface RefundPayload {
  amount?: number;
}

serve(async (req: Request) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar variables de entorno
    const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MP_ACCESS_TOKEN_RAW || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const MP_ACCESS_TOKEN = MP_ACCESS_TOKEN_RAW.trim().replace(/[\r\n\t\s]/g, '');

    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar autorización
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Crear cliente de Supabase
    const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener datos del request
    const body: ProcessRefundRequest = await req.json();
    const { booking_id, refund_type, amount, reason } = body;

    if (!booking_id || !refund_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: booking_id, refund_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar refund_type
    if (refund_type !== 'full' && refund_type !== 'partial') {
      return new Response(
        JSON.stringify({ error: 'refund_type must be "full" or "partial"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar amount para reembolsos parciales
    if (refund_type === 'partial' && (!amount || amount <= 0)) {
      return new Response(
        JSON.stringify({ error: 'amount is required for partial refunds' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // OBTENER BOOKING Y PAYMENT_ID
    // ========================================

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, car:cars(owner_id)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar ownership (solo renter, owner, o admin pueden procesar reembolsos)
    const isRenter = booking.renter_id === user.id;
    // Explicit casting to handle potential 'any' type from join if not strictly typed
    const carData = booking.car as unknown as { owner_id: string } | null;
    const isOwner = carData?.owner_id === user.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.is_admin === true;

    if (!isRenter && !isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not have permission to process this refund' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener payment_id del booking
    const paymentId = booking.metadata?.mercadopago_payment_id;
    if (!paymentId) {
      return new Response(
        JSON.stringify({
          error: 'Payment not found for this booking',
          code: 'NO_PAYMENT_ID'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar que el booking esté pagado
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return new Response(
        JSON.stringify({
          error: `Booking is not in a refundable state (current: ${booking.status})`,
          code: 'INVALID_BOOKING_STATUS'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // CALCULAR MONTO DE REEMBOLSO
    // ========================================

    const totalAmount = parseFloat(booking.total_amount?.toString() || '0');
    let refundAmount: number;

    if (refund_type === 'full') {
      refundAmount = totalAmount;
    } else {
      // Validar que amount no sea mayor al total
      if (amount! > totalAmount) {
        return new Response(
          JSON.stringify({ error: 'Refund amount cannot exceed total booking amount' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      refundAmount = amount!;
    }

    // ========================================
    // PROCESAR REEMBOLSO EN MERCADOPAGO
    // ========================================

    console.log(`Processing ${refund_type} refund for booking ${booking_id}:`, {
      payment_id: paymentId,
      total_amount: totalAmount,
      refund_amount: refundAmount,
    });

    const refundData: RefundPayload = {};
    if (refund_type === 'partial') {
      refundData.amount = refundAmount;
    }

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(refundData),
      }
    );

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('MercadoPago Refund API Error:', errorData);

      return new Response(
        JSON.stringify({
          error: 'Failed to process refund in MercadoPago',
          code: 'MP_REFUND_ERROR',
        }),
        {
          status: mpResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const refund = await mpResponse.json();
    console.log('✅ Refund processed successfully:', refund);

    // ========================================
    // ACTUALIZAR BOOKING Y WALLET
    // ========================================

    // Actualizar booking con información del reembolso
    const refundMetadata = {
      ...(booking.metadata || {}),
      refund: {
        id: refund.id,
        amount: refundAmount,
        type: refund_type,
        status: refund.status,
        date_created: refund.date_created,
        reason: reason || 'Booking cancellation',
      },
    };

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        metadata: refundMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      // No fallar, el reembolso ya se procesó en MP
    }

    // Acreditar reembolso al wallet del usuario (si aplica)
    if (refund.status === 'approved' || refund.status === 'refunded') {
      // Crear transacción de reembolso en wallet directamente
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: booking.renter_id,
          type: 'refund',
          amount: refundAmount,
          currency: 'ARS',
          status: 'completed',
          description: `Reembolso por cancelación de reserva ${booking_id}`,
          provider: 'mercadopago',
          provider_transaction_id: refund.id.toString(),
          provider_metadata: {
            booking_id: booking_id,
            payment_id: paymentId,
            refund_id: refund.id,
            refund_type: refund_type,
            reason: reason || 'Booking cancellation',
            refunded_at: refund.date_created,
          },
          completed_at: new Date().toISOString(),
        });

      if (walletError) {
        console.error('Error crediting wallet:', walletError);
        // No fallar, el reembolso ya se procesó en MP
      } else {
        console.log('✅ Refund credited to wallet');

        // Actualizar balance del wallet (trigger debería hacerlo automáticamente, pero por si acaso)
        await supabase.rpc('wallet_get_balance', {
          p_user_id: booking.renter_id,
        });
      }
    }

    // ========================================
    // RETORNAR RESPUESTA
    // ========================================

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          id: refund.id,
          amount: refundAmount,
          type: refund_type,
          status: refund.status,
          date_created: refund.date_created,
        },
        booking_id: booking_id,
        payment_id: paymentId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing refund:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


