/**
 * AWS Rekognition Helper para Deno Edge Functions
 *
 * Proporciona comparación facial usando Amazon Rekognition CompareFaces
 * sin depender del SDK completo de AWS.
 *
 * Requiere variables de entorno:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (default: us-east-1)
 */

const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID') || '';
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY') || '';

interface CompareFacesResult {
  success: boolean;
  similarity?: number;
  sourceConfidence?: number;
  targetConfidence?: number;
  error?: string;
}

/**
 * HMAC-SHA256 signing
 */
async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

/**
 * SHA-256 hash
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get signing key for AWS Signature v4
 */
async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(
    new TextEncoder().encode('AWS4' + secretKey),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

/**
 * Create AWS Signature v4 authorization header
 */
async function createAwsSignature(
  method: string,
  host: string,
  uri: string,
  queryString: string,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string,
  service: string
): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  // Canonical headers
  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n';

  // Canonical request
  const payloadHash = await sha256(payload);
  const canonicalRequest = [
    method,
    uri,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  // Signature
  const signingKey = await getSigningKey(secretKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * Compara dos rostros usando Amazon Rekognition
 *
 * @param sourceImageBase64 - Imagen del documento (con rostro de referencia)
 * @param targetImageBase64 - Imagen del selfie/video (rostro a comparar)
 * @param similarityThreshold - Umbral mínimo de similitud (default: 70)
 * @returns Resultado de la comparación con score de similitud
 */
export async function compareFaces(
  sourceImageBase64: string,
  targetImageBase64: string,
  similarityThreshold: number = 70
): Promise<CompareFacesResult> {
  // Verificar credenciales
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error('[Rekognition] AWS credentials not configured');
    return {
      success: false,
      error: 'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
    };
  }

  const host = `rekognition.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}`;
  const service = 'rekognition';

  // Payload para CompareFaces
  const payload = JSON.stringify({
    SourceImage: {
      Bytes: sourceImageBase64,
    },
    TargetImage: {
      Bytes: targetImageBase64,
    },
    SimilarityThreshold: similarityThreshold,
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-amz-json-1.1',
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': 'RekognitionService.CompareFaces',
  };

  try {
    // Crear firma AWS Signature v4
    const authorization = await createAwsSignature(
      'POST',
      host,
      '/',
      '',
      headers,
      payload,
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      service
    );

    console.log('[Rekognition] Calling CompareFaces API...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Authorization': authorization,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Rekognition] API error:', response.status, errorText);

      // Parsear error de AWS
      try {
        const errorJson = JSON.parse(errorText);
        return {
          success: false,
          error: errorJson.message || errorJson.Message || `AWS error: ${response.status}`,
        };
      } catch {
        return {
          success: false,
          error: `AWS Rekognition error: ${response.status}`,
        };
      }
    }

    const result = await response.json();

    console.log('[Rekognition] Response:', JSON.stringify(result, null, 2));

    // Verificar si hay faces coincidentes
    if (result.FaceMatches && result.FaceMatches.length > 0) {
      const bestMatch = result.FaceMatches[0];
      return {
        success: true,
        similarity: bestMatch.Similarity,
        sourceConfidence: result.SourceImageFace?.Confidence,
        targetConfidence: bestMatch.Face?.Confidence,
      };
    }

    // No hay coincidencias
    if (result.UnmatchedFaces && result.UnmatchedFaces.length > 0) {
      return {
        success: true,
        similarity: 0,
        sourceConfidence: result.SourceImageFace?.Confidence,
        error: 'Los rostros no coinciden',
      };
    }

    // No se detectaron rostros
    return {
      success: false,
      error: 'No se detectaron rostros en una o ambas imágenes',
    };
  } catch (error) {
    console.error('[Rekognition] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Verifica si AWS Rekognition está configurado
 */
export function isRekognitionConfigured(): boolean {
  return Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);
}

/**
 * Detecta rostros en una imagen usando Rekognition
 * Útil para validar que hay exactamente un rostro
 */
export async function detectFaces(
  imageBase64: string
): Promise<{
  success: boolean;
  faceCount?: number;
  confidence?: number;
  error?: string;
}> {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return { success: false, error: 'AWS credentials not configured' };
  }

  const host = `rekognition.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}`;

  const payload = JSON.stringify({
    Image: {
      Bytes: imageBase64,
    },
    Attributes: ['DEFAULT'],
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-amz-json-1.1',
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': 'RekognitionService.DetectFaces',
  };

  try {
    const authorization = await createAwsSignature(
      'POST',
      host,
      '/',
      '',
      headers,
      payload,
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      'rekognition'
    );

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Authorization': authorization,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `AWS error: ${response.status}` };
    }

    const result = await response.json();

    return {
      success: true,
      faceCount: result.FaceDetails?.length || 0,
      confidence: result.FaceDetails?.[0]?.Confidence,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
