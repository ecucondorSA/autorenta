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
const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // Latest Gemini 2.0 model
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
    const { content_type, platform, car_id, theme, language = 'es', generate_image = false } = request;

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
    if (generate_image && carData) {
      imageContent = await generateMarketingImage(carData);
    }

    // Calculate suggested post time
    const suggestedTime = getSuggestedPostTime(platform);

    const response: GeneratedContent = {
      success: true,
      text: textContent,
      image: imageContent,
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
// IMAGE GENERATION
// ============================================================================

async function generateMarketingImage(
  carData: CarData
): Promise<{ url?: string; base64?: string } | undefined> {
  // If car has existing images, return the first one
  if (carData.images && carData.images.length > 0) {
    return { url: carData.images[0] };
  }

  // Try to generate with Vertex AI (if configured)
  const GOOGLE_PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
  const GOOGLE_SERVICE_ACCOUNT = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

  if (!GOOGLE_PROJECT_ID || !GOOGLE_SERVICE_ACCOUNT) {
    console.log('[generate-marketing-content] No Google Cloud credentials, skipping image generation');
    return undefined;
  }

  // Use the existing generate-car-images function pattern
  // For now, return placeholder - full implementation would call Imagen 3
  console.log('[generate-marketing-content] Image generation would use Imagen 3');
  return undefined;
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
