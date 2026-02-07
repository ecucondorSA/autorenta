
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { getCorsHeaders } from "../_shared/cors.ts";

import { ResendProvider } from "./providers/resend-email.ts";
import { TwilioWhatsAppProvider } from "./providers/twilio-whatsapp.ts";
import { FcmProvider } from "./providers/fcm-push.ts";
import { EmailMessage, WhatsAppMessage, PushMessage } from "./providers/interfaces.ts";

console.log("[communications-service] Initialized");

// Initialize Providers (Lazy or Singleton)
const emailProvider = new ResendProvider();
const whatsAppProvider = new TwilioWhatsAppProvider();
const pushProvider = new FcmProvider();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  // 1. CORS
  let corsHeaders: HeadersInit;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
    corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Auth Check (Optional but recommended)
  // We allow authenticated users or service_role
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // 3. Routing
  const url = new URL(req.url);
  const path = url.pathname; // e.g. /communications-service/email/send

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = await req.json();

    // === EMAIL ROUTE ===
    if (path.endsWith("/email/send")) {
      const { to, subject, html, templateId, data } = body;
      
      let finalHtml = html;
      // TODO: Implement Template Engine here if templateId is present
      // For now, we expect 'html' or simple replacement
      if (templateId) {
          console.log(`[Email] Using template ${templateId}`);
          // Mock template logic
          finalHtml = `<h1>${data?.title || 'Notification'}</h1><p>${data?.message || ''}</p>`; 
      }

      if (!to || !subject || !finalHtml) {
          throw new Error("Missing required email fields (to, subject, html)");
      }

      const result = await emailProvider.sendEmail({ to, subject, html: finalHtml });
      return jsonResponse(result, corsHeaders);
    }

    // === WHATSAPP ROUTE ===
    if (path.endsWith("/whatsapp/send")) {
      const { to, body: msgBody, templateId, data } = body;
      
      let finalBody = msgBody;
      if (templateId) {
          // Simple template logic
          if (templateId === 'otp') finalBody = `🚗 AutoRenta: Tu código es *${data.code}*`;
          if (templateId === 'booking_confirmed') finalBody = `✅ Reserva confirmada: ${data.car} para el ${data.date}.`;
      }

      if (!to || !finalBody) {
          throw new Error("Missing required whatsapp fields (to, body)");
      }

      const result = await whatsAppProvider.sendWhatsApp({ to, body: finalBody });
      return jsonResponse(result, corsHeaders);
    }

    // === PUSH ROUTE ===
    if (path.endsWith("/push/send")) {
        // Can send to 'token' directly OR 'userId' (lookup in DB)
        const { token, userId, title, body: pushBody, data } = body;

        let tokensToSend: string[] = [];

        if (token) {
            tokensToSend = [token];
        } else if (userId) {
            // Lookup tokens for user
            const { data: userTokens } = await supabase
                .from('push_tokens')
                .select('token')
                .eq('user_id', userId)
                .eq('is_active', true);
            
            if (userTokens) tokensToSend = userTokens.map(t => t.token);
        }

        if (tokensToSend.length === 0) {
            return jsonResponse({ success: false, error: "No target tokens found" }, corsHeaders);
        }

        const results = await Promise.all(tokensToSend.map(t => 
            pushProvider.sendPush({ token: t, title, body: pushBody, data })
        ));

        // Aggregate results
        const successCount = results.filter(r => r.success).length;
        return jsonResponse({ 
            success: successCount > 0, 
            sent: successCount, 
            failed: results.length - successCount,
            details: results 
        }, corsHeaders);
    }

    // === DEFAULT ===
    return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error(`[communications-service] Error handling ${path}:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function jsonResponse(data: any, cors: any) {
    return new Response(JSON.stringify(data), {
        status: data.success === false ? 400 : 200,
        headers: { ...cors, "Content-Type": "application/json" }
    });
}
