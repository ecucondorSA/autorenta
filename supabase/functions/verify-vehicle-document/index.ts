/**
 * Verify Vehicle Document Edge Function
 *
 * Uses Gemini 2.5 Flash Vision to verify vehicle documents (registration, title, insurance).
 * Extracts key information and validates consistency with vehicle data.
 *
 * POST /verify-vehicle-document
 *   Body: { image_url, document_type, vehicle_data? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface VerifyDocumentRequest {
  image_url: string;
  document_type: 'registration' | 'title' | 'insurance' | 'inspection' | 'permit';
  vehicle_data?: {
    plate?: string;
    brand?: string;
    model?: string;
    year?: number;
    vin?: string;
  };
}

interface ExtractedData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  vin?: string;
  owner_name?: string;
  expiration_date?: string;
  document_number?: string;
  [key: string]: string | number | undefined;
}

interface VerifyDocumentResponse {
  success: boolean;
  is_valid: boolean;
  document_type_detected: string;
  extracted_data: ExtractedData;
  validation: {
    is_readable: boolean;
    is_complete: boolean;
    is_expired: boolean;
    matches_vehicle: boolean;
    discrepancies: string[];
  };
  confidence: number;
  warnings: string[];
  error?: string;
}

// ============================================================================
// GEMINI CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const DOCUMENT_VERIFICATION_PROMPT = `Eres un sistema experto en verificación de documentos de vehículos para Latinoamérica.

Analiza esta imagen de documento vehicular tipo: {document_type}

TIPOS DE DOCUMENTOS:
- registration: Tarjeta de circulación, Cédula verde (Argentina), CRLV (Brasil)
- title: Título de propiedad, Factura del vehículo
- insurance: Póliza de seguro, Certificado de cobertura
- inspection: Verificación técnica vehicular (VTV), Revisión técnico-mecánica
- permit: Permiso de circulación, Patente

EXTRAE la siguiente información según sea aplicable:
1. Número de placa/patente
2. Marca del vehículo
3. Modelo del vehículo
4. Año del vehículo
5. Número VIN/Chasis
6. Nombre del propietario
7. Fecha de vencimiento
8. Número de documento/folio

EVALÚA:
1. ¿El documento es legible?
2. ¿Tiene todos los campos requeridos visibles?
3. ¿Está vencido? (compara fecha de vencimiento con hoy: {today})
4. ¿Es un documento auténtico (no editado/falsificado)?

{vehicle_context}

Responde ÚNICAMENTE con JSON válido:
{
  "document_type_detected": "registration|title|insurance|inspection|permit|unknown",
  "is_readable": true/false,
  "is_complete": true/false,
  "is_expired": true/false,
  "authenticity_score": 0-100,
  "extracted_data": {
    "plate": "ABC123",
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "vin": "VIN123...",
    "owner_name": "Juan Pérez",
    "expiration_date": "2025-12-31",
    "document_number": "DOC123"
  },
  "matches_vehicle": true/false,
  "discrepancies": ["lista de diferencias encontradas"],
  "warnings": ["advertencias importantes"],
  "confidence": 0-100
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

async function verifyDocument(
  imageUrl: string,
  documentType: string,
  vehicleData?: VerifyDocumentRequest['vehicle_data']
): Promise<VerifyDocumentResponse> {
  console.log('[verify-vehicle-document] Fetching image...');
  const image = await imageUrlToBase64(imageUrl);

  if (!image) {
    return {
      success: false,
      is_valid: false,
      document_type_detected: 'unknown',
      extracted_data: {},
      validation: {
        is_readable: false,
        is_complete: false,
        is_expired: false,
        matches_vehicle: false,
        discrepancies: [],
      },
      confidence: 0,
      warnings: [],
      error: 'No se pudo cargar la imagen',
    };
  }

  // Build context
  const documentLabels: Record<string, string> = {
    registration: 'Tarjeta de circulación / Cédula verde',
    title: 'Título de propiedad',
    insurance: 'Póliza de seguro',
    inspection: 'Verificación técnica vehicular',
    permit: 'Permiso de circulación',
  };

  let vehicleContext = '';
  if (vehicleData) {
    vehicleContext = `
DATOS DEL VEHÍCULO A VALIDAR:
${vehicleData.plate ? `- Placa: ${vehicleData.plate}` : ''}
${vehicleData.brand ? `- Marca: ${vehicleData.brand}` : ''}
${vehicleData.model ? `- Modelo: ${vehicleData.model}` : ''}
${vehicleData.year ? `- Año: ${vehicleData.year}` : ''}
${vehicleData.vin ? `- VIN: ${vehicleData.vin}` : ''}

Compara los datos extraídos con estos datos de referencia.`;
  }

  const today = new Date().toISOString().split('T')[0];
  const prompt = DOCUMENT_VERIFICATION_PROMPT
    .replace('{document_type}', documentLabels[documentType] || documentType)
    .replace('{today}', today)
    .replace('{vehicle_context}', vehicleContext);

  console.log('[verify-vehicle-document] Calling Gemini Vision...');

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
    console.error('[verify-vehicle-document] Gemini error:', errorText);
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
      is_valid: false,
      document_type_detected: 'unknown',
      extracted_data: {},
      validation: {
        is_readable: false,
        is_complete: false,
        is_expired: false,
        matches_vehicle: false,
        discrepancies: [],
      },
      confidence: 0,
      warnings: [],
      error: 'No se recibió respuesta del análisis',
    };
  }

  // Parse JSON from response
  try {
    console.log('[verify-vehicle-document] Raw response length:', textContent.length);

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

    const isValid = parsed.is_readable &&
                    parsed.is_complete &&
                    !parsed.is_expired &&
                    (parsed.authenticity_score ?? 0) >= 70 &&
                    (parsed.matches_vehicle ?? true);

    return {
      success: true,
      is_valid: isValid,
      document_type_detected: parsed.document_type_detected || 'unknown',
      extracted_data: parsed.extracted_data || {},
      validation: {
        is_readable: parsed.is_readable ?? false,
        is_complete: parsed.is_complete ?? false,
        is_expired: parsed.is_expired ?? false,
        matches_vehicle: parsed.matches_vehicle ?? true,
        discrepancies: parsed.discrepancies || [],
      },
      confidence: parsed.confidence ?? 0,
      warnings: parsed.warnings || [],
    };
  } catch (parseError) {
    console.error('[verify-vehicle-document] JSON parse error:', parseError);
    const rawSnippet = textContent.substring(0, 300).replace(/\n/g, ' ');
    return {
      success: false,
      is_valid: false,
      document_type_detected: 'unknown',
      extracted_data: {},
      validation: {
        is_readable: false,
        is_complete: false,
        is_expired: false,
        matches_vehicle: false,
        discrepancies: [],
      },
      confidence: 0,
      warnings: [],
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
      console.error('[verify-vehicle-document] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: VerifyDocumentRequest = await req.json();
    const { image_url, document_type, vehicle_data } = payload;

    if (!image_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere image_url',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!document_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere document_type',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-vehicle-document] Verifying ${document_type} document...`);

    const result = await verifyDocument(image_url, document_type, vehicle_data);

    console.log(`[verify-vehicle-document] Valid: ${result.is_valid}, Confidence: ${result.confidence}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[verify-vehicle-document] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
