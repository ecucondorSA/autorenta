/**
 * Gemini 3 Document Analyzer Edge Function
 *
 * Uses Gemini 3 Flash Vision for intelligent document analysis when
 * Google Cloud Vision OCR confidence is low or fields are missing.
 *
 * Capabilities:
 * - Extract fields that OCR missed
 * - Detect document tampering/fraud
 * - Validate data coherence (photo matches age, etc.)
 * - Support for multiple countries (EC, AR, BR, CL, CO)
 *
 * POST /gemini3-document-analyzer
 *   Body: { image_url, image_base64?, document_type, country, ocr_text?, ocr_confidence? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

type DocumentType = 'cedula' | 'dni' | 'license' | 'vehicle_registration' | 'passport';
type Country = 'EC' | 'AR' | 'BR' | 'CL' | 'CO';

interface AnalyzeDocumentRequest {
  image_url?: string;
  image_base64?: string;
  document_type: DocumentType;
  country: Country;
  ocr_text?: string;
  ocr_confidence?: number;
  user_id?: string;
}

interface ExtractedData {
  document_number?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  gender?: 'M' | 'F';
  nationality?: string;
  expiry_date?: string;
  issue_date?: string;
  address?: string;
  blood_type?: string;
  // License specific
  license_categories?: string[];
  license_points?: number;
  is_professional?: boolean;
  // Vehicle registration specific
  plate_number?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  chassis_number?: string;
  // Additional
  cuil?: string; // Argentina
  cpf?: string; // Brazil
  rut?: string; // Chile
}

interface FraudIndicators {
  is_suspicious: boolean;
  confidence: number;
  indicators: string[];
  recommendation: 'approve' | 'manual_review' | 'reject';
}

interface AnalyzeDocumentResponse {
  success: boolean;
  extracted_data: ExtractedData;
  confidence: number;
  fraud_check: FraudIndicators;
  validation_errors: string[];
  validation_warnings: string[];
  raw_analysis?: string;
  error?: string;
}

// ============================================================================
// GEMINI 3 FLASH CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Country-specific prompts
const COUNTRY_PROMPTS: Record<Country, string> = {
  EC: `Este es un documento de ECUADOR. Los documentos ecuatorianos incluyen:
- Cédula de Ciudadanía: 10 dígitos (PP-T-SSSSSS-V donde PP=provincia, T=tipo, V=verificador)
- Licencia de Conducir: Emitida por la ANT, categorías A,B,C,C1,D,D1,E,E1,F,G
- Matrícula Vehicular: Incluye placa, marca, modelo, año, chasis`,

  AR: `Este es un documento de ARGENTINA. Los documentos argentinos incluyen:
- DNI (Documento Nacional de Identidad): 7-8 dígitos
- CUIL: 11 dígitos en formato XX-XXXXXXXX-X
- Licencia de Conducir: Categorías A1,A2,A3,B1,B2,C1,C2,C3,D1-D4,E1-E3,F,G
- Cédula Verde/Título: Datos del vehículo y titular`,

  BR: `Este es un documento de BRASIL. Los documentos brasileños incluyen:
- CPF: 11 dígitos en formato XXX.XXX.XXX-XX
- CNH (Carteira Nacional de Habilitação): Categorías A,B,C,D,E
- CRLV (Certificado de Registro e Licenciamento): Datos del vehículo`,

  CL: `Este es un documento de CHILE. Los documentos chilenos incluyen:
- RUT: Formato XX.XXX.XXX-X
- Cédula de Identidad
- Licencia de Conducir: Clases A1-A5, B, C, D, E, F
- Padrón Vehicular`,

  CO: `Este es un documento de COLOMBIA. Los documentos colombianos incluyen:
- Cédula de Ciudadanía: 10 dígitos
- Licencia de Conducir: Categorías A1,A2,B1,B2,B3,C1,C2,C3
- Tarjeta de Propiedad del Vehículo`,
};

function getAnalysisPrompt(documentType: DocumentType, country: Country, ocrText?: string): string {
  const countryInfo = COUNTRY_PROMPTS[country];

  let documentInfo = '';
  switch (documentType) {
    case 'cedula':
    case 'dni':
      documentInfo = 'un documento de identidad (cédula/DNI)';
      break;
    case 'license':
      documentInfo = 'una licencia de conducir';
      break;
    case 'vehicle_registration':
      documentInfo = 'una matrícula/cédula verde/tarjeta de propiedad vehicular';
      break;
    case 'passport':
      documentInfo = 'un pasaporte';
      break;
  }

  const ocrContext = ocrText
    ? `

El OCR previo extrajo este texto (puede tener errores):
"""
${ocrText.substring(0, 1000)}
"""

Usa esta información como referencia pero verifica visualmente.`
    : '';

  return `Eres un experto en verificación de documentos de identidad para ${country}.

${countryInfo}

Estás analizando ${documentInfo}.${ocrContext}

TAREAS:
1. EXTRACCIÓN DE DATOS: Extrae todos los campos visibles del documento
2. VALIDACIÓN: Verifica que los datos sean coherentes (formato de número, fechas lógicas, etc.)
3. DETECCIÓN DE FRAUDE: Busca señales de manipulación o falsificación:
   - Texto borroso o inconsistente
   - Foto que no coincide con la edad declarada
   - Hologramas o sellos faltantes/alterados
   - Formato de documento incorrecto
   - Datos sospechosos (fechas imposibles, números inválidos)

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "extracted_data": {
    "document_number": "1234567890",
    "full_name": "JUAN CARLOS PEREZ GARCIA",
    "first_name": "JUAN CARLOS",
    "last_name": "PEREZ GARCIA",
    "birth_date": "1985-03-15",
    "gender": "M",
    "nationality": "ECUATORIANO",
    "expiry_date": "2028-01-20",
    "issue_date": "2023-01-20",
    "license_categories": ["B", "C1"],
    "is_professional": false
  },
  "confidence": 0.92,
  "fraud_check": {
    "is_suspicious": false,
    "confidence": 0.95,
    "indicators": [],
    "recommendation": "approve"
  },
  "validation_errors": [],
  "validation_warnings": ["La foto está ligeramente borrosa"]
}

IMPORTANTE:
- Usa null para campos que no puedas extraer
- Las fechas deben estar en formato YYYY-MM-DD
- Si detectas fraude, explica los indicadores específicos
- recommendation puede ser: "approve", "manual_review", "reject"`;
}

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
// GEMINI 3 FLASH VISION ANALYSIS
// ============================================================================

async function analyzeDocumentWithGemini(
  imageBase64: string,
  imageMimeType: string,
  documentType: DocumentType,
  country: Country,
  ocrText?: string
): Promise<AnalyzeDocumentResponse> {
  const prompt = getAnalysisPrompt(documentType, country, ocrText);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64,
            },
          },
          {
            text: 'Analiza el documento y proporciona el JSON con los datos extraídos y la verificación de fraude:',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  };

  console.log('[Gemini Document] Calling Gemini 3 Flash for document analysis...');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini Document] Error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract text from response
  const textContent = data.candidates?.[0]?.content?.parts
    ?.filter((p: any) => p.text)
    ?.map((p: any) => p.text)
    ?.join('');

  if (!textContent) {
    console.error('[Gemini Document] No text in response');
    return {
      success: false,
      extracted_data: {},
      confidence: 0,
      fraud_check: {
        is_suspicious: true,
        confidence: 0,
        indicators: ['No se pudo analizar el documento'],
        recommendation: 'manual_review',
      },
      validation_errors: ['No se pudo obtener respuesta del análisis'],
      validation_warnings: [],
      error: 'No response from Gemini',
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
      success: true,
      extracted_data: parsed.extracted_data || {},
      confidence: parsed.confidence || 0.5,
      fraud_check: parsed.fraud_check || {
        is_suspicious: false,
        confidence: 0.5,
        indicators: [],
        recommendation: 'manual_review',
      },
      validation_errors: parsed.validation_errors || [],
      validation_warnings: parsed.validation_warnings || [],
      raw_analysis: textContent,
    };
  } catch (parseError) {
    console.error('[Gemini Document] JSON parse error:', parseError);
    console.error('[Gemini Document] Raw text:', textContent);

    return {
      success: false,
      extracted_data: {},
      confidence: 0,
      fraud_check: {
        is_suspicious: true,
        confidence: 0,
        indicators: ['Error al procesar respuesta del análisis'],
        recommendation: 'manual_review',
      },
      validation_errors: ['Error al parsear respuesta'],
      validation_warnings: [],
      raw_analysis: textContent,
      error: 'JSON parse error',
    };
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
      console.error('[gemini3-document-analyzer] GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Servicio de análisis no configurado',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const payload: AnalyzeDocumentRequest = await req.json();
    const {
      image_url,
      image_base64,
      document_type,
      country,
      ocr_text,
      ocr_confidence,
      user_id,
    } = payload;

    // Validate required fields
    if ((!image_url && !image_base64) || !document_type || !country) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requieren: (image_url OR image_base64), document_type, country',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate country
    const validCountries: Country[] = ['EC', 'AR', 'BR', 'CL', 'CO'];
    if (!validCountries.includes(country)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `País no soportado: ${country}. Soportados: ${validCountries.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[gemini3-document-analyzer] Analyzing ${document_type} from ${country}...`);

    // Get image as base64
    let imageData: { base64: string; mimeType: string };

    if (image_base64) {
      // Already have base64
      imageData = {
        base64: image_base64,
        mimeType: 'image/jpeg', // Assume JPEG if not specified
      };
    } else if (image_url) {
      // Fetch and convert
      const fetched = await imageUrlToBase64(image_url);
      if (!fetched) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No se pudo obtener la imagen',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      imageData = fetched;
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere image_url o image_base64',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze with Gemini 3 Flash
    const result = await analyzeDocumentWithGemini(
      imageData.base64,
      imageData.mimeType,
      document_type,
      country,
      ocr_text
    );

    console.log(`[gemini3-document-analyzer] Analysis complete. Confidence: ${result.confidence}`);

    // Optionally save to database for audit
    if (user_id && result.success) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        await supabase.from('document_analysis_logs').insert({
          user_id,
          document_type,
          country,
          gemini_confidence: result.confidence,
          ocr_confidence: ocr_confidence || null,
          fraud_suspicious: result.fraud_check.is_suspicious,
          fraud_recommendation: result.fraud_check.recommendation,
          analyzed_at: new Date().toISOString(),
          model_used: GEMINI_MODEL,
        });

        console.log('[gemini3-document-analyzer] Audit log saved');
      } catch (dbError) {
        // Log but don't fail - table might not exist yet
        console.warn('[gemini3-document-analyzer] Could not save audit log:', dbError);
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[gemini3-document-analyzer] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
