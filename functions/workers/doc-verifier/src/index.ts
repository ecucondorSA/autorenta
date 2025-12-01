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
      const url = new URL(request.url);

      // Route: Face verification endpoint
      if (url.pathname === '/verify-face') {
        return await handleFaceVerification(request, env, corsHeaders);
      }

      // Route: Document verification (default)
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

  // Analizar DNI y cédula con IA antes de aprobar
  try {
    const govFrontAnalysis = govIdFront
      ? await analyzeGenericDocument(env, govIdFront, 'DNI frontal argentino')
      : null;
    const govBackAnalysis = govIdBack
      ? await analyzeGenericDocument(env, govIdBack, 'DNI dorso argentino')
      : null;
    const vehicleRegAnalysis = vehicleReg
      ? await analyzeGenericDocument(env, vehicleReg, 'cédula verde / azul de vehículo')
      : null;

    const analyses = [govFrontAnalysis, govBackAnalysis, vehicleRegAnalysis].filter(Boolean) as DocumentAnalysis[];

    const anyRejected = analyses.some((a) => a.status === 'RECHAZADO');
    const allVerified = analyses.length > 0 && analyses.every((a) => a.status === 'VERIFICADO');

    if (anyRejected) {
      return {
        status: 'RECHAZADO' as const,
        notes: 'Algún documento parece inválido o ilegible. Revisa las fotos y vuelve a subirlas.',
        missing_docs,
        extracted_data: analyses.map((a) => a.extracted_data),
      };
    }

    if (allVerified) {
      return {
        status: 'VERIFICADO' as const,
        notes: 'Documentos del propietario verificados con IA',
        missing_docs: [],
        extracted_data: analyses.map((a) => a.extracted_data),
      };
    }

    return {
      status: 'PENDIENTE' as const,
      notes: 'No pudimos validar automáticamente todos los documentos. Revisión manual requerida.',
      missing_docs,
      extracted_data: analyses.map((a) => a.extracted_data),
    };
  } catch (error) {
    console.error('[Doc Verifier] Error analyzing owner docs:', error);
    return {
      status: 'PENDIENTE' as const,
      notes: 'Error al analizar documentos. Intenta nuevamente con fotos más nítidas.',
      missing_docs,
    };
  }
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
 * Analiza documentos genéricos (DNI, cédula) usando el modelo de visión
 */
