
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { detectPlatesHandler } from "./handlers/detect-plates.ts";
import { recognizeVehicleHandler } from "./handlers/recognize-vehicle.ts";
import { validateQualityHandler } from "./handlers/validate-quality.ts";

console.log("[ai-vision-service] Service initialized");

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Router Logic
  const url = new URL(req.url);
  // Remove the base function path to get the "route"
  // If the function is deployed as "ai-vision-service", the path is /ai-vision-service/route
  // But locally or via invocation it might differ.
  // We'll look at the last part of the path or specific matches.

  // Supabase Functions paths usually look like: /functions/v1/ai-vision-service/detect-plates
  // So we check for the suffix.
  const path = url.pathname;

  console.log(`[ai-vision-service] Request: ${req.method} ${path}`);

  let response: Response;

  try {
    switch (true) {
      case path.endsWith("/detect-plates") && req.method === "POST":
        response = await detectPlatesHandler(req);
        break;

      case path.endsWith("/recognize-vehicle") && req.method === "POST":
        response = await recognizeVehicleHandler(req);
        break;

      case path.endsWith("/validate-quality") && req.method === "POST":
        response = await validateQualityHandler(req);
        break;
      
      // Fallback for root path check (health check)
      case path.endsWith("/ai-vision-service") && req.method === "GET":
         response = new Response(JSON.stringify({ status: "online", service: "ai-vision-service" }), {
           headers: { "Content-Type": "application/json" }
         });
         break;

      default:
        console.warn(`[ai-vision-service] Route not found: ${path}`);
        response = new Response(
          JSON.stringify({ error: "Route not found", path }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[ai-vision-service] Unhandled Error:", error);
    response = new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Attach CORS to Response
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value as string);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
});
