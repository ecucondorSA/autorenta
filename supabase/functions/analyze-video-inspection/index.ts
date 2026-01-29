/**
 * Analyze Video Inspection Edge Function
 *
 * Uses Gemini 2.5 Flash Vision to analyze multiple frames extracted from
 * an inspection video. Detects damages, reads odometer via OCR, and
 * estimates fuel level.
 *
 * POST /analyze-video-inspection
 *   Body: {
 *     booking_id: string,
 *     stage: 'check_in' | 'check_out' | 'renter_check_in',
 *     frames: Array<{ url: string, timestamp_ms: number, suggested_area?: string }>,
 *     compare_with_checkin?: boolean
 *   }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface FrameInput {
  url: string;
  timestamp_ms: number;
  suggested_area?: string;
}

interface AnalyzeVideoInspectionRequest {
  booking_id: string;
  stage: 'check_in' | 'check_out' | 'renter_check_in';
  frames: FrameInput[];
  compare_with_checkin?: boolean;
}

interface DetectedDamage {
  frame_index: number;
  frame_url: string;
  type: 'scratch' | 'dent' | 'crack' | 'stain' | 'missing' | 'other';
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  location: string;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

interface OdometerReading {
  value: number;
  unit: 'km' | 'mi';
  confidence: number;
  frame_url: string;
}

interface FuelLevelReading {
  percentage: number;
  confidence: number;
  frame_url: string;
}

interface AreasDetected {
  front: boolean;
  rear: boolean;
  left_side: boolean;
  right_side: boolean;
  interior: boolean;
  dashboard: boolean;
  trunk: boolean;
}

interface AnalyzeVideoInspectionResponse {
  success: boolean;
  damages: DetectedDamage[];
  odometer?: OdometerReading;
  fuel_level?: FuelLevelReading;
  areas_detected: AreasDetected;
  warnings: string[];
  summary: string;
  error?: string;
}

interface FrameAnalysisResult {
  area: string;
  damages: Array<{
    type: string;
    description: string;
    severity: string;
    confidence: number;
    location: string;
  }>;
  odometer?: { value: number; unit: string; confidence: number };
  fuel_level?: { percentage: number; confidence: number };
}

// ============================================================================
// GEMINI CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// System prompt for frame analysis
const FRAME_ANALYSIS_PROMPT = `Eres un experto en inspección de vehículos. Analiza esta imagen y detecta:

1. ÁREA DEL VEHÍCULO: ¿Qué parte del auto se ve? Opciones:
   - front (frente/capot/parachoques delantero)
   - rear (trasera/baúl/parachoques trasero)
   - left_side (lateral izquierdo)
   - right_side (lateral derecho)
   - interior (asientos/interior del habitáculo)
   - dashboard (tablero/instrumental)
   - trunk (maletero/baúl abierto)
   - unknown (no se puede determinar)

2. DAÑOS VISIBLES: Lista cada daño encontrado con:
   - type: scratch (rayón), dent (abolladura), crack (grieta), stain (mancha), missing (faltante), other
   - description: Descripción breve del daño en español
   - severity: minor (estético), moderate (reparable), severe (estructural)
   - confidence: Número entre 0 y 1
   - location: Ubicación exacta en el vehículo (ej: "puerta trasera derecha", "parachoques frontal")

3. ODÓMETRO: Si se ve el tablero/odómetro:
   - value: Valor numérico leído
   - unit: "km" o "mi"
   - confidence: Número entre 0 y 1

4. COMBUSTIBLE: Si se ve el indicador de combustible:
   - percentage: Número entre 0 y 100
   - confidence: Número entre 0 y 1

IMPORTANTE:
- Si no hay daños visibles, devuelve un array vacío en "damages"
- Si no se ve odómetro o combustible, omite esos campos (null)
- Sé preciso en la ubicación de daños
- Solo reporta daños que puedas confirmar visualmente

Responde SOLO en JSON válido:
{
  "area": "front",
  "damages": [
    {
      "type": "scratch",
      "description": "Rayón horizontal de unos 20cm",
      "severity": "minor",
      "confidence": 0.85,
      "location": "puerta delantera izquierda"
    }
  ],
  "odometer": { "value": 45230, "unit": "km", "confidence": 0.92 },
  "fuel_level": { "percentage": 75, "confidence": 0.88 }
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
// GEMINI VISION API
// ============================================================================

async function analyzeFrameWithGemini(imageUrl: string): Promise<FrameAnalysisResult | null> {
  const imageData = await imageUrlToBase64(imageUrl);
  if (!imageData) {
    console.error('[Gemini Vision] Failed to fetch image:', imageUrl);
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: FRAME_ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.base64,
            },
          },
          { text: 'Analiza esta imagen del vehículo:' },
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
    return null;
  }

  const data = await response.json();

  // Extract text from response
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string }) => p.text)
    ?.map((p: { text: string }) => p.text)
    ?.join('');

  if (!textContent) {
    console.error('[Gemini Vision] No text in response');
    return null;
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

    return JSON.parse(jsonStr) as FrameAnalysisResult;
  } catch (parseError) {
    console.error('[Gemini Vision] JSON parse error:', parseError);
    console.error('[Gemini Vision] Raw text:', textContent);
    return null;
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

async function analyzeVideoFrames(
  frames: FrameInput[],
  bookingId: string,
  stage: string
): Promise<AnalyzeVideoInspectionResponse> {
  console.log(`[analyze-video-inspection] Starting analysis of ${frames.length} frames for booking ${bookingId}`);

  const allDamages: DetectedDamage[] = [];
  let bestOdometer: OdometerReading | undefined;
  let bestFuelLevel: FuelLevelReading | undefined;
  const areasDetected: AreasDetected = {
    front: false,
    rear: false,
    left_side: false,
    right_side: false,
    interior: false,
    dashboard: false,
    trunk: false,
  };

  // Process frames in parallel batches of 5 to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (frame, batchIndex) => {
      const frameIndex = i + batchIndex;
      console.log(`[analyze-video-inspection] Analyzing frame ${frameIndex + 1}/${frames.length}`);

      const result = await analyzeFrameWithGemini(frame.url);
      if (!result) return;

      // Mark area as detected
      const areaKey = result.area as keyof AreasDetected;
      if (areaKey in areasDetected) {
        areasDetected[areaKey] = true;
      }

      // Collect damages
      for (const damage of result.damages || []) {
        allDamages.push({
          frame_index: frameIndex,
          frame_url: frame.url,
          type: damage.type as DetectedDamage['type'],
          description: damage.description,
          severity: damage.severity as DetectedDamage['severity'],
          location: damage.location,
          confidence: damage.confidence,
        });
      }

      // Track best odometer reading (highest confidence)
      if (result.odometer && result.odometer.confidence > (bestOdometer?.confidence || 0)) {
        bestOdometer = {
          value: result.odometer.value,
          unit: result.odometer.unit as 'km' | 'mi',
          confidence: result.odometer.confidence,
          frame_url: frame.url,
        };
      }

      // Track best fuel level reading (highest confidence)
      if (result.fuel_level && result.fuel_level.confidence > (bestFuelLevel?.confidence || 0)) {
        bestFuelLevel = {
          percentage: result.fuel_level.percentage,
          confidence: result.fuel_level.confidence,
          frame_url: frame.url,
        };
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < frames.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Generate warnings
  const warnings: string[] = [];
  const requiredAreas = ['front', 'rear', 'left_side', 'right_side'];
  for (const area of requiredAreas) {
    if (!areasDetected[area as keyof AreasDetected]) {
      const areaNames: Record<string, string> = {
        front: 'Frente',
        rear: 'Trasera',
        left_side: 'Lateral izquierdo',
        right_side: 'Lateral derecho',
      };
      warnings.push(`No se detectó el área: ${areaNames[area]}`);
    }
  }

  if (!bestOdometer) {
    warnings.push('No se pudo leer el odómetro. Por favor, ingresá el valor manualmente.');
  }

  if (!bestFuelLevel) {
    warnings.push('No se pudo estimar el nivel de combustible. Por favor, ingresá el valor manualmente.');
  }

  // Generate summary
  const damageCount = allDamages.length;
  let summary = '';
  if (damageCount === 0) {
    summary = 'No se detectaron daños en el vehículo.';
  } else if (damageCount === 1) {
    summary = `Se detectó 1 daño: ${allDamages[0].description}`;
  } else {
    summary = `Se detectaron ${damageCount} daños en el vehículo.`;
  }

  if (bestOdometer) {
    summary += ` Odómetro: ${bestOdometer.value.toLocaleString()} ${bestOdometer.unit}.`;
  }

  if (bestFuelLevel) {
    summary += ` Combustible: ${bestFuelLevel.percentage}%.`;
  }

  console.log(`[analyze-video-inspection] Analysis complete: ${damageCount} damages, odometer: ${bestOdometer?.value || 'N/A'}, fuel: ${bestFuelLevel?.percentage || 'N/A'}%`);

  return {
    success: true,
    damages: allDamages,
    odometer: bestOdometer,
    fuel_level: bestFuelLevel,
    areas_detected: areasDetected,
    warnings,
    summary,
  };
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
      console.error('[analyze-video-inspection] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          damages: [],
          areas_detected: {
            front: false,
            rear: false,
            left_side: false,
            right_side: false,
            interior: false,
            dashboard: false,
            trunk: false,
          },
          warnings: ['Servicio de análisis no configurado'],
          summary: 'Error de configuración',
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: AnalyzeVideoInspectionRequest = await req.json();
    const { booking_id, stage, frames } = payload;

    // Validate required fields
    if (!booking_id || !stage || !frames || frames.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          damages: [],
          areas_detected: {
            front: false,
            rear: false,
            left_side: false,
            right_side: false,
            interior: false,
            dashboard: false,
            trunk: false,
          },
          warnings: [],
          summary: 'Parámetros inválidos',
          error: 'Se requieren booking_id, stage y al menos un frame',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[analyze-video-inspection] Processing ${frames.length} frames for booking ${booking_id}, stage: ${stage}`);

    // Analyze frames
    const result = await analyzeVideoFrames(frames, booking_id, stage);

    // Save analysis log to database
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      await supabase.from('video_inspection_logs').insert({
        booking_id,
        stage,
        frames_count: frames.length,
        damages_count: result.damages.length,
        odometer_value: result.odometer?.value,
        odometer_confidence: result.odometer?.confidence,
        fuel_level: result.fuel_level?.percentage,
        fuel_confidence: result.fuel_level?.confidence,
        areas_detected: result.areas_detected,
        warnings: result.warnings,
        summary: result.summary,
        analyzed_at: new Date().toISOString(),
        model_used: GEMINI_MODEL,
      });

      console.log('[analyze-video-inspection] Results saved to database');
    } catch (dbError) {
      // Log but don't fail - table might not exist yet
      console.warn('[analyze-video-inspection] Could not save to database:', dbError);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[analyze-video-inspection] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        damages: [],
        areas_detected: {
          front: false,
          rear: false,
          left_side: false,
          right_side: false,
          interior: false,
          dashboard: false,
          trunk: false,
        },
        warnings: [],
        summary: 'Error al analizar',
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
