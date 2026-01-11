/**
 * Detect License Plates Edge Function
 *
 * Uses Gemini 2.5 Flash Vision to detect license plates in vehicle photos
 * and optionally blur them for privacy protection.
 *
 * POST /detect-license-plates
 *   Body: { image_url, auto_blur? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface DetectPlatesRequest {
  image_url: string;
  auto_blur?: boolean;
}

interface DetectedPlate {
  text_masked: string;
  confidence: number;
  bounding_box: { x: number; y: number; width: number; height: number };
  country?: 'AR' | 'EC' | 'BR' | 'CL' | 'CO' | 'unknown';
}

interface DetectPlatesResponse {
  success: boolean;
  plates_detected: number;
  plates: DetectedPlate[];
  blurred_image_url?: string;
  warning: boolean;
  error?: string;
}

// ============================================================================
// GEMINI CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PLATE_DETECTION_PROMPT = `Analiza esta imagen y detecta TODAS las placas/patentes de vehículos visibles.

Para cada placa detectada, proporciona:
1. El texto visible (OCULTA los últimos 3 dígitos con ***, ej: "ABC-***" o "AB ***CD")
2. La ubicación en la imagen como porcentaje del ancho/alto total
3. El país probable según el formato

Formatos conocidos de placas:
- Argentina: ABC 123 o AB 123 CD (Mercosur)
- Ecuador: ABC-1234
- Brasil: ABC-1D23 (Mercosur) o ABC-1234
- Chile: BBBB-12 (4 letras, 2 números)
- Colombia: ABC-123

IMPORTANTE:
- Detecta TODAS las placas visibles, incluso las parciales
- Si no hay placas visibles, responde con un array vacío
- Incluye placas de motos, autos, camiones, etc.

Responde ÚNICAMENTE con JSON válido:
{
  "plates_count": número,
  "plates": [
    {
      "text_masked": "ABC-***",
      "bounding_box": {
        "x": 0-100,
        "y": 0-100,
        "width": 0-100,
        "height": 0-100
      },
      "country": "AR|EC|BR|CL|CO|unknown",
      "confidence": 0-100
    }
  ]
}`;

// ============================================================================
// IMAGE HELPERS
// ============================================================================

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string; arrayBuffer: ArrayBuffer } | null> {
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
      arrayBuffer,
    };
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// ============================================================================
// BLUR PROCESSING (Server-side Canvas simulation using ImageMagick-like approach)
// ============================================================================

/**
 * Creates a blurred version of the image with plates obscured
 * Uses a simple approach: draws black rectangles over plate areas
 *
 * NOTE: For production, consider using a proper image processing library
 * or Cloudflare Image Resizing with blur parameter
 */
async function createBlurredImage(
  originalArrayBuffer: ArrayBuffer,
  plates: DetectedPlate[],
  mimeType: string
): Promise<Blob | null> {
  // For Deno Edge Functions, we'll use a simpler approach:
  // Create an SVG overlay with blur effect and composite it
  // Or use a third-party service

  // For now, we'll return null and let the frontend handle blurring
  // A production implementation would use:
  // 1. Cloudflare Images with blur transformation
  // 2. Sharp library (if Node.js compatible)
  // 3. External image processing API

  console.log('[detect-license-plates] Image blurring delegated to frontend');
  return null;
}

// ============================================================================
// GEMINI VISION ANALYSIS
// ============================================================================

async function detectPlates(imageUrl: string): Promise<{ plates: DetectedPlate[]; error?: string }> {
  console.log('[detect-license-plates] Fetching image...');
  const image = await imageUrlToBase64(imageUrl);

  if (!image) {
    return { plates: [], error: 'No se pudo cargar la imagen' };
  }

  console.log('[detect-license-plates] Calling Gemini Vision...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: PLATE_DETECTION_PROMPT },
          {
            inlineData: {
              mimeType: image.mimeType,
              data: image.base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[detect-license-plates] Gemini error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string }) => p.text)
    ?.map((p: { text: string }) => p.text)
    ?.join('');

  if (!textContent) {
    return { plates: [] };
  }

  // Parse JSON from response
  try {
    console.log('[detect-license-plates] Raw response length:', textContent.length);

    let jsonStr = textContent.trim();

    // Try markdown code block first (with or without 'json' label)
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
      console.log('[detect-license-plates] Found JSON in code block');
    } else {
      // Try to find JSON object directly
      const objMatch = textContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
        console.log('[detect-license-plates] Found JSON object in text');
      }
    }

    // Clean up common issues
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters

    console.log('[detect-license-plates] Parsing JSON:', jsonStr.substring(0, 200) + '...');

    const parsed = JSON.parse(jsonStr);
    return { plates: parsed.plates || [] };
  } catch (parseError) {
    console.error('[detect-license-plates] JSON parse error:', parseError);
    console.error('[detect-license-plates] Raw text:', textContent);
    return { plates: [], error: 'Error al parsear respuesta' };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

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
    if (!GEMINI_API_KEY) {
      console.error('[detect-license-plates] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          plates_detected: 0,
          plates: [],
          warning: false,
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: DetectPlatesRequest = await req.json();
    const { image_url, auto_blur } = payload;

    if (!image_url) {
      return new Response(
        JSON.stringify({
          success: false,
          plates_detected: 0,
          plates: [],
          warning: false,
          error: 'Se requiere image_url',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[detect-license-plates] Detecting plates...');

    const { plates, error } = await detectPlates(image_url);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          plates_detected: 0,
          plates: [],
          warning: false,
          error,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[detect-license-plates] Found ${plates.length} plates`);

    const response: DetectPlatesResponse = {
      success: true,
      plates_detected: plates.length,
      plates,
      warning: plates.length > 0,
    };

    // If auto_blur requested and plates found, provide blur coordinates for frontend
    // The actual blurring is done on frontend for better performance
    if (auto_blur && plates.length > 0) {
      // In a production system, you could:
      // 1. Process the image with blur
      // 2. Upload to storage
      // 3. Return the new URL
      // For now, we return the plate positions for frontend blurring
      console.log('[detect-license-plates] Auto-blur requested, returning plate positions for frontend processing');
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[detect-license-plates] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        plates_detected: 0,
        plates: [],
        warning: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
