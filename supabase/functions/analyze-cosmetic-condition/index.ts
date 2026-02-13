/**
 * Analyze Cosmetic Condition Edge Function
 *
 * Uses Gemini 2.5 Flash Vision to analyze the cosmetic condition of a vehicle.
 * Detects scratches, dents, rust, wear patterns, and generates a condition score.
 *
 * POST /analyze-cosmetic-condition
 *   Body: { image_url, area, is_interior? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface AnalyzeConditionRequest {
  image_url: string;
  area: 'front' | 'rear' | 'left' | 'right' | 'roof' | 'interior' | 'dashboard' | 'seats' | 'trunk';
  is_interior?: boolean;
}

interface CosmeticIssue {
  type: 'scratch' | 'dent' | 'rust' | 'paint_fade' | 'crack' | 'stain' | 'tear' | 'wear' | 'missing_part';
  severity: 'minor' | 'moderate' | 'severe';
  location: string;
  size_estimate: string;
  repair_cost_range?: string;
}

interface AnalyzeConditionResponse {
  success: boolean;
  area_analyzed: string;
  condition_score: number; // 1-10
  condition_grade: 'excellent' | 'good' | 'fair' | 'poor';
  issues: CosmeticIssue[];
  summary: string;
  recommendations: string[];
  estimated_repair_total?: string;
  error?: string;
}

// ============================================================================
// GEMINI CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const CONDITION_ANALYSIS_PROMPT = `Eres un inspector profesional de vehículos usados. Analiza la condición cosmética de esta imagen.

ÁREA A ANALIZAR: {area}
TIPO: {area_type}

BUSCA LOS SIGUIENTES PROBLEMAS COSMÉTICOS:

EXTERIORES:
- Rayones/Arañazos: superficiales, profundos, marcas de llaves
- Abolladuras: pequeñas (golf ball), medianas, grandes
- Óxido/Corrosión: puntos de óxido, corrosión extendida
- Pintura: decoloración, descascarado, diferencias de tono
- Grietas: parabrisas, faros, espejos
- Partes faltantes: molduras, emblemas, tapas

INTERIORES:
- Manchas: tapicería, alfombras, cielo
- Desgarros: asientos, volante, panel de puerta
- Desgaste: pedales, palanca, botones
- Grietas: tablero, consola, plásticos
- Olores: humo, humedad (inferir por manchas de agua)

ESCALA DE CONDICIÓN (1-10):
- 9-10: Excelente - Como nuevo, sin defectos visibles
- 7-8: Bueno - Desgaste normal mínimo, sin daños significativos
- 5-6: Regular - Varios defectos menores o un defecto moderado
- 3-4: Malo - Múltiples defectos o daños significativos
- 1-2: Muy malo - Daños severos que afectan valor/seguridad

ESTIMACIÓN DE REPARACIÓN (USD aproximado):
- Rayón superficial: $50-150
- Rayón profundo: $150-400
- Abolladura pequeña (PDR): $75-150
- Abolladura mediana: $200-500
- Óxido puntual: $100-300
- Pintura parcial: $300-800
- Tapicería reparación: $100-400
- Limpieza profunda interior: $150-300

Responde ÚNICAMENTE con JSON válido:
{
  "area_analyzed": "front|rear|left|right|interior|etc",
  "condition_score": 1-10,
  "condition_grade": "excellent|good|fair|poor",
  "issues": [
    {
      "type": "scratch|dent|rust|paint_fade|crack|stain|tear|wear|missing_part",
      "severity": "minor|moderate|severe",
      "location": "descripción de ubicación específica",
      "size_estimate": "5cm x 2cm aprox",
      "repair_cost_range": "$100-200"
    }
  ],
  "summary": "resumen de 1-2 oraciones del estado general",
  "recommendations": ["recomendación 1", "recomendación 2"],
  "estimated_repair_total": "$0-500 si aplica"
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
// GEMINI VISION ANALYSIS
// ============================================================================

async function analyzeCondition(
  imageUrl: string,
  area: string,
  isInterior: boolean
): Promise<AnalyzeConditionResponse> {
  console.log('[analyze-cosmetic-condition] Fetching image...');
  const image = await imageUrlToBase64(imageUrl);

  if (!image) {
    return {
      success: false,
      area_analyzed: area,
      condition_score: 0,
      condition_grade: 'poor',
      issues: [],
      summary: '',
      recommendations: [],
      error: 'No se pudo cargar la imagen',
    };
  }

  const areaLabels: Record<string, string> = {
    front: 'Frente del vehículo (capó, parrilla, paragolpes, faros)',
    rear: 'Parte trasera (maletero, paragolpes, calaveras)',
    left: 'Lateral izquierdo (puertas, espejos, faldón)',
    right: 'Lateral derecho (puertas, espejos, faldón)',
    roof: 'Techo del vehículo',
    interior: 'Interior general',
    dashboard: 'Tablero y consola central',
    seats: 'Asientos delanteros y traseros',
    trunk: 'Interior del maletero',
  };

  const prompt = CONDITION_ANALYSIS_PROMPT
    .replace('{area}', areaLabels[area] || area)
    .replace('{area_type}', isInterior ? 'Interior' : 'Exterior');

  console.log('[analyze-cosmetic-condition] Calling Gemini Vision...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
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
      temperature: 0.2,
      topK: 30,
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
    console.error('[analyze-cosmetic-condition] Gemini error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter((p: { text?: string }) => p.text)
    ?.map((p: { text: string }) => p.text)
    ?.join('');

  if (!textContent) {
    return {
      success: false,
      area_analyzed: area,
      condition_score: 0,
      condition_grade: 'poor',
      issues: [],
      summary: '',
      recommendations: [],
      error: 'No se recibió respuesta del análisis',
    };
  }

  // Parse JSON from response
  try {
    console.log('[analyze-cosmetic-condition] Raw response length:', textContent.length);

    let jsonStr = textContent.trim();

    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const objMatch = textContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ');

    const parsed = JSON.parse(jsonStr);

    return {
      success: true,
      area_analyzed: parsed.area_analyzed || area,
      condition_score: parsed.condition_score ?? 5,
      condition_grade: parsed.condition_grade || 'fair',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      summary: parsed.summary || '',
      recommendations: parsed.recommendations || [],
      estimated_repair_total: parsed.estimated_repair_total,
    };
  } catch (parseError) {
    console.error('[analyze-cosmetic-condition] JSON parse error:', parseError);
    const rawSnippet = textContent.substring(0, 300).replace(/\n/g, ' ');
    return {
      success: false,
      area_analyzed: area,
      condition_score: 0,
      condition_grade: 'poor',
      issues: [],
      summary: '',
      recommendations: [],
      error: `Error al parsear: ${rawSnippet}`,
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
      console.error('[analyze-cosmetic-condition] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: AnalyzeConditionRequest = await req.json();
    const { image_url, area, is_interior } = payload;

    if (!image_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere image_url',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!area) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere area',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isInterior = is_interior ?? ['interior', 'dashboard', 'seats', 'trunk'].includes(area);

    console.log(`[analyze-cosmetic-condition] Analyzing ${area} (${isInterior ? 'interior' : 'exterior'})...`);

    const result = await analyzeCondition(image_url, area, isInterior);

    console.log(`[analyze-cosmetic-condition] Score: ${result.condition_score}/10, Grade: ${result.condition_grade}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[analyze-cosmetic-condition] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
