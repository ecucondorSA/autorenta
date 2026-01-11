/**
 * Recognize Vehicle Edge Function
 *
 * Uses Gemini 2.5 Flash Vision to identify vehicle make, model, year, and color
 * from photos. Can also validate if photos match expected vehicle info.
 *
 * POST /recognize-vehicle
 *   Body: { image_url, image_base64?, validate_against? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface RecognizeVehicleRequest {
  image_url?: string;
  image_base64?: string;
  validate_against?: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
  };
}

interface VehicleRecognition {
  brand: string;
  model: string;
  year_range: [number, number];
  color: string;
  body_type: 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'convertible' | 'wagon' | 'unknown';
  confidence: number;
}

interface ValidationResult {
  matches: boolean;
  brand_match: boolean;
  model_match: boolean;
  color_match: boolean;
  year_match: boolean;
  discrepancies: string[];
}

interface RecognizeVehicleResponse {
  success: boolean;
  vehicle: VehicleRecognition;
  validation?: ValidationResult;
  suggestions: Array<{
    brand: string;
    model: string;
    confidence: number;
  }>;
  error?: string;
}

// ============================================================================
// GEMINI CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VEHICLE_RECOGNITION_PROMPT = `Eres un experto en identificación de vehículos. Analiza esta imagen y determina si hay un vehículo visible.

PRIMERO: ¿Hay un vehículo (auto, camioneta, SUV, pickup) claramente visible en la imagen?
- Si NO hay vehículo o solo se ve parcialmente: confidence = 0
- Si hay vehículo pero borroso/oscuro: confidence = 20-40
- Si hay vehículo visible pero no identificable: confidence = 40-60
- Si puedes identificar marca/modelo: confidence = 60-95

Si hay un vehículo, identifica:
1. MARCA (ej: Toyota, Ford, Chevrolet, Volkswagen, Fiat, Renault, Honda)
2. MODELO (ej: Corolla, F-150, Cruze, Golf, Palio, Sandero, Civic)
3. RANGO DE AÑOS basado en diseño (ej: [2018, 2022])
4. COLOR principal (blanco, negro, gris, rojo, azul, plata, etc.)
5. TIPO DE CARROCERÍA:
   - sedan: 4 puertas con maletero
   - suv: utilitario deportivo alto
   - hatchback: compacto 5 puertas
   - pickup: con caja de carga
   - van: furgoneta/monovolumen
   - coupe: 2 puertas deportivo
   - convertible: descapotable
   - wagon: station wagon
   - unknown: no determinable

MARCAS COMUNES EN LATINOAMÉRICA:
Argentina: Fiat, Volkswagen, Toyota, Ford, Chevrolet, Renault, Peugeot, Citroën
Ecuador: Chevrolet, Kia, Hyundai, Toyota, Nissan, Mazda
Brasil: Fiat, Volkswagen, Chevrolet, Hyundai, Toyota, Honda, Renault

IMPORTANTE: Sé GENEROSO con la confianza si ves claramente un auto, incluso si no estás 100% seguro del modelo exacto. Una detección de "probablemente Toyota" con 60% es mejor que no detectar nada.

Responde ÚNICAMENTE con JSON válido:
{
  "vehicle_detected": true,
  "brand": "Toyota",
  "model": "Corolla",
  "year_range": [2018, 2022],
  "color": "blanco",
  "body_type": "sedan",
  "confidence": 75,
  "alternatives": [
    {"brand": "Honda", "model": "Civic", "confidence": 45}
  ]
}

Si NO hay vehículo visible:
{
  "vehicle_detected": false,
  "brand": "unknown",
  "model": "unknown",
  "year_range": [2000, 2025],
  "color": "unknown",
  "body_type": "unknown",
  "confidence": 0,
  "alternatives": []
}`;

// ============================================================================
// IMAGE HELPERS
// ============================================================================

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
// VALIDATION HELPERS
// ============================================================================

function normalizeString(str: string): string {
  return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function validateVehicle(
  recognized: VehicleRecognition,
  expected: { brand: string; model: string; year?: number; color?: string }
): ValidationResult {
  const discrepancies: string[] = [];

  // Brand match (fuzzy)
  const brandMatch = normalizeString(recognized.brand).includes(normalizeString(expected.brand)) ||
                     normalizeString(expected.brand).includes(normalizeString(recognized.brand));

  if (!brandMatch) {
    discrepancies.push(`Marca: esperado "${expected.brand}", detectado "${recognized.brand}"`);
  }

  // Model match (fuzzy)
  const modelMatch = normalizeString(recognized.model).includes(normalizeString(expected.model)) ||
                     normalizeString(expected.model).includes(normalizeString(recognized.model));

  if (!modelMatch) {
    discrepancies.push(`Modelo: esperado "${expected.model}", detectado "${recognized.model}"`);
  }

  // Color match (if provided)
  let colorMatch = true;
  if (expected.color) {
    colorMatch = normalizeString(recognized.color).includes(normalizeString(expected.color)) ||
                 normalizeString(expected.color).includes(normalizeString(recognized.color));

    if (!colorMatch) {
      discrepancies.push(`Color: esperado "${expected.color}", detectado "${recognized.color}"`);
    }
  }

  // Year match (if provided)
  let yearMatch = true;
  if (expected.year) {
    yearMatch = expected.year >= recognized.year_range[0] && expected.year <= recognized.year_range[1];

    if (!yearMatch) {
      discrepancies.push(`Año: esperado ${expected.year}, detectado rango ${recognized.year_range[0]}-${recognized.year_range[1]}`);
    }
  }

  return {
    matches: brandMatch && modelMatch && colorMatch && yearMatch,
    brand_match: brandMatch,
    model_match: modelMatch,
    color_match: colorMatch,
    year_match: yearMatch,
    discrepancies,
  };
}

// ============================================================================
// GEMINI VISION ANALYSIS
// ============================================================================

async function recognizeVehicle(
  imageBase64: string,
  mimeType: string
): Promise<{ vehicle: VehicleRecognition; suggestions: Array<{ brand: string; model: string; confidence: number }>; error?: string }> {
  console.log('[recognize-vehicle] Calling Gemini Vision...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: VEHICLE_RECOGNITION_PROMPT },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topK: 30,
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
    console.error('[recognize-vehicle] Gemini error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string }) => p.text)
    ?.map((p: { text: string }) => p.text)
    ?.join('');

  if (!textContent) {
    return {
      vehicle: {
        brand: 'Desconocido',
        model: 'Desconocido',
        year_range: [2000, 2025],
        color: 'desconocido',
        body_type: 'unknown',
        confidence: 0,
      },
      suggestions: [],
      error: 'No se pudo analizar la imagen',
    };
  }

  // Parse JSON from response
  try {
    let jsonStr = textContent;
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const objMatch = textContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    return {
      vehicle: {
        brand: parsed.brand || 'Desconocido',
        model: parsed.model || 'Desconocido',
        year_range: parsed.year_range || [2000, 2025],
        color: parsed.color || 'desconocido',
        body_type: parsed.body_type || 'unknown',
        confidence: parsed.confidence || 0,
      },
      suggestions: parsed.alternatives || [],
    };
  } catch (parseError) {
    console.error('[recognize-vehicle] JSON parse error:', parseError);
    console.error('[recognize-vehicle] Raw text:', textContent);
    return {
      vehicle: {
        brand: 'Desconocido',
        model: 'Desconocido',
        year_range: [2000, 2025],
        color: 'desconocido',
        body_type: 'unknown',
        confidence: 0,
      },
      suggestions: [],
      error: 'Error al parsear respuesta',
    };
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
      console.error('[recognize-vehicle] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: RecognizeVehicleRequest = await req.json();
    const { image_url, image_base64, validate_against } = payload;

    // Get image as base64
    let base64: string;
    let mimeType: string;

    if (image_base64) {
      // Extract mime type from data URL if present
      const dataUrlMatch = image_base64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        base64 = dataUrlMatch[2];
      } else {
        mimeType = 'image/jpeg';
        base64 = image_base64;
      }
    } else if (image_url) {
      const imageData = await imageUrlToBase64(image_url);
      if (!imageData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No se pudo cargar la imagen',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      base64 = imageData.base64;
      mimeType = imageData.mimeType;
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere image_url o image_base64',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[recognize-vehicle] Recognizing vehicle...');

    const { vehicle, suggestions, error } = await recognizeVehicle(base64, mimeType);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          vehicle,
          suggestions,
          error,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[recognize-vehicle] Detected: ${vehicle.brand} ${vehicle.model} (${vehicle.confidence}% confidence)`);

    // Build response
    const response: RecognizeVehicleResponse = {
      success: true,
      vehicle,
      suggestions,
    };

    // Validate against expected if provided
    if (validate_against) {
      response.validation = validateVehicle(vehicle, validate_against);
      console.log(`[recognize-vehicle] Validation: ${response.validation.matches ? 'MATCH' : 'MISMATCH'}`);
    }

    // Optionally log to database
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        await supabase.from('vehicle_recognition_logs').insert({
          image_url: image_url || null,
          recognized_brand: vehicle.brand,
          recognized_model: vehicle.model,
          recognized_year_range: `[${vehicle.year_range[0]},${vehicle.year_range[1]}]`,
          recognized_color: vehicle.color,
          confidence: vehicle.confidence,
          validation_result: validate_against ? response.validation : null,
          created_at: new Date().toISOString(),
        });
      } catch (dbError) {
        // Log but don't fail - table might not exist yet
        console.warn('[recognize-vehicle] Could not save to database:', dbError);
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[recognize-vehicle] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
