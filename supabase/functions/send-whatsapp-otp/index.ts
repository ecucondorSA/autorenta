import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  phone: string;
  channel: "whatsapp" | "sms";
}

/**
 * Edge Function: send-whatsapp-otp
 *
 * Envía OTP via WhatsApp Business API
 * Alternativa a SMS para LATAM donde WhatsApp tiene mejor delivery
 *
 * Usa Twilio WhatsApp o Meta WhatsApp Business API
 */
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
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

    // Parsear body
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

    // Enviar via WhatsApp (Twilio o Meta API)
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "whatsapp:+14155238886";

    if (twilioAccountSid && twilioAuthToken) {
      // Usar Twilio WhatsApp
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

      const message = `🚗 *AutoRenta* - Tu código de verificación es: *${otp}*\n\nEste código expira en 10 minutos.\nNo compartas este código con nadie.`;

      const formData = new URLSearchParams();
      formData.append("From", twilioWhatsappNumber);
      formData.append("To", `whatsapp:${phone}`);
      formData.append("Body", message);

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        console.error("Twilio error:", errorText);

        // Si falla WhatsApp, el código está guardado y se puede verificar manualmente
        // o el frontend puede hacer fallback a SMS
        return new Response(
          JSON.stringify({
            success: true,
            message: "Código generado. WhatsApp no disponible, usa SMS.",
            fallback: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      console.log("WhatsApp OTP sent successfully to:", phone);
    } else {
      // Si no hay Twilio configurado, simular envío (para desarrollo)
      console.log(`[DEV] WhatsApp OTP for ${phone}: ${otp}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Código enviado por WhatsApp",
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-whatsapp-otp:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Error desconocido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
