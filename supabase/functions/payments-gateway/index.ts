
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createBookingPreference } from "./handlers/create-preference.ts";

console.log("[payments-gateway] Service initialized");

serve(async (req: Request) => {
  // 1. CORS Preflight
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

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // === CREATE BOOKING PREFERENCE ===
    if (path.endsWith("/preferences/create")) {
        return await createBookingPreference(req);
    }

    // === HEALTH CHECK ===
    if (path.endsWith("/payments-gateway/health")) {
        return new Response(JSON.stringify({ status: "online", service: "payments-gateway" }), { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }

    return new Response(JSON.stringify({ error: "Route not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error(`[payments-gateway] Error handling ${path}:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
