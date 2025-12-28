/**
 * Google Cloud Vision API Helper
 *
 * OCR and face detection for document verification.
 * Uses service account authentication.
 */

import { fetchWithTimeout } from './fetch-utils.ts';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export interface OcrResult {
  text: string;
  confidence: number;
  hasFace: boolean;
  faceConfidence: number | null;
  blocks: TextBlock[];
  rawResponse?: unknown;
}

export interface TextBlock {
  text: string;
  boundingBox?: BoundingBox;
  confidence: number;
}

export interface BoundingBox {
  vertices: Array<{ x: number; y: number }>;
}

interface VisionApiResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{
        confidence?: number;
        blocks?: Array<{
          paragraphs?: Array<{
            words?: Array<{
              symbols?: Array<{ text: string }>;
              confidence?: number;
            }>;
          }>;
          boundingBox?: { vertices: Array<{ x: number; y: number }> };
        }>;
      }>;
    };
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: { vertices: Array<{ x: number; y: number }> };
    }>;
    faceAnnotations?: Array<{
      detectionConfidence: number;
      boundingPoly?: { vertices: Array<{ x: number; y: number }> };
    }>;
    error?: { code: number; message: string };
  }>;
}

/**
 * Get access token using service account credentials
 */
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

  if (!serviceAccountJson) {
    // Fallback to API key if available
    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (apiKey) {
      return apiKey;
    }
    throw new Error('GOOGLE_SERVICE_ACCOUNT or GOOGLE_CLOUD_VISION_API_KEY not configured');
  }

  try {
    // Handle escaped newlines in the JSON (common issue with secrets)
    const cleanedJson = serviceAccountJson
      .replace(/\\\\n/g, '\\n')  // Double-escaped to single-escaped
      .replace(/\r\n/g, '\\n')   // Windows line endings
      .replace(/\r/g, '\\n');    // Mac line endings

    const serviceAccount = JSON.parse(cleanedJson);

    // Create JWT for service account
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-vision',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // Encode JWT parts
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    // Sign with private key
    const privateKey = serviceAccount.private_key;
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureData = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, signatureData);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      timeoutMs: 10000,
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('[VisionAPI] Service account auth failed:', error);
    throw new Error(`Service account authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert PEM private key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\n/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Call Google Cloud Vision API for OCR and face detection
 *
 * @param imageSource - Either a URL string or base64 content object
 * @returns OCR result with extracted text and face detection
 */
export async function callVisionApi(
  imageSource: string | { base64: string; mimeType?: string }
): Promise<OcrResult> {
  const accessToken = await getAccessToken();

  // Determine if using API key or OAuth token
  const isApiKey = !accessToken.startsWith('ya29.');
  const url = isApiKey
    ? `${VISION_API_URL}?key=${accessToken}`
    : VISION_API_URL;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!isApiKey) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Build image object based on source type
  let imageObject: { content?: string; source?: { imageUri: string } };

  if (typeof imageSource === 'string') {
    // URL-based (may not work for private signed URLs)
    imageObject = { source: { imageUri: imageSource } };
  } else {
    // Base64-based (more reliable)
    imageObject = { content: imageSource.base64 };
  }

  const requestBody = {
    requests: [{
      image: imageObject,
      features: [
        { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        { type: 'FACE_DETECTION', maxResults: 5 }
      ],
      imageContext: {
        languageHints: ['es', 'es-AR', 'es-EC']
      }
    }]
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    timeoutMs: 30000, // 30s for Vision API
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[VisionAPI] API error:', response.status, errorText);
    throw new Error(`Vision API error: ${response.status} - ${errorText}`);
  }

  const data: VisionApiResponse = await response.json();
  const result = data.responses[0];

  if (result.error) {
    throw new Error(`Vision API error: ${result.error.message}`);
  }

  // Extract text blocks with confidence
  const blocks: TextBlock[] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  if (result.fullTextAnnotation?.pages) {
    for (const page of result.fullTextAnnotation.pages) {
      if (page.confidence) {
        totalConfidence += page.confidence;
        confidenceCount++;
      }
      if (page.blocks) {
        for (const block of page.blocks) {
          const blockText = block.paragraphs
            ?.map(p => p.words?.map(w => w.symbols?.map(s => s.text).join('')).join(' '))
            .join('\n') || '';

          if (blockText) {
            blocks.push({
              text: blockText,
              boundingBox: block.boundingBox,
              confidence: page.confidence || 0.8,
            });
          }
        }
      }
    }
  }

  // Face detection results
  const faces = result.faceAnnotations || [];
  const hasFace = faces.length > 0;
  const faceConfidence = hasFace ? faces[0].detectionConfidence : null;

  return {
    text: result.fullTextAnnotation?.text || '',
    confidence: confidenceCount > 0 ? (totalConfidence / confidenceCount) * 100 : 80,
    hasFace,
    faceConfidence: faceConfidence ? faceConfidence * 100 : null,
    blocks,
  };
}

/**
 * Simplified OCR call - just get text
 */
export async function extractText(imageUrl: string): Promise<string> {
  const result = await callVisionApi(imageUrl);
  return result.text;
}
