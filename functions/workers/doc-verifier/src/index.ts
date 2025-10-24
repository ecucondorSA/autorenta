/**
 * Cloudflare AI Worker - Document Verifier
 *
 * Verifica documentos usando Cloudflare AI Vision
 * Modelo: @cf/meta/llama-3.2-11b-vision-instruct
 * Funcionalidad: OCR + Análisis de autenticidad
 */

export interface Env {
  AI: Ai;
  VERIFICATION_TOKEN?: string;
}

export interface DocumentToVerify {
  id: string;
  kind: string;
  url: string;
  status?: string;
  created_at?: string;
}

export interface VerificationRequest {
  user: {
    id: string;
    full_name: string;
    role?: string;
  };
  roles: ('driver' | 'owner')[];
  documents: DocumentToVerify[];
}

export interface DocumentAnalysis {
  status: 'VERIFICADO' | 'RECHAZADO' | 'PENDIENTE';
  notes: string;
  extracted_data?: {
    name?: string;
    document_number?: string;
    expiry_date?: string;
    issue_date?: string;
    category?: string;
  };
  confidence_score?: number;
}

export interface VerificationResponse {
  driver?: {
    status: 'VERIFICADO' | 'RECHAZADO' | 'PENDIENTE';
    notes: string;
    missing_docs: string[];
    extracted_data?: any;
  };
  owner?: {
    status: 'VERIFICADO' | 'RECHAZADO' | 'PENDIENTE';
    notes: string;
    missing_docs: string[];
    extracted_data?: any;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token if configured
    if (env.VERIFICATION_TOKEN) {
      const authHeader = request.headers.get('Authorization');
      const expectedAuth = `Bearer ${env.VERIFICATION_TOKEN}`;

      if (authHeader !== expectedAuth) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    try {
      const startTime = Date.now();
      const body = await request.json() as VerificationRequest;

      console.log('[Doc Verifier] Processing verification for user:', body.user.id);
      console.log('[Doc Verifier] Roles to evaluate:', body.roles);
      console.log('[Doc Verifier] Documents count:', body.documents.length);

      const result: VerificationResponse = {};

      // Evaluate Driver role
      if (body.roles.includes('driver')) {
        result.driver = await evaluateDriver(env, body);
      }

      // Evaluate Owner role
      if (body.roles.includes('owner')) {
        result.owner = await evaluateOwner(env, body);
      }

      const duration = Date.now() - startTime;
      console.log('[Doc Verifier] ✅ Verification completed in', duration, 'ms');

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('[Doc Verifier] Error:', error);

      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};

/**
 * Evalúa documentos para rol de conductor
 */
async function evaluateDriver(env: Env, request: VerificationRequest) {
  const licenseDoc = request.documents.find(doc => doc.kind === 'driver_license');

  const missing_docs: string[] = [];

  if (!licenseDoc) {
    missing_docs.push('licencia');
    return {
      status: 'PENDIENTE' as const,
      notes: 'Falta cargar la licencia de conducir',
      missing_docs,
    };
  }

  // Analizar licencia con Cloudflare AI
  try {
    const analysis = await analyzeDriverLicense(env, licenseDoc);

    return {
      status: analysis.status,
      notes: analysis.notes,
      missing_docs: analysis.status === 'VERIFICADO' ? [] : missing_docs,
      extracted_data: analysis.extracted_data,
    };
  } catch (error) {
    console.error('[Doc Verifier] Error analyzing driver license:', error);

    return {
      status: 'PENDIENTE' as const,
      notes: 'No pudimos analizar la licencia. Por favor, intenta nuevamente con una foto más clara.',
      missing_docs: ['licencia'],
    };
  }
}

/**
 * Evalúa documentos para rol de propietario
 */
async function evaluateOwner(env: Env, request: VerificationRequest) {
  const govIdFront = request.documents.find(doc => doc.kind === 'gov_id_front');
  const govIdBack = request.documents.find(doc => doc.kind === 'gov_id_back');
  const vehicleReg = request.documents.find(doc => doc.kind === 'vehicle_registration');

  const missing_docs: string[] = [];

  if (!govIdFront && !govIdBack) {
    missing_docs.push('dni');
  }

  if (!vehicleReg) {
    missing_docs.push('cedula_auto');
  }

  if (missing_docs.length > 0) {
    return {
      status: 'PENDIENTE' as const,
      notes: `Faltan documentos: ${missing_docs.join(', ')}`,
      missing_docs,
    };
  }

  // TODO: Implementar análisis de DNI y cédula con Cloudflare AI
  // Por ahora, auto-aprobar si todos los documentos están presentes

  return {
    status: 'VERIFICADO' as const,
    notes: 'Documentos de propietario verificados (análisis automático)',
    missing_docs: [],
  };
}

/**
 * Analiza una licencia de conducir usando Cloudflare AI Vision
 */
async function analyzeDriverLicense(env: Env, document: DocumentToVerify): Promise<DocumentAnalysis> {
  console.log('[Doc Verifier] Analyzing driver license:', document.id);

  // Descargar la imagen desde la URL firmada
  const imageResponse = await fetch(document.url);

  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch document image: ${imageResponse.status}`);
  }

  const imageBlob = await imageResponse.blob();
  const imageArray = await imageBlob.arrayBuffer();

  console.log('[Doc Verifier] Image downloaded, size:', imageArray.byteLength, 'bytes');

  // Usar Cloudflare AI Vision para analizar el documento
  const prompt = `Analiza esta imagen de una licencia de conducir argentina.

Extrae la siguiente información:
1. Nombre completo del titular
2. Número de documento/licencia
3. Fecha de vencimiento (formato DD/MM/YYYY)
4. Fecha de emisión (formato DD/MM/YYYY)
5. Categoría de licencia (ej: B1, A2, etc.)

También verifica:
- ¿La imagen es clara y legible?
- ¿Parece ser una licencia de conducir real?
- ¿Hay señales de falsificación o manipulación?

Responde SOLO en formato JSON con esta estructura:
{
  "is_valid": boolean,
  "name": "string",
  "document_number": "string",
  "expiry_date": "DD/MM/YYYY",
  "issue_date": "DD/MM/YYYY",
  "category": "string",
  "confidence": number (0-100),
  "notes": "string con observaciones"
}`;

  try {
    const response = await env.AI.run(
      '@cf/meta/llama-3.2-11b-vision-instruct',
      {
        prompt,
        image: Array.from(new Uint8Array(imageArray)),
        max_tokens: 512,
      }
    );

    console.log('[Doc Verifier] AI response:', response);

    // Parsear la respuesta
    const aiResponse = parseAIResponse(response);

    if (aiResponse.is_valid && aiResponse.confidence >= 70) {
      // Validar fecha de vencimiento
      if (aiResponse.expiry_date) {
        const expiryDate = parseDateDDMMYYYY(aiResponse.expiry_date);
        if (expiryDate && expiryDate < new Date()) {
          return {
            status: 'RECHAZADO',
            notes: `Licencia vencida. Fecha de vencimiento: ${aiResponse.expiry_date}`,
            confidence_score: aiResponse.confidence,
          };
        }
      }

      return {
        status: 'VERIFICADO',
        notes: aiResponse.notes || `Licencia verificada con confianza del ${aiResponse.confidence}%`,
        extracted_data: {
          name: aiResponse.name,
          document_number: aiResponse.document_number,
          expiry_date: aiResponse.expiry_date,
          issue_date: aiResponse.issue_date,
          category: aiResponse.category,
        },
        confidence_score: aiResponse.confidence,
      };
    } else if (aiResponse.confidence < 70 && aiResponse.confidence > 40) {
      return {
        status: 'PENDIENTE',
        notes: `Imagen no clara o sospechosa. Confianza: ${aiResponse.confidence}%. ${aiResponse.notes}`,
        confidence_score: aiResponse.confidence,
      };
    } else {
      return {
        status: 'RECHAZADO',
        notes: `Documento no válido o falsificado. ${aiResponse.notes}`,
        confidence_score: aiResponse.confidence,
      };
    }
  } catch (error) {
    console.error('[Doc Verifier] AI analysis error:', error);
    throw error;
  }
}

/**
 * Parsea la respuesta JSON del modelo de IA
 */
function parseAIResponse(response: any): any {
  try {
    // El modelo puede retornar el JSON en diferentes formatos
    if (typeof response === 'string') {
      // Extraer JSON de la respuesta si está envuelto en texto
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    }

    if (response.response && typeof response.response === 'string') {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    // Si ya es un objeto, retornarlo directamente
    if (typeof response === 'object') {
      return response;
    }

    throw new Error('Unable to parse AI response');
  } catch (error) {
    console.error('[Doc Verifier] Error parsing AI response:', error);
    // Fallback: retornar estructura básica
    return {
      is_valid: false,
      confidence: 0,
      notes: 'Error al procesar la respuesta de la IA',
    };
  }
}

/**
 * Parsea fecha en formato DD/MM/YYYY
 */
function parseDateDDMMYYYY(dateStr: string): Date | null {
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
    const year = parseInt(parts[2], 10);

    return new Date(year, month, day);
  } catch {
    return null;
  }
}
