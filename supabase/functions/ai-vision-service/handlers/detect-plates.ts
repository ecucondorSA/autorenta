
import { imageUrlToBase64 } from "../utils/image.ts";
import { requireAuth } from "../utils/auth.ts";

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
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

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
// LOGIC
// ============================================================================

async function detectPlates(imageUrl: string): Promise<{ plates: DetectedPlate[]; error?: string }> {
  console.log('[detect-plates] Fetching image...');
  const image = await imageUrlToBase64(imageUrl);

  if (!image) {
    return { plates: [], error: 'No se pudo cargar la imagen' };
  }

  console.log('[detect-plates] Calling Gemini Vision...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[detect-plates] Gemini error:', errorText);
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

    // Clean up
    jsonStr = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ');

    const parsed = JSON.parse(jsonStr);
    return { plates: parsed.plates || [] };
  } catch (parseError) {
    console.error('[detect-plates] JSON parse error:', parseError);
    return { plates: [], error: 'Error al parsear respuesta' };
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export async function detectPlatesHandler(req: Request): Promise<Response> {
  try {
    // Require authentication
    await requireAuth(req);

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Servicio de análisis no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: DetectPlatesRequest = await req.json();
    const { image_url, auto_blur } = payload;

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'Se requiere image_url' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response: DetectPlatesResponse = {
      success: true,
      plates_detected: plates.length,
      plates,
      warning: plates.length > 0,
    };

    if (auto_blur && plates.length > 0) {
      console.log('[detect-plates] Auto-blur requested (frontend handled)');
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[detect-plates] Handler Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error desconocido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
