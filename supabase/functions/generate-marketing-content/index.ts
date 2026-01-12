/**
 * Generate Marketing Content Edge Function
 *
 * Uses Gemini 2.5 Flash for text generation and Imagen 3 for image generation.
 * Generates social media posts for AutoRentar marketing automation.
 *
 * POST /generate-marketing-content
 *   Body: {
 *     content_type: 'tip' | 'promo' | 'car_spotlight' | 'testimonial' | 'seasonal',
 *     platform: 'tiktok' | 'instagram' | 'facebook' | 'twitter',
 *     car_id?: string,
 *     theme?: string,
 *     language?: 'es' | 'pt'
 *   }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

type ContentType = 'tip' | 'promo' | 'car_spotlight' | 'testimonial' | 'seasonal' | 'community';
type Platform = 'tiktok' | 'instagram' | 'facebook' | 'twitter';
type Language = 'es' | 'pt';

interface GenerateContentRequest {
  content_type: ContentType;
  platform: Platform;
  car_id?: string;
  theme?: string;
  language?: Language;
  generate_image?: boolean;
  generate_video?: boolean; // For TikTok - uses Veo 3.1
}

interface GeneratedContent {
  success: boolean;
  text: {
    caption: string;
    hashtags: string[];
    call_to_action: string;
  };
  image?: {
    url?: string;
    base64?: string;
  };
  video?: {
    url?: string;
    operation_id?: string; // For async video generation
    status?: 'generating' | 'ready' | 'failed';
    error?: string; // Error message if video generation failed
    model_used?: string; // Which Veo model was used
  };
  suggested_post_time?: string;
  error?: string;
}

interface CarData {
  id: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  daily_price: number;
  images?: string[];
  city?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-3-flash-preview'; // Latest Gemini 3 model (Jan 2026)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Platform-specific constraints
const PLATFORM_LIMITS: Record<Platform, { maxChars: number; maxHashtags: number; style: string }> = {
  tiktok: { maxChars: 150, maxHashtags: 5, style: 'casual, trendy, with emojis' },
  instagram: { maxChars: 2200, maxHashtags: 30, style: 'engaging, visual-focused, lifestyle' },
  facebook: { maxChars: 500, maxHashtags: 5, style: 'conversational, community-focused' },
  twitter: { maxChars: 280, maxHashtags: 3, style: 'concise, punchy, news-like' },
};

// Content type templates
const CONTENT_TEMPLATES: Record<ContentType, string> = {
  tip: `Genera un consejo útil para {audience} sobre alquiler de autos entre personas.
    Tono: {style}
    Incluye un emoji relevante al inicio.
    Termina con un call-to-action sutil hacia AutoRentar.`,

  promo: `Genera un post promocional para AutoRentar.
    Destaca: ahorro vs rentadoras tradicionales, facilidad de uso, confianza.
    Tono: {style}
    Incluye oferta o beneficio específico.
    Call-to-action claro al final.`,

  car_spotlight: `Genera un post destacando este vehículo disponible en AutoRentar:
    {car_details}
    Tono: {style}
    Destaca características únicas y precio atractivo.
    Incluye call-to-action para reservar.`,

  testimonial: `Genera un post estilo testimonial/historia de éxito de un usuario de AutoRentar.
    Historia: {theme}
    Tono: {style}
    Debe sonar auténtico y relatable.
    Termina invitando a probar la plataforma.`,

  seasonal: `Genera un post para la temporada/evento: {theme}
    Relacionado con alquiler de autos para {theme}.
    Tono: {style}
    Incluye oferta estacional si aplica.
    Call-to-action relevante.`,

  community: `Genera un post de engagement para la comunidad de AutoRentar.
    Pregunta o encuesta sobre: preferencias de viaje, experiencias, tips.
    Tono: {style}
    Invita a comentar y compartir.`,
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: GenerateContentRequest = await req.json();
    const { content_type, platform, car_id, theme, language = 'es', generate_image = false, generate_video = false } = request;

    // Validate required fields
    if (!content_type || !platform) {
      throw new Error('content_type and platform are required');
    }

    console.log(`[generate-marketing-content] Generating ${content_type} for ${platform}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get car data if needed
    let carData: CarData | null = null;
    if (car_id || content_type === 'car_spotlight') {
      carData = await getCarData(supabase, car_id);
    }

    // Get random car if spotlight without specific car
    if (content_type === 'car_spotlight' && !carData) {
      carData = await getRandomAvailableCar(supabase);
    }

    // Generate text content with Gemini
    const textContent = await generateTextContent({
      content_type,
      platform,
      carData,
      theme,
      language,
    });

    // Generate image if requested
    let imageContent: { url?: string; base64?: string } | undefined;
    if (generate_image) {
      imageContent = await generateMarketingImage(carData, content_type);
    }

    // Generate video if requested (for TikTok)
    let videoContent: { url?: string; operation_id?: string; status?: 'generating' | 'ready' | 'failed' } | undefined;
    if (generate_video || platform === 'tiktok') {
      videoContent = await generateMarketingVideo(textContent.caption, carData, content_type);
    }

    // Calculate suggested post time
    const suggestedTime = getSuggestedPostTime(platform);

    const response: GeneratedContent = {
      success: true,
      text: textContent,
      image: imageContent,
      video: videoContent,
      suggested_post_time: suggestedTime,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-marketing-content] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================================
// TEXT GENERATION WITH GEMINI
// ============================================================================

async function generateTextContent(params: {
  content_type: ContentType;
  platform: Platform;
  carData: CarData | null;
  theme?: string;
  language: Language;
}): Promise<{ caption: string; hashtags: string[]; call_to_action: string }> {
  const { content_type, platform, carData, theme, language } = params;
  const platformConfig = PLATFORM_LIMITS[platform];

  // Build the prompt
  let template = CONTENT_TEMPLATES[content_type];
  template = template.replace('{style}', platformConfig.style);
  template = template.replace('{theme}', theme || 'viajes y experiencias');
  template = template.replace(
    '{audience}',
    content_type === 'tip' && Math.random() > 0.5 ? 'propietarios de autos' : 'arrendatarios'
  );

  if (carData) {
    const carDetails = `
      Marca: ${carData.brand}
      Modelo: ${carData.model}
      Año: ${carData.year}
      ${carData.color ? `Color: ${carData.color}` : ''}
      Precio por día: $${carData.daily_price} USD
      ${carData.city ? `Ubicación: ${carData.city}` : ''}
    `;
    template = template.replace('{car_details}', carDetails);
  }

  const systemPrompt = `Eres un experto en marketing de redes sociales para AutoRentar, una plataforma de alquiler de autos entre personas en Latinoamérica.

REGLAS:
- Idioma: ${language === 'es' ? 'Español latinoamericano' : 'Portugués brasileño'}
- Máximo ${platformConfig.maxChars} caracteres para el caption
- Máximo ${platformConfig.maxHashtags} hashtags relevantes
- Tono: ${platformConfig.style}
- NUNCA inventar precios o datos falsos
- SIEMPRE incluir @autorentar o mencionar la marca
- Los hashtags deben ser en ${language === 'es' ? 'español' : 'portugués'}

FORMATO DE RESPUESTA (JSON):
{
  "caption": "texto del post sin hashtags",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "call_to_action": "frase de call-to-action"
}`;

  const userPrompt = template;

  // Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('No response from Gemini');
  }

  // Parse JSON response
  try {
    const parsed = JSON.parse(textResponse);
    return {
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || [],
      call_to_action: parsed.call_to_action || '',
    };
  } catch {
    // If JSON parsing fails, try to extract content
    console.warn('[generate-marketing-content] Failed to parse JSON, using raw response');
    return {
      caption: textResponse.substring(0, platformConfig.maxChars),
      hashtags: ['autorentar', 'alquilerdeautos'],
      call_to_action: 'Descubre más en autorentar.com',
    };
  }
}

// ============================================================================
// IMAGE GENERATION WITH LATAM CONTEXT
// ============================================================================

// LATAM Diversity - People prompts for marketing images
const LATAM_PEOPLE_SCENES = [
  // Young woman (25) - urban park
  'young latin american woman (25 years old) smiling naturally, casual clothing, city park in Buenos Aires background, friendly and approachable, amateur phone photo quality',
  // Middle-aged man (40) - urban street
  'middle-aged latin american man (40 years old) with beard, smiling warmly, wearing casual t-shirt, urban street in Montevideo background, authentic look',
  // Young man (22) - energetic
  'young latin american man (22 years old) laughing, casual style with cap, sunny day outdoors in Cordoba Argentina, high energy vibe',
  // Senior woman (60) - garden
  'senior latin american woman (60 years old) smiling gently, garden background with jacaranda trees, natural light, warm grandmotherly vibe',
  // Couple traveling
  'young latin american couple (25-35 years old) joyfully looking at camera, coastal road in Uruguay like Punta del Este background, travel vibe',
  // Car owner proud
  'confident latin american car owner (30-45 years old) leaning against car, residential street Buenos Aires, metal gate and colorful wall background',
];

// LATAM Locations for backgrounds
const LATAM_LOCATIONS = [
  'San Telmo Buenos Aires cobblestone street warm afternoon light',
  'Colonia del Sacramento Uruguay colonial architecture',
  'Punta del Este Uruguay coastal road sunny day',
  'Palermo Buenos Aires tree-lined street jacaranda trees',
  'Montevideo Uruguay rambla waterfront sunset',
  'Mendoza Argentina wine country mountains background',
  'Mar del Plata Argentina beach boardwalk',
  'Rosario Argentina riverside costanera',
];

// Marketing image prompts by content type
const MARKETING_IMAGE_PROMPTS: Record<ContentType, string[]> = {
  tip: [
    'Phone photo of {person}, giving thumbs up next to a clean modern car, {location}, amateur quality, realistic',
    'Selfie style photo of {person}, inside car showing dashboard, LEFT HAND DRIVE, {location} visible through window',
    'Casual photo of {person}, checking tire or car exterior, {location}, helpful educational vibe',
  ],
  promo: [
    'Exciting photo of {person}, keys in hand standing next to modern sedan, {location}, celebration vibe, amateur phone quality',
    'Happy {person}, opening car door ready for adventure, {location}, promotional energy',
    'Group of friends ({person} style), gathered around car trunk with luggage, {location}, road trip excitement',
  ],
  car_spotlight: [
    'Beautiful photo of modern car parked on {location}, golden hour light, amateur phone photo quality, no people',
    'Clean car 3/4 view parked safely by curb, {location}, afternoon light, realistic phone camera',
    'Car interior from backseat, LEFT HAND DRIVE, steering wheel on left, parked at {location}, clean and inviting',
  ],
  testimonial: [
    'Candid photo of {person}, smiling next to car they rented, {location}, genuine happiness, phone photo quality',
    'Natural photo of {person}, giving car keys to another person, friendly exchange, {location}',
    '{person} taking selfie inside rented car, happy expression, {location} visible outside, authentic',
  ],
  seasonal: [
    'Summer vibes: {person} with sunglasses near car, {location}, beach or vacation energy, phone photo',
    'Holiday road trip: car packed with luggage, {location}, festive atmosphere, amateur quality',
    'Weekend getaway: {person} stretching happily next to parked car, scenic {location}, relaxed vibe',
  ],
  community: [
    'Friendly {person} waving from car window, {location}, welcoming community vibe, phone photo',
    'Group selfie of diverse latin american friends near car, {location}, community gathering energy',
    '{person} showing phone screen (blur) next to car, sharing experience vibe, {location}',
  ],
};

async function generateMarketingImage(
  carData: CarData | null,
  contentType: ContentType
): Promise<{ url?: string; base64?: string } | undefined> {
  // If car has existing images and it's car_spotlight, use them
  if (carData?.images && carData.images.length > 0 && contentType === 'car_spotlight') {
    return { url: carData.images[0] };
  }

  // Generate with Gemini 2.5 Flash Image
  if (!GEMINI_API_KEY) {
    console.log('[generate-marketing-content] No Gemini API key, skipping image generation');
    return undefined;
  }

  try {
    // Select random elements for diversity
    const person = LATAM_PEOPLE_SCENES[Math.floor(Math.random() * LATAM_PEOPLE_SCENES.length)];
    const location = LATAM_LOCATIONS[Math.floor(Math.random() * LATAM_LOCATIONS.length)];
    const promptTemplates = MARKETING_IMAGE_PROMPTS[contentType];
    const promptTemplate = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

    // Build final prompt with car details if available
    let finalPrompt = promptTemplate
      .replace('{person}', person)
      .replace('{location}', location);

    if (carData) {
      finalPrompt += `. The car is a ${carData.color || 'silver'} ${carData.brand} ${carData.model} ${carData.year}.`;
    }

    // Add style guidelines
    finalPrompt += ' Style: realistic amateur phone photo, not stock photography, authentic Latin American vibe.';

    console.log('[generate-marketing-content] Generating image with prompt:', finalPrompt.substring(0, 100) + '...');

    // Call Gemini 2.5 Flash Image for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1' }, // Square for social media
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-marketing-content] Gemini image error:', errorText);
      return undefined;
    }

    const data = await response.json();
    const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Data) {
      console.warn('[generate-marketing-content] No image data in response');
      return undefined;
    }

    console.log('[generate-marketing-content] Image generated successfully');
    return { base64: base64Data };
  } catch (error) {
    console.error('[generate-marketing-content] Image generation error:', error);
    return undefined;
  }
}

// ============================================================================
// VIDEO GENERATION WITH VEO (with fallback chain)
// ============================================================================

// Veo models - try in order (3.1 preview → 3.0 stable → 2.0 stable)
const VEO_MODELS = [
  { id: 'veo-3.1-generate-preview', name: 'Veo 3.1', cost: '$0.40/s' },
  { id: 'veo-3.0-generate-001', name: 'Veo 3.0', cost: '$0.35/s' },
  { id: 'veo-2.0-generate-001', name: 'Veo 2.0', cost: '$0.25/s' },
];

// Video prompts for TikTok marketing
const TIKTOK_VIDEO_PROMPTS: Record<ContentType, string[]> = {
  tip: [
    'A confident Latin American person in their 30s giving car rental tips directly to camera, friendly smile, natural lighting, urban Buenos Aires street background, vertical 9:16 format, casual vlog style, speaks in Spanish',
    'Close-up of hands demonstrating car inspection before rental, clean modern sedan, Latin American setting, educational tone, vertical format',
    'Young Latin American couple checking a rental car together, pointing at tires and mirrors, helpful tutorial vibe, sunny day in Argentina',
  ],
  promo: [
    'Excited Latin American person (25-35) receiving car keys, genuine happiness, modern car in background, celebratory moment, urban setting, vertical 9:16 format',
    'Time-lapse of booking a car on phone app, then cut to person driving happily on scenic Argentine road, fast-paced promo style',
    'Multiple quick cuts: app interface, key handover, driving scenes, happy customers, energetic marketing video style',
  ],
  car_spotlight: [
    'Cinematic slow motion walk-around of a modern sedan, {car_description}, golden hour lighting, Argentine cityscape, vertical format, luxury feel',
    'Interior reveal of car, leather seats, dashboard features, smooth camera movement, aspirational lifestyle content',
    'Car driving through scenic route in Mendoza wine country, cinematic aerial-style shots, premium vehicle showcase',
  ],
  testimonial: [
    'Real-looking testimonial: Latin American person (30-45) speaking to camera about their car rental experience, living room or outdoor cafe setting, authentic and warm',
    'Split screen: customer talking about their trip, B-roll of the car and destination, heartfelt story format',
    'Before/after style: person stressed about transportation, then happy driving a rental car, transformation narrative',
  ],
  seasonal: [
    'Summer road trip vibes: friends loading luggage into car trunk, beach gear visible, excited energy, Punta del Este coastal vibes',
    'Holiday season: family arriving at vacation destination by car, warm reunion moments, festive atmosphere',
    'Long weekend getaway: couple driving through scenic mountains, romantic adventure energy, aspirational travel content',
  ],
  community: [
    'Interactive-style video: Latin American host asking viewers questions about travel preferences, engaging eye contact, call-to-action to comment',
    'Behind-the-scenes of car owner preparing their vehicle for rental, community trust building, authentic content',
    'Montage of different AutoRentar users waving and saying hello, community celebration, diverse Latin American faces',
  ],
};

interface VideoResult {
  url?: string;
  operation_id?: string;
  status?: 'generating' | 'ready' | 'failed';
  error?: string;
  model_used?: string;
}

async function generateMarketingVideo(
  caption: string,
  carData: CarData | null,
  contentType: ContentType
): Promise<VideoResult | undefined> {
  if (!GEMINI_API_KEY) {
    console.log('[generate-marketing-content] No Gemini API key, skipping video generation');
    return { status: 'failed', error: 'No GEMINI_API_KEY configured' };
  }

  // Build video prompt
  const promptTemplates = TIKTOK_VIDEO_PROMPTS[contentType];
  let videoPrompt = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

  if (carData) {
    const carDescription = `${carData.color || 'silver'} ${carData.brand} ${carData.model} ${carData.year}`;
    videoPrompt = videoPrompt.replace('{car_description}', carDescription);
  } else {
    videoPrompt = videoPrompt.replace('{car_description}', 'modern silver sedan');
  }

  videoPrompt += ` This is a marketing video for AutoRentar, a peer-to-peer car rental platform in Latin America. The video should feel authentic, not stock footage. Caption context: "${caption.substring(0, 100)}..."`;

  // Try each Veo model in order
  const errors: string[] = [];

  for (const model of VEO_MODELS) {
    console.log(`[generate-marketing-content] Trying video generation with ${model.name}...`);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:predictLongRunning?key=${GEMINI_API_KEY}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: videoPrompt }],
          parameters: {
            aspectRatio: '9:16',
            durationSeconds: 8,
            sampleCount: 1,
            generateAudio: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `${model.name} (${response.status}): ${errorText.substring(0, 200)}`;
        console.error(`[generate-marketing-content] ${errorMsg}`);
        errors.push(errorMsg);

        // If 403/404, try next model
        if (response.status === 403 || response.status === 404 || response.status === 400) {
          continue;
        }
        // For other errors, stop trying
        break;
      }

      // Success! Start polling
      const operationData = await response.json();
      const operationName = operationData.name;

      console.log(`[generate-marketing-content] ${model.name} started, operation:`, operationName);

      // Poll for completion (max 55s for Edge Function timeout)
      const maxPollTime = 55000;
      const pollInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxPollTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GEMINI_API_KEY}`
        );

        if (!pollResponse.ok) {
          console.error('[generate-marketing-content] Poll error:', await pollResponse.text());
          continue;
        }

        const pollData = await pollResponse.json();

        if (pollData.done) {
          if (pollData.error) {
            console.error('[generate-marketing-content] Video generation failed:', pollData.error);
            return {
              status: 'failed',
              operation_id: operationName,
              error: pollData.error.message || 'Video generation failed',
              model_used: model.name,
            };
          }

          const videoFile = pollData.response?.generatedVideos?.[0]?.video;
          if (videoFile) {
            console.log(`[generate-marketing-content] Video generated with ${model.name}`);
            return {
              url: videoFile.uri || videoFile.name,
              operation_id: operationName,
              status: 'ready',
              model_used: model.name,
            };
          }
        }
      }

      // Timeout - return async status
      console.log('[generate-marketing-content] Video still generating, returning for async');
      return {
        operation_id: operationName,
        status: 'generating',
        model_used: model.name,
      };

    } catch (error) {
      const errorMsg = `${model.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[generate-marketing-content] ${errorMsg}`);
      errors.push(errorMsg);
      continue;
    }
  }

  // All models failed
  const combinedError = errors.length > 0
    ? `Video generation failed. Tried: ${errors.join(' | ')}`
    : 'All Veo models unavailable';

  console.error('[generate-marketing-content]', combinedError);

  // Return detailed error for frontend
  return {
    status: 'failed',
    error: combinedError.includes('403')
      ? 'Veo API requiere billing habilitado en Google AI Studio. Ve a aistudio.google.com → Settings → Billing para habilitar.'
      : combinedError,
  };
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function getCarData(
  supabase: ReturnType<typeof createClient>,
  carId?: string
): Promise<CarData | null> {
  if (!carId) return null;

  const { data, error } = await supabase
    .from('cars')
    .select('id, brand, model, year, color, daily_price, images, city')
    .eq('id', carId)
    .single();

  if (error || !data) {
    console.warn(`[generate-marketing-content] Car ${carId} not found`);
    return null;
  }

  return data as CarData;
}

async function getRandomAvailableCar(
  supabase: ReturnType<typeof createClient>
): Promise<CarData | null> {
  const { data, error } = await supabase
    .from('cars')
    .select('id, brand, model, year, color, daily_price, images, city')
    .eq('status', 'active')
    .eq('is_available', true)
    .limit(10);

  if (error || !data || data.length === 0) {
    console.warn('[generate-marketing-content] No available cars found');
    return null;
  }

  // Return random car from results
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex] as CarData;
}

// ============================================================================
// SCHEDULING HELPERS
// ============================================================================

function getSuggestedPostTime(platform: Platform): string {
  // Best posting times for Argentina (UTC-3)
  const bestTimes: Record<Platform, { hour: number; minute: number }[]> = {
    tiktok: [
      { hour: 9, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 19, minute: 0 },
    ],
    instagram: [
      { hour: 12, minute: 0 },
      { hour: 17, minute: 0 },
      { hour: 21, minute: 0 },
    ],
    facebook: [
      { hour: 13, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 20, minute: 0 },
    ],
    twitter: [
      { hour: 8, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 17, minute: 0 },
    ],
  };

  const times = bestTimes[platform];
  const randomTime = times[Math.floor(Math.random() * times.length)];

  // Create date for tomorrow at the suggested time (Argentina timezone)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(randomTime.hour + 3, randomTime.minute, 0, 0); // +3 for UTC

  return tomorrow.toISOString();
}
