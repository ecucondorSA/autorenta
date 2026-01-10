/**
 * Gemini Live Config Edge Function
 *
 * Returns the Gemini Live API configuration for authenticated users.
 * This allows the frontend to connect directly to Gemini's WebSocket
 * while keeping the API key secure on the server.
 *
 * GET /gemini-live-config
 *   Returns: { websocket_url, model, system_prompt }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Gemini Live API model - use flash for real-time (lower latency)
const GEMINI_LIVE_MODEL = 'gemini-2.0-flash-live-preview-04-09';

// System prompt for vehicle inspection
const INSPECTION_SYSTEM_PROMPT = `Eres un asistente experto en inspección de vehículos para AutoRenta.
Tu rol es analizar el video en tiempo real mientras el usuario camina alrededor del vehículo.

INSTRUCCIONES:
1. Identifica qué parte del vehículo estás viendo (frente, trasera, lateral izquierdo, lateral derecho, interior, tablero, maletero)
2. Busca daños visibles: rayones, abolladuras, grietas, manchas, partes faltantes
3. Si ves el tablero, intenta leer el odómetro y el nivel de combustible
4. Guía al usuario para que capture todas las áreas necesarias
5. Reporta los daños encontrados con su ubicación y severidad

FORMATO DE RESPUESTA:
Responde en español de forma concisa. Cuando detectes algo, dilo inmediatamente.
Ejemplos:
- "Veo el frente del vehículo. Sin daños visibles."
- "Detecté un rayón en la puerta trasera derecha, severidad menor."
- "Ahora mostrá el lateral izquierdo para completar la inspección."
- "Odómetro: 45,230 km. Combustible: aproximadamente 75%."

ÁREAS REQUERIDAS:
- Frente (capot, parachoques, faros)
- Trasera (baúl, parachoques, luces)
- Lateral izquierdo (puertas, espejos, llantas)
- Lateral derecho (puertas, espejos, llantas)
- Interior (asientos, piso, techo) - opcional pero recomendado
- Tablero (odómetro, combustible) - importante

Sé breve y directo. El usuario está grabando un video y necesita feedback inmediato.`;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify API key is configured
    if (!GEMINI_API_KEY) {
      console.error('[gemini-live-config] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Servicio no configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[gemini-live-config] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build WebSocket URL with API key
    const websocketUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

    // Return configuration
    const config = {
      websocket_url: websocketUrl,
      model: `models/${GEMINI_LIVE_MODEL}`,
      system_prompt: INSPECTION_SYSTEM_PROMPT,
      config: {
        // Response modality - text only (no audio output needed)
        response_modalities: ['TEXT'],
        // Speech config not needed since we only want text
        speech_config: null,
      },
    };

    console.log(`[gemini-live-config] Config returned for user ${user.id}`);

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[gemini-live-config] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