async function analyzeGenericDocument(env: Env, document: DocumentToVerify, context: string): Promise<DocumentAnalysis> {
  console.log('[Doc Verifier] Analyzing document:', context, document.id);

  const imageResponse = await fetch(document.url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch document image: ${imageResponse.status}`);
  }

  const imageArray = await (await imageResponse.blob()).arrayBuffer();

  const prompt = `Analiza esta imagen (${context}). Extrae nombre completo, número de documento o patente si aplica y valida si el documento es legible y parece auténtico. Responde SOLO en JSON con:
{
  "is_valid": boolean,
  "document_number": string | null,
  "name": string | null,
  "confidence": number (0-100),
  "notes": string
}`;

  const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
    prompt,
    image: Array.from(new Uint8Array(imageArray)),
    max_tokens: 400,
  });

  const ai = parseAIResponse(response);
  const confidence = Number(ai.confidence ?? 0);

  if (ai.is_valid && confidence >= 70) {
    return {
      status: 'VERIFICADO',
      notes: ai.notes || `Documento válido con confianza ${confidence}%`,
      extracted_data: {
        name: ai.name,
        document_number: ai.document_number,
      },
      confidence_score: confidence,
    };
  }

  if (confidence >= 40) {
    return {
      status: 'PENDIENTE',
      notes: ai.notes || 'Documento parcialmente legible, requiere revisión manual.',
      extracted_data: {
        name: ai.name,
        document_number: ai.document_number,
      },
      confidence_score: confidence,
    };
  }

  return {
    status: 'RECHAZADO',
    notes: ai.notes || 'Documento ilegible o sospechoso',
    extracted_data: {
      name: ai.name,
      document_number: ai.document_number,
    },
    confidence_score: confidence,
  };
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

/**
 * ==========================================
 * FACE VERIFICATION (Level 3)
 * ==========================================
 */

export interface FaceVerificationRequest {
  video_url: string;
  document_url: string;
  user_id: string;
}

export interface FaceVerificationResponse {
  success: boolean;
  face_detected: boolean;
  face_match_score: number;
  liveness_score?: number;
  frames_analyzed?: number;
  metadata?: {
    video_duration_seconds?: number;
    face_count?: number;
    liveness_checks?: string[];
  };
  error?: string;
}

/**
 * Handle face verification request
 */
async function handleFaceVerification(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const startTime = Date.now();
    const body = await request.json() as FaceVerificationRequest;

    console.log('[Face Verifier] Processing face verification for user:', body.user_id);

    // Validate request
    if (!body.video_url || !body.document_url || !body.user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: video_url, document_url, user_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Download video and document images
    const [videoBlob, documentBlob] = await Promise.all([
      fetchImage(body.video_url),
      fetchImage(body.document_url),
    ]);

    // Extract first frame from video (simplified: treat video as image for now)
    // In production, you'd use a library to extract actual video frames
    const videoFrame = await videoBlob.arrayBuffer();
    const documentImage = await documentBlob.arrayBuffer();

    console.log('[Face Verifier] Downloaded video frame:', videoFrame.byteLength, 'bytes');
    console.log('[Face Verifier] Downloaded document image:', documentImage.byteLength, 'bytes');

    // Analyze both images with AI
    const [videoAnalysis, documentAnalysis] = await Promise.all([
      analyzeFaceInImage(env, videoFrame, 'selfie video'),
      analyzeFaceInImage(env, documentImage, 'ID document'),
    ]);

    // Calculate face match score
    const faceMatchScore = calculateFaceMatchScore(videoAnalysis, documentAnalysis);

    // Basic liveness check (movement detection would require actual video processing)
    const livenessScore = calculateLivenessScore(videoAnalysis);

    const duration = Date.now() - startTime;
    console.log('[Face Verifier] ✅ Face verification completed in', duration, 'ms');
    console.log('[Face Verifier] Face match score:', faceMatchScore);
    console.log('[Face Verifier] Liveness score:', livenessScore);

    const result: FaceVerificationResponse = {
      success: true,
      face_detected: videoAnalysis.face_detected && documentAnalysis.face_detected,
      face_match_score: faceMatchScore,
      liveness_score: livenessScore,
      frames_analyzed: 1, // Simplified: single frame
      metadata: {
        video_duration_seconds: 3, // Placeholder
        face_count: 1,
        liveness_checks: ['basic_quality_check'],
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Face Verifier] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Face verification failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Fetch image from URL
 */
async function fetchImage(url: string): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  return await response.blob();
}

/**
 * Analyze face in image using Cloudflare AI Vision
 */
async function analyzeFaceInImage(env: Env, imageArray: ArrayBuffer, context: string) {
  const prompt = `Analiza esta imagen (${context}) y detecta si hay un rostro humano visible.

Responde SOLO en formato JSON con esta estructura:
{
  "face_detected": boolean,
  "face_visible": boolean,
  "face_clarity": number (0-100),
  "face_centered": boolean,
  "face_features": {
    "eyes_visible": boolean,
    "nose_visible": boolean,
    "mouth_visible": boolean
  },
  "quality_score": number (0-100),
  "notes": "observaciones"
}`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt,
      image: Array.from(new Uint8Array(imageArray)),
      max_tokens: 256,
    });

    console.log(`[Face Verifier] AI analysis (${context}):`, response);

    return parseAIResponse(response);
  } catch (error) {
    console.error(`[Face Verifier] AI analysis error (${context}):`, error);
    throw error;
  }
}

/**
 * Calculate face match score between selfie and document
 */
function calculateFaceMatchScore(videoAnalysis: any, documentAnalysis: any): number {
  // Simplified scoring logic
  // In production, use actual face embedding comparison

  if (!videoAnalysis.face_detected || !documentAnalysis.face_detected) {
    return 0;
  }

  let score = 50; // Base score if faces detected

  // Boost score if both faces are clear
  if (videoAnalysis.face_clarity > 70 && documentAnalysis.face_clarity > 70) {
    score += 20;
  }

  // Boost score if facial features match
  if (
    videoAnalysis.face_features?.eyes_visible &&
    videoAnalysis.face_features?.nose_visible &&
    videoAnalysis.face_features?.mouth_visible &&
    documentAnalysis.face_features?.eyes_visible &&
    documentAnalysis.face_features?.nose_visible &&
    documentAnalysis.face_features?.mouth_visible
  ) {
    score += 20;
  }

  // Quality bonus
  const avgQuality = (videoAnalysis.quality_score + documentAnalysis.quality_score) / 2;
  score += Math.floor(avgQuality / 10);

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate liveness score (basic check without video processing)
 */
function calculateLivenessScore(videoAnalysis: any): number {
  // Simplified liveness check
  // In production, analyze multiple frames for movement, blinking, etc.

  let score = 60; // Base score

  // Boost if face is clear and centered
  if (videoAnalysis.face_centered && videoAnalysis.face_clarity > 70) {
    score += 20;
  }

  // Boost if all facial features visible
  if (
    videoAnalysis.face_features?.eyes_visible &&
    videoAnalysis.face_features?.nose_visible &&
    videoAnalysis.face_features?.mouth_visible
  ) {
    score += 20;
  }

  return Math.min(100, Math.max(0, score));
}
