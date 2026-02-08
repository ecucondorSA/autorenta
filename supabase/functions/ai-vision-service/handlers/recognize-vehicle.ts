
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { imageUrlToBase64 } from "../utils/image.ts";
import { requireAuth } from "../utils/auth.ts";

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
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

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
// HELPERS
// ============================================================================

function normalizeString(str: string): string {
  return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function validateVehicle(
  recognized: VehicleRecognition,
  expected: { brand: string; model: string; year?: number; color?: string }
): ValidationResult {
  const discrepancies: string[] = [];

  const brandMatch = normalizeString(recognized.brand).includes(normalizeString(expected.brand)) ||
                     normalizeString(expected.brand).includes(normalizeString(recognized.brand));

  if (!brandMatch) {
    discrepancies.push(`Marca: esperado "${expected.brand}", detectado "${recognized.brand}"`);
  }

  const modelMatch = normalizeString(recognized.model).includes(normalizeString(expected.model)) ||
                     normalizeString(expected.model).includes(normalizeString(recognized.model));

  if (!modelMatch) {
    discrepancies.push(`Modelo: esperado "${expected.model}", detectado "${recognized.model}"`);
  }

  let colorMatch = true;
  if (expected.color) {
    colorMatch = normalizeString(recognized.color).includes(normalizeString(expected.color)) ||
                 normalizeString(expected.color).includes(normalizeString(recognized.color));

    if (!colorMatch) {
      discrepancies.push(`Color: esperado "${expected.color}", detectado "${recognized.color}"`);
    }
  }

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

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// LOGIC
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
      maxOutputTokens: 2048,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[recognize-vehicle] Calling Gemini API (attempt ${attempt}/${MAX_RETRIES})...`);

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        GEMINI_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[recognize-vehicle] Gemini error (attempt ${attempt}):`, errorText);

        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Gemini API error: ${response.status}`);
        }

        lastError = new Error(`Gemini API error: ${response.status}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw lastError;
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[recognize-vehicle] Timeout on attempt ${attempt}`);
        lastError = new Error('El análisis tardó demasiado');
        if (attempt < MAX_RETRIES) {
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed after all retries');
}

// ============================================================================
// HANDLER
// ============================================================================

export async function recognizeVehicleHandler(req: Request): Promise<Response> {
  try {
    // Require authentication
    await requireAuth(req);

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Servicio de análisis no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: RecognizeVehicleRequest = await req.json();
    const { image_url, image_base64, validate_against } = payload;

    let base64: string;
    let mimeType: string;

    if (image_base64) {
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
          JSON.stringify({ error: 'No se pudo cargar la imagen' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      base64 = imageData.base64;
      mimeType = imageData.mimeType;
    } else {
      return new Response(
        JSON.stringify({ error: 'Se requiere image_url o image_base64' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { vehicle, suggestions, error } = await recognizeVehicle(base64, mimeType);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          vehicle,
          suggestions,
          error,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response: RecognizeVehicleResponse = {
      success: true,
      vehicle,
      suggestions,
    };

    if (validate_against) {
      response.validation = validateVehicle(vehicle, validate_against);
    }

    // Log to database asynchronously
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      supabase.from('vehicle_recognition_logs').insert({
        image_url: image_url || null,
        recognized_brand: vehicle.brand,
        recognized_model: vehicle.model,
        recognized_year_range: `[${vehicle.year_range[0]},${vehicle.year_range[1]}]`,
        recognized_color: vehicle.color,
        confidence: vehicle.confidence,
        validation_result: validate_against ? response.validation : null,
        created_at: new Date().toISOString(),
      }).then(() => console.log('[recognize-vehicle] Log saved')).catch(console.warn);
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[recognize-vehicle] Handler Error:', error);
    
    let errorMessage = 'Error desconocido';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: análisis tardó demasiado';
        statusCode = 504;
      } else if (error.message.includes('Gemini API error')) {
        statusCode = 502;
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
