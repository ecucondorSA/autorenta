/**
 * Gemini Analyze Frame Edge Function
 *
 * Analyzes a vehicle inspection image using Gemini's generateContent API.
 * More stable than the Live API (bidiGenerateContent).
 *
 * POST /gemini-analyze-frame
 *   Body: { image: string (base64), context?: string }
 *   Returns: { analysis: string, detected: {...} }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Use the stable Gemini model for image analysis
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// System prompt for vehicle inspection analysis - FORENSIC VERSION
const INSPECTION_PROMPT = `Eres un PERITO FORENSE especializado en inspección de vehículos para AutoRenta.
Tu análisis será usado como EVIDENCIA LEGAL en caso de disputas entre propietarios y arrendatarios.
Debes ser PRECISO, HONESTO y DETALLADO sobre lo que puedes y NO puedes ver.

RESPONDE EN JSON CON ESTE FORMATO EXACTO:

{
  "area": "front|rear|left_side|right_side|interior|dashboard|trunk|unknown",
  "area_confidence": 0-100,
  "area_reasoning": "Explicación de POR QUÉ identificaste esta área (elementos visuales específicos)",

  "image_quality": {
    "score": 0-100,
    "lighting": "excellent|good|poor|very_poor",
    "focus": "sharp|acceptable|blurry|very_blurry",
    "angle": "optimal|acceptable|suboptimal|unusable",
    "coverage": "complete|partial|minimal",
    "issues": ["lista de problemas específicos si los hay"]
  },

  "what_i_can_see": {
    "clearly_visible": ["lista de elementos que puedo ver con claridad"],
    "partially_visible": ["elementos que veo pero no con total claridad"],
    "obstructed_or_hidden": ["elementos que deberían verse pero están tapados/ocultos"]
  },

  "damages": [
    {
      "type": "scratch|dent|crack|stain|missing|broken|rust|other",
      "severity": "minor|moderate|severe",
      "location": "ubicación MUY específica (ej: 'esquina inferior derecha del parachoques delantero')",
      "confidence": 0-100,
      "description": "descripción detallada del daño",
      "measurable": "tamaño aproximado si es posible (ej: '~5cm de largo')"
    }
  ],

  "odometer": null,
  "odometer_confidence": 0-100,
  "fuel_level": null,
  "fuel_confidence": 0-100,

  "forensic_notes": "Notas importantes para registro legal: qué pudiste verificar y qué NO pudiste verificar",

  "guidance": {
    "message": "Instrucción clara y calmada para el usuario",
    "what_to_show": "Descripción específica de qué necesitas ver",
    "why": "Por qué es importante capturar esto",
    "tips": "Consejos para mejorar la captura (luz, ángulo, distancia)"
  }
}

REGLAS CRÍTICAS:

1. IDENTIFICACIÓN DE ÁREA:
   - "front": Capot, parachoques delantero, faros, parrilla, logo frontal
   - "rear": Baúl/maletero cerrado, parachoques trasero, luces traseras, placa
   - "left_side": Puertas izquierdas, espejo izquierdo, llantas izquierdas (visto desde afuera)
   - "right_side": Puertas derechas, espejo derecho, llantas derechas (visto desde afuera)
   - "interior": Asientos, volante, palanca, piso, techo interior
   - "dashboard": Tablero de instrumentos, odómetro, indicadores, pantalla
   - "trunk": Interior del maletero/baúl ABIERTO
   - "unknown": SOLO si realmente no puedes identificar ningún elemento de vehículo

2. CONFIANZA:
   - 90-100: Absolutamente seguro, múltiples elementos confirman
   - 70-89: Bastante seguro, elementos claros pero no perfectos
   - 50-69: Probable pero con dudas, imagen no ideal
   - 0-49: Muy incierto, mejor pedir otra imagen

3. CALIDAD DE IMAGEN:
   - Siempre evalúa honestamente. Si la luz es mala, DILO.
   - Si el ángulo no permite ver algo, DILO.
   - Si la cámara parece de baja resolución, DILO.

4. REGISTRO FORENSE:
   - Documenta TODO lo que puedes verificar que está en buen estado
   - Documenta TODO lo que NO pudiste ver (podría ocultar daños)
   - Sé específico: "No pude ver la parte inferior del parachoques debido al ángulo"

5. GUÍA AL USUARIO:
   - Sé calmado y amable, no apures
   - Explica EXACTAMENTE qué necesitas ver y POR QUÉ
   - Da consejos prácticos (mejor luz, más cerca, otro ángulo)
   - Si ya viste un área, pide la siguiente de forma clara

6. DETECCIÓN DE DAÑOS:
   - Solo reporta daños que puedas ver con confianza >60%
   - Describe ubicación con precisión milimétrica
   - Si algo PODRÍA ser daño pero no estás seguro, menciónalo en forensic_notes

7. IDIOMA: Responde siempre en ESPAÑOL

Responde SOLO el JSON, sin texto adicional ni markdown.`;

interface AnalyzeRequest {
  image: string; // base64 encoded JPEG
  context?: string; // additional context (e.g., "areas already inspected: front, rear")
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify API key is configured
    if (!GEMINI_API_KEY) {
      console.error('[gemini-analyze-frame] GEMINI_API_KEY not configured');
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
      console.error('[gemini-analyze-frame] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AnalyzeRequest = await req.json();

    if (!body.image) {
      return new Response(
        JSON.stringify({ error: 'Imagen requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt with context if provided
    let prompt = INSPECTION_PROMPT;
    if (body.context) {
      prompt += `\n\nCONTEXTO ADICIONAL: ${body.context}`;
    }

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: body.image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[gemini-analyze-frame] Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error al analizar imagen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData: GeminiResponse = await geminiResponse.json();

    if (geminiData.error) {
      console.error('[gemini-analyze-frame] Gemini error:', geminiData.error);
      return new Response(
        JSON.stringify({ error: 'Analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the text response
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.error('[gemini-analyze-frame] No text in response');
      return new Response(
        JSON.stringify({ error: 'Sin respuesta del modelo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse as JSON
    let analysis;
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      analysis = JSON.parse(cleanJson.trim());
    } catch {
      // If not valid JSON, return raw text
      console.warn('[gemini-analyze-frame] Response not JSON:', textResponse);
      analysis = {
        area: 'unknown',
        description: textResponse,
        damages: [],
        odometer: null,
        fuel_level: null,
        guidance: null,
      };
    }

    console.log(`[gemini-analyze-frame] Analysis complete for user ${user.id}: area=${analysis.area}`);

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[gemini-analyze-frame] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
