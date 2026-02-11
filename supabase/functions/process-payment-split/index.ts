import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const mercadopagoAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";

interface SplitPaymentRequest {
  paymentIntentId: string;
  bookingId: string;
  totalAmount: number;
  currency: string;
  collectors: {
    userId: string;
    percentage: number;
  }[];
  platformFeePercentage?: number;
}

interface PaymentSplit {
  id: string;
  paymentId: string;
  bookingId: string;
  collectorId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  payoutId?: string;
  createdAt: string;
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Solo permitir POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const request: SplitPaymentRequest = await req.json();

    // 1. Validar request
    const validation = validateSplitPaymentRequest(request);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error, success: false }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener información del payment intent
    const { data: paymentIntent, error: piError } = await supabase
      .from("payment_intents")
      .select("*")
      .eq("id", request.paymentIntentId)
      .single();

    if (piError || !paymentIntent) {
      return new Response(
        JSON.stringify({
          error: "Payment intent not found",
          success: false,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Obtener información del booking
    const { data: booking, error: bError } = await supabase
      .from("bookings")
      .select("*, cars(owner_id)")
      .eq("id", request.bookingId)
      .single();

    if (bError || !booking) {
      return new Response(
        JSON.stringify({
          error: "Booking not found",
          success: false,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const carOwnerId = booking.cars.owner_id;

    // 4. Procesar splits
    const platformFeePercentage = request.platformFeePercentage || 5;
    const splits: PaymentSplit[] = [];
    let totalFee = 0;

    for (const collector of request.collectors) {
      const collectorAmount = (request.totalAmount * collector.percentage) / 100;
      const platformFee = (collectorAmount * platformFeePercentage) / 100;
      const netAmount = collectorAmount - platformFee;
      totalFee += platformFee;

      const split: PaymentSplit = {
        id: generateId(),
        paymentId: request.paymentIntentId,
        bookingId: request.bookingId,
        collectorId: collector.userId,
        amount: collectorAmount,
        platformFee,
        netAmount,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      splits.push(split);
    }

    // 5. Insertar splits en database
    const { error: insertError } = await supabase
      .from("payment_splits")
      .insert(splits);

    if (insertError) {
      console.error("Error inserting splits:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to insert payment splits",
          success: false,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Crear transacciones de billetera para cada split
    for (const split of splits) {
      // Crear transacción
      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: split.collectorId,
          type: "payout",
          status: "pending",
          amount: split.netAmount,
          currency: request.currency,
          reference_type: "payment_split",
          reference_id: split.id,
          provider: "mercadopago_split",
          provider_transaction_id: split.id,
          created_at: new Date().toISOString(),
        });

      if (txError) {
        console.error("Error creating wallet transaction:", txError);
      }

      // Crear entrada en ledger
      const { error: ledgerError } = await supabase
        .from("wallet_ledger")
        .insert({
          user_id: split.collectorId,
          kind: "split_payment",
          amount: split.netAmount,
          currency: request.currency,
          transaction_id: split.id,
          booking_id: split.bookingId,
          meta: {
            split_id: split.id,
            payment_id: split.paymentId,
            platform_fee: split.platformFee,
            percentage: request.collectors.find(
              (c) => c.userId === split.collectorId
            )?.percentage,
          },
          ts: new Date().toISOString(),
        });

      if (ledgerError) {
        console.error("Error creating ledger entry:", ledgerError);
      }
    }

    // 7. Si hay webhook externo, enviar notificaciones
    try {
      await notifyPaymentSplits(splits, request.bookingId, request.totalAmount);
    } catch (notifyError) {
      console.error("Error sending notifications:", notifyError);
      // No fallar si las notificaciones fallan
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment splits processed successfully",
        splits,
        summary: {
          totalAmount: request.totalAmount,
          totalFee,
          netDistributed: splits.reduce((sum, s) => sum + s.netAmount, 0),
          splitCount: splits.length,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        success: false,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Validar request de split payment
 */
function validateSplitPaymentRequest(
  request: SplitPaymentRequest
): { valid: boolean; error?: string } {
  // Validar que existan collectors
  if (!request.collectors || request.collectors.length === 0) {
    return { valid: false, error: "No collectors specified" };
  }

  // Validar que los porcentajes sumen 100
  const totalPercentage = request.collectors.reduce(
    (sum, c) => sum + c.percentage,
    0
  );
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return {
      valid: false,
      error: `Collector percentages must sum to 100, got ${totalPercentage}`,
    };
  }

  // Validar que no haya duplicados
  const uniqueCollectors = new Set(request.collectors.map((c) => c.userId));
  if (uniqueCollectors.size !== request.collectors.length) {
    return { valid: false, error: "Duplicate collectors found" };
  }

  // Validar que amount sea positivo
  if (request.totalAmount <= 0) {
    return { valid: false, error: "Total amount must be greater than 0" };
  }

  return { valid: true };
}

/**
 * Enviar notificaciones a collectors
 */
async function notifyPaymentSplits(
  splits: PaymentSplit[],
  bookingId: string,
  totalAmount: number
) {
  for (const split of splits) {
    // Crear notificación en la base de datos
    await supabase.from("notifications").insert({
      user_id: split.collectorId,
      type: "payment_received",
      title: "Pago recibido",
      description: `Has recibido $${split.netAmount.toFixed(2)} ARS de una renta`,
      metadata: {
        split_id: split.id,
        amount: split.netAmount,
        booking_id: bookingId,
      },
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Enviar mensaje de sistema en booking si es necesario
    const { data: booking } = await supabase
      .from("bookings")
      .select("renter_id, car_id")
      .eq("id", bookingId)
      .single();

    if (booking) {
      await supabase.from("messages").insert({
        sender_id: "00000000-0000-0000-0000-000000000000", // System user
        recipient_id: split.collectorId,
        booking_id: bookingId,
        content: `Pago procesado: $${split.netAmount.toFixed(2)} ARS (tarifa de plataforma: $${split.platformFee.toFixed(2)} ARS)`,
        is_system_message: true,
        created_at: new Date().toISOString(),
      });
    }
  }
}

/**
 * Generar ID único para split
 */
function generateId(): string {
  return `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
