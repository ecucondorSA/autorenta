/**
 * Car Image Generator Worker
 *
 * Generates car images using Google Gemini (server-side).
 * Frontend calls this worker; the API key stays in Worker secrets.
 */

export interface Env {
  /** Gemini API key (set via `wrangler secret put GEMINI_API_KEY`) */
  GEMINI_API_KEY: string;
  /** Gemini model name (optional). Example: gemini-2.5-flash-image-preview */
  GEMINI_IMAGE_MODEL?: string;
  /** Optional base URL override (advanced). */
  GEMINI_API_BASE_URL?: string;

  // Legacy (no longer used): Cloudflare Workers AI binding
  AI?: Ai;
}

export interface GenerateImageRequest {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  body_type?: 'sedan' | 'hatchback' | 'suv' | 'crossover' | 'pickup' | 'coupe' | 'wagon' | 'minivan';
  trim_level?: 'base' | 'lx' | 'ex' | 'sport' | 'touring' | 'limited' | 'type-r';
  angle?: 'front' | 'side' | 'rear' | '3/4-front' | 'interior';
  /** Same id for a set of related photos (3 angles). Used to keep consistent context/color. */
  set_id?: string;
  // Allow both preset styles and free-form style strings (frontend may send a full style sentence)
  style?: 'marketplace' | 'showroom' | 'street' | 'studio' | 'outdoor' | string;
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

      const { imageBase64, modelUsed } = await generateWithGemini(env, prompt);

      const duration = Date.now() - startTime;

      console.log('[AI Worker] ✅ Image generated in', duration, 'ms');
      console.log('[AI Worker] Gemini model:', modelUsed);

