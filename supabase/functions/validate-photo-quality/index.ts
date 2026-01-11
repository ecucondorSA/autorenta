/**
 * Validate Photo Quality Edge Function
 *
 * Uses Gemini 2.5 Flash Vision to analyze photo quality for vehicle listings.
 * Detects blur, poor lighting, wrong framing, and validates content matches expected subject.
 *
 * POST /validate-photo-quality
 *   Body: { image_url, expected_subject, position? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface PhotoQualityRequest {
  image_url: string;
  expected_subject: 'vehicle_exterior' | 'vehicle_interior' | 'document' | 'damage';
  position?: 'front' | 'rear' | 'left' | 'right' | 'interior' | 'dashboard' | 'trunk';
}

interface PhotoIssue {
  type: 'blur' | 'dark' | 'overexposed' | 'cropped' | 'wrong_subject' | 'obstruction' | 'reflection' | 'low_resolution';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface PhotoQualityResponse {
  success: boolean;
  quality: {
    score: number;
    is_acceptable: boolean;
    issues: PhotoIssue[];
  };
  content: {
    matches_subject: boolean;
    detected_subject: string;
    area_coverage: number;
    position_detected?: string;
  };
  recommendations: string[];
  error?: string;
}

// ============================================================================
// GEMINI CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const QUALITY_ANALYSIS_PROMPT = `Eres un sistema de control de calidad de imágenes para una plataforma de alquiler de autos.

Analiza esta imagen que debería mostrar: {expected_subject}
{position_context}

Evalúa los siguientes aspectos y asigna puntuación:

1. NITIDEZ (0-25 puntos):
   - 25: Imagen perfectamente nítida, todos los detalles visibles
   - 15-24: Ligero desenfoque pero aceptable
   - 5-14: Desenfoque notable que dificulta ver detalles
   - 0-4: Imagen muy borrosa, inaceptable

2. ILUMINACIÓN (0-25 puntos):
   - 25: Iluminación perfecta, colores naturales
   - 15-24: Iluminación aceptable con sombras menores
   - 5-14: Muy oscura o sobreexpuesta
   - 0-4: No se puede ver el sujeto por iluminación

3. ENCUADRE (0-25 puntos):
   - 25: Sujeto centrado, ocupa 60-80% del frame
   - 15-24: Sujeto visible pero mal encuadrado
   - 5-14: Sujeto parcialmente cortado
   - 0-4: Sujeto casi no visible o muy pequeño

4. CONTENIDO (0-25 puntos):
   - 25: Muestra exactamente lo esperado sin obstrucciones
   - 15-24: Contenido correcto con obstrucciones menores
   - 5-14: Contenido incorrecto o muy obstruido
   - 0-4: No muestra lo que se espera

RESPONDE ÚNICAMENTE con JSON válido:
{
  "quality_score": 0-100,
  "issues": [
    {
      "type": "blur|dark|overexposed|cropped|wrong_subject|obstruction|reflection|low_resolution",
      "severity": "low|medium|high",
      "description": "descripción breve del problema"
    }
  ],
  "subject_match": true/false,
  "detected_subject": "descripción de lo que se ve en la imagen",
  "area_coverage_percent": 0-100,
  "detected_position": "front|rear|left|right|interior|dashboard|trunk|unknown",
  "recommendations": ["sugerencia 1", "sugerencia 2"]
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

async function analyzePhotoQuality(
  imageUrl: string,
  expectedSubject: string,
  position?: string
): Promise<PhotoQualityResponse> {
  console.log('[validate-photo-quality] Fetching image...');
  const image = await imageUrlToBase64(imageUrl);

  if (!image) {
    return {
      success: false,
      quality: { score: 0, is_acceptable: false, issues: [] },
      content: { matches_subject: false, detected_subject: '', area_coverage: 0 },
      recommendations: [],
      error: 'No se pudo cargar la imagen',
    };
  }

  // Build prompt with context
  const subjectLabels: Record<string, string> = {
    vehicle_exterior: 'el exterior de un vehículo',
    vehicle_interior: 'el interior de un vehículo',
    document: 'un documento (licencia, cédula, etc.)',
    damage: 'un daño en un vehículo',
  };

  const positionLabels: Record<string, string> = {
    front: 'Vista frontal del vehículo',
    rear: 'Vista trasera del vehículo',
    left: 'Lateral izquierdo del vehículo',
    right: 'Lateral derecho del vehículo',
    interior: 'Interior del vehículo',
    dashboard: 'Tablero del vehículo',
    trunk: 'Maletero del vehículo',
  };

  const prompt = QUALITY_ANALYSIS_PROMPT
    .replace('{expected_subject}', subjectLabels[expectedSubject] || expectedSubject)
    .replace('{position_context}', position ? `Posición esperada: ${positionLabels[position] || position}` : '');

  console.log('[validate-photo-quality] Calling Gemini Vision...');

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
    console.error('[validate-photo-quality] Gemini error:', errorText);
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
      quality: { score: 0, is_acceptable: false, issues: [] },
      content: { matches_subject: false, detected_subject: '', area_coverage: 0 },
      recommendations: [],
      error: 'No se recibió respuesta del análisis',
    };
  }

  // Parse JSON from response
  try {
    console.log('[validate-photo-quality] Raw response length:', textContent.length);

    let jsonStr = textContent.trim();

    // Try markdown code block first
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
      console.log('[validate-photo-quality] Found JSON in code block');
    } else {
      // Try to find JSON object directly
      const objMatch = textContent.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
        console.log('[validate-photo-quality] Found JSON object in text');
      }
    }

    // Clean up common issues
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters

    console.log('[validate-photo-quality] Parsing JSON:', jsonStr.substring(0, 200) + '...');

    const parsed = JSON.parse(jsonStr);

    return {
      success: true,
      quality: {
        score: parsed.quality_score ?? 0,
        is_acceptable: (parsed.quality_score ?? 0) >= 70,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      },
      content: {
        matches_subject: parsed.subject_match ?? true,
        detected_subject: parsed.detected_subject || '',
        area_coverage: parsed.area_coverage_percent ?? 0,
        position_detected: parsed.detected_position,
      },
      recommendations: parsed.recommendations || [],
    };
  } catch (parseError) {
    console.error('[validate-photo-quality] JSON parse error:', parseError);
    console.error('[validate-photo-quality] Raw text:', textContent);
    // Include raw text snippet in error for debugging
    const rawSnippet = textContent.substring(0, 300).replace(/\n/g, ' ');
    return {
      success: false,
      quality: { score: 0, is_acceptable: false, issues: [] },
      content: { matches_subject: false, detected_subject: '', area_coverage: 0 },
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
      console.error('[validate-photo-quality] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: PhotoQualityRequest = await req.json();
    const { image_url, expected_subject, position } = payload;

    if (!image_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere image_url',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expected_subject) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere expected_subject',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-photo-quality] Analyzing photo for ${expected_subject}...`);

    const result = await analyzePhotoQuality(image_url, expected_subject, position);

    console.log(`[validate-photo-quality] Score: ${result.quality.score}, Acceptable: ${result.quality.is_acceptable}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[validate-photo-quality] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
