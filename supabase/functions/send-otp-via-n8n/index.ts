import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  phone: string;
  channel?: "whatsapp" | "sms";
}

/**
 * Edge Function: send-otp-via-n8n
 *
 * Genera OTP y delega el envío a n8n para mejor manejo de:
 * - Fallback WhatsApp → SMS
 * - Logging de entregas
 * - Retry automático
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Usuario no autenticado");
    }

    const { phone, channel = "whatsapp" }: RequestBody = await req.json();

    if (!phone) {
      throw new Error("Teléfono requerido");
    }

    // Generar OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guardar OTP en la base de datos
    const { error: insertError } = await supabaseClient
      .from("phone_otp_codes")
      .upsert({
        user_id: user.id,
        phone,
        code: otp,
        channel,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
      }, {
        onConflict: "user_id,phone",
      });

    if (insertError) {
      console.error("Error saving OTP:", insertError);
      throw new Error("Error al generar código");
    }

    // Llamar a n8n para enviar el mensaje
    const n8nWebhookUrl = Deno.env.get("N8N_OTP_WEBHOOK_URL");
    const n8nWebhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (!n8nWebhookUrl) {
      console.error("N8N_OTP_WEBHOOK_URL not configured");
      throw new Error("Servicio de envío no configurado");
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": n8nWebhookSecret || "",
      },
      body: JSON.stringify({
        phone,
        otp,
        user_id: user.id,
        channel,
      }),
    });

    const n8nResult = await n8nResponse.json();

    if (!n8nResult.success) {
      console.error("n8n delivery failed:", n8nResult);
      // El código está guardado, el usuario puede reintentar
      return new Response(
        JSON.stringify({
          success: true,
          message: "Código generado. Hubo un problema con el envío, intenta de nuevo.",
          fallback: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`OTP sent via ${n8nResult.channel} to ${phone}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: n8nResult.channel === "sms"
          ? "Código enviado por SMS"
          : "Código enviado por WhatsApp",
        channel: n8nResult.channel,
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-otp-via-n8n:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