      return new Response(
        JSON.stringify({
          success: true,
          image: imageBase64,
          metadata: {
            prompt,
            model: modelUsed,
            steps: 0,
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

  // Randomized capture context to avoid standardized/"AI-looking" outputs.
  const seedFromString = (input: string): number => {
    // FNV-1a 32-bit
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  };

  const mulberry32 = (seed: number) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };

  const angle = req.angle || '3/4-front';
  const setId = (req.set_id && String(req.set_id).trim().length > 0) ? String(req.set_id).trim() : '';
  const randGlobal = setId ? mulberry32(seedFromString(`set:${setId}`)) : Math.random;
  const randAngle = setId ? mulberry32(seedFromString(`set:${setId}|angle:${angle}`)) : randGlobal;

  const pickGlobal = <T,>(arr: T[]): T => arr[Math.floor(randGlobal() * arr.length)];
  const pickAngle = <T,>(arr: T[]): T => arr[Math.floor(randAngle() * arr.length)];

  const deviceProfiles = [
    'shot on iPhone 11, default camera app',
    'shot on iPhone 13, default camera app',
    'shot on Samsung Galaxy A32, default camera app',
    'shot on Samsung Galaxy A52, default camera app',
    'shot on Xiaomi Redmi Note 10, default camera app',
    'shot on Motorola Moto G, default camera app',
  ];

  const lensChoices = [
    '1x main camera lens',
    '2x zoom lens (if available)',
    '0.9x slightly wide lens',
  ];

  const photographerContexts = [
    'photographer standing at sidewalk height',
    'photographer slightly crouched, low angle',
    'photographer holding phone chest height',
    'photographer holding phone slightly above eye level',
  ];

  const framingImperfections = [
    'slight tilt, imperfect framing',
    'minor motion blur, handheld',
    'mild noise/grain, realistic phone photo',
    'compression artifacts typical of messaging apps',
    'slightly underexposed shadows, phone auto-exposure',
    'slightly overexposed highlights, phone auto-HDR',
  ];

  const locationsLatAm = [
    'border-town neighborhood street in South America, Santana do Livramento / Rivera vibe, mixed houses and small storefronts',
    'quiet residential street in Uruguay/Argentina region, parked by curb with sidewalks and walls',
    'driveway in a modest house neighborhood in Latin America, concrete floor, simple facade',
    'near a small shopfront and sidewalks in a border-town area of southern South America, street clutter',
    'rural roadside (ruta) shoulder in Uruguay/Argentina, parked safely, natural scenery in background',
  ];

  const weatherAndLight = [
    'overcast sky, soft natural light',
    'late afternoon sun, hard shadows',
    'cloudy bright day, realistic reflections',
    'golden hour, warm tint, natural light',
  ];

  const normalDirt = [
    'light road dust on lower panels and wheels (normal use)',
    'a bit of mud specks near the wheel arches (normal conditions)',
    'slightly dusty tires and rocker panels (everyday driving)',
  ];

  const environmentMustBeVisible = [
    'background must clearly show the real environment (street/curb/driveway/roadside), not isolated',
    'include pavement texture, curb line or driveway concrete, and some buildings/trees in the background',
    'do not use plain backgrounds or seamless backdrops',
  ];

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
    'front': 'front view, parked car, phone photo from sidewalk, realistic perspective',
    'side': 'full side profile, parked by curb, taken from sidewalk with phone, background visible',
    'rear': 'rear view, parked car, phone photo, background visible',
    '3/4-front': '3/4 front angle, parked by curb or driveway, handheld phone photo, varied angle and distance, realistic perspective (not cinematic)',
    'interior': 'interior photo from driver seat (or slightly behind), handheld phone photo, natural ambient light (no flash), used-car interior with slight everyday wear (light dust on mats, minor smudges), realistic dashboard/console, not a promotional render, not perfectly clean',
  };
  parts.push(anglePrompts[angle]);

  // 4. Estilo
  const stylePrompts: Record<string, string> = {
    // Default we want: realistic marketplace / used-car listing (NOT studio)
    'marketplace':
      'real smartphone photo, used car listing photo, candid, unedited, natural light, slight imperfections, everyday location (driveway or street parking), realistic reflections',
    // Specific spec: Latin America border town variability (Santana do Livramento / Uruguay / Argentina feel)
    'marketplace_latam_border_town':
      'real smartphone photo for a used car marketplace listing in Latin America (Uruguay/Argentina border town), candid and unedited, everyday street/driveway/roadside locations, non-standardized angles and framing, authentic local vibe',
    // Keep legacy keys for compatibility
    'showroom': 'professional dealership photo, clean background, controlled lighting',
    'studio': 'studio photo, white seamless background, softbox lighting',
    'street': 'street parking, daylight, realistic environment',
    'outdoor': 'outdoor natural light, realistic environment',
  };
  const style = (req.style && String(req.style).trim().length > 0) ? String(req.style).trim() : 'marketplace';
  parts.push(stylePrompts[style] ?? style);

  if (setId) {
    parts.push('same exact vehicle identity across this photo set (identical paint color and trim)');
  }

  // Add realistic, varied capture context (only for marketplace-like styles)
  if (style === 'marketplace' || style === 'marketplace_latam_border_town') {
    parts.push(
      pickGlobal(deviceProfiles),
      pickGlobal(lensChoices),
      pickAngle(photographerContexts),
      pickAngle(framingImperfections),
      pickGlobal(locationsLatAm),
      pickGlobal(weatherAndLight),
      pickGlobal(normalDirt),
      pickGlobal(environmentMustBeVisible),
    );

    // Extra hard constraints to avoid "studio/stock" looking outputs
    parts.push(
      'authentic used-car listing photo, not a catalog image',
      'do not center perfectly; allow slight off-center composition',
      'no perfect studio lighting; use natural light only',
      'license plate can exist but must be unreadable/blurred (no legible text)',
    );
  }

  // 5. Calidad
  // Marketplace realism over studio perfection
  parts.push('photorealistic', 'sharp detail', 'real camera characteristics');

  // 6. Negative prompt (específico por ángulo)
  const negativeElements = [
    'blur', 'cartoon', 'cgi', 'plastic', 'toy',
    'people', 'overlay text', 'watermark', 'branding', 'logo', 'deformed', 'artifacts',
    // Avoid studio/showroom look unless explicitly requested
    'studio backdrop', 'seamless background', 'white cyclorama', 'product photo', 'catalog photo', 'dealership studio booth',
    // Avoid obvious AI look
    'AI-generated look', 'overly perfect reflections', 'unrealistic HDR', 'hyperreal', 'render', '3d', 'cgi render',
    'perfect symmetry', 'perfect clean background', 'isolated cutout',
    'ultra sharp edge cutout',
    // Por ángulo
    ...(angle === 'interior'
      ? ['exterior', 'fisheye', 'studio interior lighting', 'ambient neon', 'perfectly spotless interior', 'luxury brochure interior']
      : ['convertible', 'open-top']),
    ...(angle === '3/4-front' ? ['motion blur', 'lens flare'] : []),
  ];

  const fullPrompt = parts.join(', ');
  const negativePrompt = negativeElements.join(', ');

  // FLUX.1-schnell usa el prompt directo, no soporta negative_prompt
  // Así que lo incluimos en el prompt principal (también funciona bien con Gemini).
  return `${fullPrompt}. Avoid: ${negativePrompt}`;
}

async function generateWithGemini(
  env: Env,
  prompt: string,
): Promise<{ imageBase64: string; modelUsed: string }> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY secret');
  }

  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview';
  const baseUrl = env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';

  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '4:3',
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json: any = await res.json().catch(() => undefined);

  const inlineData = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const base64 = inlineData?.data;

  if (!res.ok || !base64) {
    const message = json?.error?.message || json?.error || res.statusText;
    throw new Error(message || 'Gemini image generation failed');
  }

  return { imageBase64: base64, modelUsed: model };
}
