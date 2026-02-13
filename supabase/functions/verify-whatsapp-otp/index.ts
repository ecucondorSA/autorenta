import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  phone: string;
  code: string;
}

/**
 * Edge Function: verify-whatsapp-otp
 *
 * Verifica el código OTP enviado por WhatsApp
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
    const { phone, code }: RequestBody = await req.json();

    if (!phone || !code) {
      throw new Error("Teléfono y código requeridos");
    }

    // Validar formato del código
    if (!/^\d{6}$/.test(code)) {
      throw new Error("El código debe tener 6 dígitos");
    }

    // Buscar OTP en la base de datos
    const { data: otpRecord, error: selectError } = await supabaseClient
      .from("phone_otp_codes")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", phone)
      .eq("verified", false)
      .single();

    if (selectError || !otpRecord) {
      throw new Error("No hay código pendiente de verificación");
    }

    // Verificar intentos
    const MAX_ATTEMPTS = 5;
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      throw new Error("Demasiados intentos. Solicita un nuevo código.");
    }

    // Verificar expiración
    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new Error("El código ha expirado. Solicita uno nuevo.");
    }

    // Incrementar intentos
    await supabaseClient
      .from("phone_otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Verificar código
    if (otpRecord.code !== code) {
      const remainingAttempts = MAX_ATTEMPTS - (otpRecord.attempts + 1);
      throw new Error(`Código incorrecto. ${remainingAttempts} intentos restantes.`);
    }

    // Marcar como verificado
    await supabaseClient
      .from("phone_otp_codes")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Actualizar perfil del usuario
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        phone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // No lanzar error, el OTP fue verificado
    }

    // También actualizar user metadata en auth.users
    const { error: authUpdateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      {
        phone,
        phone_confirm: true,
      }
    );

    if (authUpdateError) {
      console.error("Error updating auth user:", authUpdateError);
      // No lanzar error, el OTP fue verificado
    }

    console.log("WhatsApp OTP verified successfully for user:", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        message: "Teléfono verificado exitosamente",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-whatsapp-otp:", error);

    return new Response(
      JSON.stringify({
        success: false,
        verified: false,
        error: "Verification failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
