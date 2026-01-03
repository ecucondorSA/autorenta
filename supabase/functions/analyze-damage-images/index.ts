/**
 * Analyze Damage Images Edge Function
 *
 * Uses Gemini 3 Flash Vision to compare check-in vs check-out vehicle images
 * and detect any new damages that occurred during the rental period.
 *
 * POST /analyze-damage-images
 *   Body: { check_in_image_url, check_out_image_url, pair_index, booking_id? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface AnalyzeDamageRequest {
  check_in_image_url: string;
  check_out_image_url: string;
  pair_index?: number;
  booking_id?: string;
}

interface DetectedDamage {
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  confidence: string;
  location?: string;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

interface AnalyzeDamageResponse {
  success: boolean;
  damages: DetectedDamage[];
  summary?: string;
  error?: string;
}

// ============================================================================
// GEMINI 3 FLASH CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// System prompt for damage analysis
const DAMAGE_ANALYSIS_PROMPT = `Eres un experto en inspección de vehículos. Tu tarea es comparar dos imágenes del mismo vehículo:
- IMAGEN 1: Foto de check-in (estado inicial del vehículo)
- IMAGEN 2: Foto de check-out (estado después del alquiler)

Debes detectar SOLO daños NUEVOS que aparecen en la imagen de check-out pero NO estaban en la imagen de check-in.

Para cada daño nuevo detectado, proporciona:
1. type: Tipo de daño (scratch, dent, broken_glass, tire_damage, interior, missing_item, other)
2. description: Descripción detallada del daño en español
3. severity: Nivel de severidad (minor, moderate, severe)
4. confidence: Nivel de confianza de 0.0 a 1.0
5. location: Ubicación en el vehículo (ej: "puerta delantera izquierda", "parabrisas", "llanta trasera derecha")

IMPORTANTE:
- Si NO hay daños nuevos, responde con un array vacío
- Ignora diferencias de iluminación, ángulo o suciedad menor
- Solo reporta daños estructurales o cosméticos significativos
- Sé conservador: solo reporta daños que puedas confirmar con alta confianza

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "damages": [
    {
      "type": "scratch",
      "description": "Rayón de 15cm en la puerta trasera derecha",
      "severity": "moderate",
      "confidence": "0.85",
      "location": "puerta trasera derecha"
    }
  ],
  "summary": "Se detectó 1 daño nuevo: un rayón moderado en la puerta trasera derecha."
}

Si no hay daños nuevos:
{
  "damages": [],
  "summary": "No se detectaron daños nuevos en el vehículo."
}`;

// ============================================================================
// IMAGE HELPERS
// ============================================================================

/**
 * Fetches an image and converts it to base64
 */
async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return {
      base64,
      mimeType: contentType.split(';')[0],
    };
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// ============================================================================
// GEMINI 3 FLASH VISION API
// ============================================================================

async function analyzeImagesWithGemini(
  checkInImageUrl: string,
  checkOutImageUrl: string
): Promise<{ damages: DetectedDamage[]; summary: string }> {
  // Convert images to base64
  console.log('[Gemini Vision] Fetching images...');
  const [checkInImage, checkOutImage] = await Promise.all([
    imageUrlToBase64(checkInImageUrl),
    imageUrlToBase64(checkOutImageUrl),
  ]);

  if (!checkInImage || !checkOutImage) {
    throw new Error('Failed to fetch one or both images');
  }

  console.log('[Gemini Vision] Images fetched, calling Gemini 3 Flash...');

  // Build the request with vision capabilities
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: DAMAGE_ANALYSIS_PROMPT },
          {
            text: 'IMAGEN 1 (Check-in - Estado inicial):',
          },
          {
            inlineData: {
              mimeType: checkInImage.mimeType,
              data: checkInImage.base64,
            },
          },
          {
            text: 'IMAGEN 2 (Check-out - Estado después del alquiler):',
          },
          {
            inlineData: {
              mimeType: checkOutImage.mimeType,
              data: checkOutImage.base64,
            },
          },
          {
            text: 'Analiza las diferencias y proporciona el JSON con los daños nuevos detectados:',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini Vision] Error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Gemini Vision] Response received');

  // Extract text from response
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    ?.map((p: any) => p.text)
    ?.join('');

  if (!textContent) {
    console.error('[Gemini Vision] No text in response');
    return { damages: [], summary: 'No se pudo analizar las imágenes' };
  }

  // Parse JSON from response
  try {
    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = textContent;
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find JSON object directly
      const objMatch = textContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);
    return {
      damages: parsed.damages || [],
      summary: parsed.summary || 'Análisis completado',
    };
  } catch (parseError) {
    console.error('[Gemini Vision] JSON parse error:', parseError);
    console.error('[Gemini Vision] Raw text:', textContent);
    return { damages: [], summary: 'Error al parsear respuesta del análisis' };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify API key is configured
    if (!GEMINI_API_KEY) {
      console.error('[analyze-damage-images] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          damages: [],
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: AnalyzeDamageRequest = await req.json();
    const { check_in_image_url, check_out_image_url, pair_index, booking_id } = payload;

    // Validate required fields
    if (!check_in_image_url || !check_out_image_url) {
      return new Response(
        JSON.stringify({
          success: false,
          damages: [],
          error: 'Se requieren check_in_image_url y check_out_image_url',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[analyze-damage-images] Analyzing pair ${pair_index || 1}...`);

    // Analyze images with Gemini 3 Flash Vision
    const { damages, summary } = await analyzeImagesWithGemini(
      check_in_image_url,
      check_out_image_url
    );

    console.log(`[analyze-damage-images] Found ${damages.length} damages`);

    // If booking_id provided, save results to database
    if (booking_id && damages.length > 0) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        await supabase.from('damage_analysis_logs').insert({
          booking_id,
          pair_index: pair_index || 1,
          check_in_image_url,
          check_out_image_url,
          damages_detected: damages,
          summary,
          analyzed_at: new Date().toISOString(),
          model_used: GEMINI_MODEL,
        });

        console.log('[analyze-damage-images] Results saved to database');
      } catch (dbError) {
        // Log but don't fail - table might not exist yet
        console.warn('[analyze-damage-images] Could not save to database:', dbError);
      }
    }

    const response: AnalyzeDamageResponse = {
      success: true,
      damages,
      summary,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[analyze-damage-images] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        damages: [],
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
