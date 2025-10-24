/**
 * Cloudflare AI Worker - Car Image Generator
 *
 * Genera imágenes de autos usando FLUX.1-schnell
 * Modelo: @cf/black-forest-labs/flux-1-schnell
 * Velocidad: ~2-5 segundos por imagen
 * Calidad: Alta (mejor que stock photos)
 */

export interface Env {
  AI: Ai;
}

export interface GenerateImageRequest {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  body_type?: 'sedan' | 'hatchback' | 'suv' | 'crossover' | 'pickup' | 'coupe' | 'wagon' | 'minivan';
  trim_level?: 'base' | 'lx' | 'ex' | 'sport' | 'touring' | 'limited' | 'type-r';
  angle?: 'front' | 'side' | 'rear' | '3/4-front' | 'interior';
  style?: 'showroom' | 'street' | 'studio' | 'outdoor';
  num_steps?: number; // 1-8, default 4 (balance speed/quality)
}

export interface GenerateImageResponse {
  success: boolean;
  image?: string; // Base64 encoded PNG
  error?: string;
  metadata?: {
    prompt: string;
    model: string;
    steps: number;
    duration_ms: number;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers - permitir todos los headers necesarios
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*', // Permitir todos los headers (incluyendo authorization, apikey, etc)
      'Access-Control-Max-Age': '86400', // Cache preflight por 24 horas
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const startTime = Date.now();

      // Parse request
      const body = await request.json() as GenerateImageRequest;

      // Validate required fields
      if (!body.brand || !body.model) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing required fields: brand and model',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build optimized prompt
      const prompt = buildCarPrompt(body);

      console.log('[AI Worker] Generating image:', {
        brand: body.brand,
        model: body.model,
        prompt: prompt.substring(0, 100) + '...',
      });

      // Generate image with FLUX.1-schnell
      const response = await env.AI.run(
        '@cf/black-forest-labs/flux-1-schnell',
        {
          prompt,
          num_steps: body.num_steps || 8, // 8 steps = max quality for FLUX.1-schnell
        }
      );

      const duration = Date.now() - startTime;

      console.log('[AI Worker] ✅ Image generated in', duration, 'ms');
      console.log('[AI Worker] Response type:', typeof response);
      console.log('[AI Worker] Response constructor:', response?.constructor?.name);

      // FLUX.1-schnell en Cloudflare devuelve directamente un ArrayBuffer/Blob
      // NO devuelve un objeto con { image: ... }
      let imageBuffer: ArrayBuffer;

      if (response instanceof ArrayBuffer) {
        imageBuffer = response;
        console.log('[AI Worker] Response is ArrayBuffer, size:', imageBuffer.byteLength);
      } else if (response instanceof Blob || (response && typeof response === 'object' && 'arrayBuffer' in response)) {
        // Si es un Blob, convertir a ArrayBuffer
        imageBuffer = await (response as Blob).arrayBuffer();
        console.log('[AI Worker] Converted Blob to ArrayBuffer, size:', imageBuffer.byteLength);
      } else if (response && typeof response === 'object' && 'image' in response) {
        // Fallback: si viene como objeto con campo image
        const imageData = (response as any).image;
        if (imageData instanceof ArrayBuffer) {
          imageBuffer = imageData;
        } else if (typeof imageData === 'string') {
          // Ya es base64
          return new Response(
            JSON.stringify({
              success: true,
              image: imageData,
              metadata: { prompt, model: '@cf/black-forest-labs/flux-1-schnell', steps: body.num_steps || 4, duration_ms: duration },
            } as GenerateImageResponse),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error('Unsupported image format in response.image: ' + typeof imageData);
        }
        console.log('[AI Worker] Extracted image from response object, size:', imageBuffer.byteLength);
      } else {
        throw new Error('Unsupported AI response format: ' + typeof response + ' (' + response?.constructor?.name + ')');
      }

      if (!imageBuffer || imageBuffer.byteLength === 0) {
        throw new Error('Generated image is empty (0 bytes)');
      }

      console.log('[AI Worker] Converting ArrayBuffer to base64, size:', imageBuffer.byteLength);
      const base64Image = arrayBufferToBase64(imageBuffer);
      console.log('[AI Worker] Base64 length:', base64Image.length);

      return new Response(
        JSON.stringify({
          success: true,
          image: base64Image,
          metadata: {
            prompt,
            model: '@cf/black-forest-labs/flux-1-schnell',
            steps: body.num_steps || 4,
            duration_ms: duration,
          },
        } as GenerateImageResponse),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('[AI Worker] Error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as GenerateImageResponse),
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
 * Construye un prompt optimizado para generar fotos de autos
 */
function buildCarPrompt(req: GenerateImageRequest): string {
  const parts: string[] = [];

  // 1. Año, marca, modelo, carrocería y trim
  const bodyType = req.body_type || 'sedan';
  const trimLevel = req.trim_level || 'base';

  if (req.year) {
    parts.push(`${req.year} ${req.brand} ${req.model} ${bodyType}`);
  } else {
    parts.push(`${req.brand} ${req.model} ${bodyType}`);
  }

  // Especificar trim level (importante para realismo)
  parts.push(`${trimLevel} trim, factory specifications`);

  // 2. Color (si se especifica)
  if (req.color) {
    parts.push(`in ${req.color.toLowerCase()} color`);
  }

  // 3. Ángulo de la cámara
  const anglePrompts = {
    'front': 'front view, photorealistic',
    'side': 'side profile, photorealistic',
    'rear': 'rear view, photorealistic',
    '3/4-front': '3/4 front angle, wet asphalt reflections, night urban lighting, LED headlights on, metallic paint, low camera angle, shallow DOF, cinematic, photorealistic',
    'interior': 'interior 3/4 driver POV, modern dashboard, digital screen, leather wheel, center console, blue ambient light, photorealistic',
  };
  const angle = req.angle || '3/4-front';
  parts.push(anglePrompts[angle]);

  // 4. Estilo
  const stylePrompts = {
    'showroom': 'showroom, studio lighting',
    'studio': 'white studio background',
    'street': 'urban street, daylight',
    'outdoor': 'outdoor, natural light',
  };
  const style = req.style || 'showroom';
  parts.push(stylePrompts[style]);

  // 5. Calidad
  parts.push('professional photography', 'sharp detail');

  // 6. Negative prompt (específico por ángulo)
  const negativeElements = [
    'blur', 'cartoon', 'cgi', 'plastic', 'toy',
    'people', 'text', 'logo', 'deformed', 'artifacts',
    // Por ángulo
    ...(angle === 'interior' ? ['exterior', 'fisheye'] : ['convertible', 'open-top']),
    ...(angle === '3/4-front' ? ['motion blur', 'lens flare'] : []),
  ];

  const fullPrompt = parts.join(', ');
  const negativePrompt = negativeElements.join(', ');

  // FLUX.1-schnell usa el prompt directo, no soporta negative_prompt
  // Así que lo incluimos en el prompt principal
  return `${fullPrompt}. Avoid: ${negativePrompt}`;
}

/**
 * Convierte ArrayBuffer a base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
