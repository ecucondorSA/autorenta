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
  batch_mode?: boolean; // Generate posts for all daily slots
  save_to_db?: boolean;
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

interface BatchGeneratedContent {
  success: boolean;
  batch_results: GeneratedContent[];
  count: number;
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
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').trim();
const SUPABASE_SERVICE_KEY = (
  Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  ''
).trim();
const MARKETING_MEDIA_BUCKET = Deno.env.get('MARKETING_MEDIA_BUCKET') || 'car-images';

// Platform-specific constraints
// SEO 2025: Instagram ya no prioriza hashtags, máximo 5 relevantes es óptimo
const PLATFORM_LIMITS: Record<Platform, { maxChars: number; maxHashtags: number; style: string }> = {
  tiktok: { maxChars: 150, maxHashtags: 5, style: 'casual, trendy, with emojis' },
  instagram: { maxChars: 2200, maxHashtags: 5, style: 'engaging, visual-focused, lifestyle, SEO-optimized' },
  facebook: { maxChars: 500, maxHashtags: 5, style: 'conversational, community-focused, authentic' },
  twitter: { maxChars: 280, maxHashtags: 3, style: 'concise, punchy, news-like' },
};

// Content type templates
const CONTENT_TEMPLATES: Record<ContentType, string> = {
  tip: `Genera un consejo útil para {audience} sobre alquiler de autos entre personas.
    Tono: {style}
    Incluye un emoji relevante al inicio.
    Termina con un call-to-action sutil hacia AutoRentar.`,

  promo: `Genera un post promocional para AutoRentar.
    Destaca: ahorro vs rentadoras tradicionales (hasta 40% menos), facilidad de uso, confianza entre personas.
    IMPORTANTE: Invita a descargar la app de Google Play (beta abierta).
    Tono: {style}
    Incluye oferta o beneficio específico.
    Call-to-action claro: descargá la app, probala gratis, reservá tu próximo viaje.
    Genera FOMO (Fear Of Missing Out): "Miles ya viajan así", "Sé de los primeros", "Los mejores autos se reservan rápido".`,

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
    Si es VERANO: enfócate en road trips a la playa, escapadas de fin de semana, destinos como Florianópolis, Santa Catarina, Punta del Este, Mar del Plata.
    Transmite la emoción de la libertad veraniega, el viento en la cara, la carretera hacia el mar.
    Tono: {style}
    Invita a probar la app de AutoRentar para reservar su auto de verano.
    Call-to-action que genere urgencia de temporada ("¡Reservá antes que se agoten!", "Este verano, viajá diferente").`,

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
    const { content_type, platform, car_id, theme, language = 'es', generate_image = false, generate_video = false, batch_mode = false, save_to_db = false } = request;

    // Validate required fields
    if (!content_type || !platform) {
      throw new Error('content_type and platform are required');
    }

    console.log(`[generate-marketing-content] Generating ${content_type} for ${platform} (Batch: ${batch_mode}, Save: ${save_to_db})`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Determine target times
    const targetTimes = batch_mode ? getAllSuggestedPostTimes(platform) : [getSuggestedPostTime(platform)];
    const results: GeneratedContent[] = [];

    // Process each time slot
    for (const timeStr of targetTimes) {
        // Get car data
        let carData: CarData | null = null;
        if (car_id) {
            carData = await getCarData(supabase, car_id);
        } else if (content_type === 'car_spotlight') {
            carData = await getRandomAvailableCar(supabase);
        }

        // Generate text (with A/B testing support)
        const textContent = await generateTextContent({
            content_type,
            platform,
            carData,
            theme,
            language,
            supabase,
        });

        // Generate image
        let imageContent: { url?: string; base64?: string } | undefined;
        let imageUploadError: string | undefined;
        if (generate_image) {
            imageContent = await generateMarketingImage(carData, content_type);

            // Upload image if saving to DB and we have base64
            if (save_to_db && imageContent?.base64) {
                const uploadResult = await uploadMarketingImageToStorage({
                    base64: imageContent.base64,
                    bucket: MARKETING_MEDIA_BUCKET,
                    contentType: 'image/png',
                    prefix: 'marketing/images',
                });

                if (uploadResult?.publicUrl) {
                    imageContent.url = uploadResult.publicUrl;
                    // Optional: Clear base64 to save bandwidth in response if URL is available
                    // imageContent.base64 = undefined;
                } else {
                    imageUploadError = uploadResult?.error || 'Unknown storage error';
                    console.error('[generate-marketing-content] Image upload failed:', imageUploadError);
                }
            }
        }

        // Generate video
        let videoContent: { url?: string; operation_id?: string; status?: 'generating' | 'ready' | 'failed' } | undefined;
        if (generate_video || platform === 'tiktok') {
            videoContent = await generateMarketingVideo(supabase, textContent.caption, carData, content_type);
        }

        const resultItem: GeneratedContent = {
            success: true,
            text: textContent,
            image: imageContent,
            video: videoContent,
            suggested_post_time: timeStr,
        };
        if (imageUploadError) {
            resultItem.error = `Image upload failed: ${imageUploadError}`;
        }

        results.push(resultItem);

        // Save to DB if requested
        if (save_to_db) {
            const mediaUrl = videoContent?.url || imageContent?.url;
            const mediaType = videoContent ? 'video' : imageContent ? 'image' : null;

            // Only save if we have media (if requested) or if it's text-only
            // If video is still generating (status='generating'), we might want to save it with a flag?
            // For simplicity, we save what we have. If video comes later, it's tricky.
            // Veo video generation saves to storage but returns 'generating' if it takes too long.
            // If it returns 'ready', we have the URL.
            
            const queueItem = {
                platform,
                content_type,
                text_content: textContent.caption,
                media_url: mediaUrl,
                media_type: mediaType,
                hashtags: textContent.hashtags,
                scheduled_for: timeStr,
                status: 'pending',
                hook_variant_id: textContent.hook_variant_id || null,
                metadata: {
                    car_id: carData?.id,
                    theme,
                    language,
                    video_operation_id: videoContent?.operation_id,
                    // SEO 2026 fields
                    alt_text: textContent.alt_text || '',
                    seo_keywords: textContent.seo_keywords || [],
                    call_to_action: textContent.call_to_action || '',
                    // A/B Testing tracking
                    hook_variant_id: textContent.hook_variant_id || null
                }
            };

            const { error: dbError } = await supabase
                .from('marketing_content_queue')
                .insert(queueItem);

            if (dbError) {
                console.error('[generate-marketing-content] DB insert failed:', dbError);
                resultItem.error = `DB Save Failed: ${dbError.message}`;
            } else {
                console.log(`[generate-marketing-content] Saved post for ${timeStr}`);
            }
        }
    }

    if (batch_mode) {
        const batchResponse: BatchGeneratedContent = {
            success: true,
            batch_results: results,
            count: results.length
        };
        return new Response(JSON.stringify(batchResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } else {
        return new Response(JSON.stringify(results[0]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

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
  supabase?: ReturnType<typeof createClient>;
}): Promise<{ caption: string; hashtags: string[]; call_to_action: string; alt_text?: string; seo_keywords?: string[]; hook_variant_id?: string }> {
  const { content_type, platform, carData, theme, language, supabase } = params;
  const platformConfig = PLATFORM_LIMITS[platform];

  // A/B Testing: Select hook variant from database
  let hookVariantId: string | undefined;
  let hookTemplate: string | undefined;
  if (supabase) {
    try {
      const { data: hookData, error: hookError } = await supabase
        .rpc('select_hook_variant', { p_content_type: content_type });

      if (!hookError && hookData?.[0]) {
        hookVariantId = hookData[0].variant_id;
        hookTemplate = hookData[0].hook_template;
        console.log(`[A/B Testing] Selected hook variant: ${hookData[0].variant_name}`);

        // Track impression
        if (hookVariantId) {
          await supabase.rpc('track_hook_impression', { p_variant_id: hookVariantId });
        }
      }
    } catch (err) {
      console.warn('[A/B Testing] Failed to get hook variant:', err);
    }
  }

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

  // Determinar si estamos en temporada de verano (dic-mar para hemisferio sur)
  const currentMonth = new Date().getMonth(); // 0-11
  const isSummerSeason = currentMonth >= 11 || currentMonth <= 2; // dic, ene, feb, mar

  const summerContext = isSummerSeason ? `
CONTEXTO ESTACIONAL - ¡ES VERANO! 🌴☀️
- Estamos en pleno verano sudamericano (la mejor época para viajar)
- Destinos trending: Florianópolis, Balneário Camboriú, Bombinhas, Praia do Rosa (Santa Catarina), Punta del Este, Mar del Plata, Buzios, Arraial do Cabo
- El tono debe transmitir: libertad, aventura, escapadas de verano, road trips a la playa
- Menciona el calor, el sol, las vacaciones, la playa cuando sea relevante
- Usa vocabulario de verano: "escapada", "road trip", "playa", "vacaciones", "aventura veraniega"
` : '';

  const systemPrompt = `Eres un experto en marketing de redes sociales para AutoRentar, una plataforma de alquiler de autos entre personas en Latinoamérica.

🚗 SOBRE AUTORENTAR:
AutoRentar conecta personas que quieren alquilar un auto con propietarios que ofrecen sus vehículos. Es más económico, más flexible y más humano que las rentadoras tradicionales.

📲 LINKS - ¡¡¡OBLIGATORIO INCLUIR EN CADA POST!!!:
- Web: https://autorentar.com
- 🆕 APP ANDROID (BETA ABIERTA): https://play.google.com/apps/test/app.autorentar/70

⚠️ REGLA CRÍTICA - LINK EN BIO (Instagram 2026):
Los links en captions de Instagram NO son clickeables. Por eso:
- Para INSTAGRAM: Usar "📲 Link en bio" o "👆 Bajá la app desde el link en bio"
- Para FACEBOOK: Sí incluir el link completo (es clickeable)
- Para TWITTER/TIKTOK: Incluir link completo

NUNCA mostrar URL larga en Instagram (es spam visual y no funciona).
El link de Google Play está en el bio: play.google.com/apps/test/app.autorentar/70

${summerContext}
🎬 REELS STRATEGY (Instagram 2026 - PRIORITARIO):
- Reels son el motor de descubrimiento #1 en Instagram
- El algoritmo prioriza: Watch time > Saves > Shares > Comments > Likes
- Hook en primeros 3 segundos es CRÍTICO (retención)
- Formato ideal: Hook fuerte → Valor rápido → CTA claro
- Audio trending aumenta alcance (mencionar "🎵 Audio trending" si aplica)

📊 MÉTRICAS QUE IMPORTAN (2026):
1. Watch time / retención (lo más importante)
2. Saves (indica contenido valioso)
3. Shares (indica contenido viral)
4. Comments genuinos (no engagement bait)
5. Likes (lo menos importante ahora)

ENFOQUE DE PLATAFORMAS:
- PRIORIDAD: Instagram y Facebook (nuestra audiencia principal está ahí)
- Tono Instagram: Visual, lifestyle, aspiracional, historias de viaje, REELS-first
- Tono Facebook: Conversacional, comunidad, testimonios, ofertas

📈 SEO SOCIAL 10/10 - ALGORITMO 2025-2026:

⚠️ CAMBIOS CRÍTICOS DEL ALGORITMO:
- Instagram eliminó seguir hashtags (dic 2024) → Keywords > Hashtags ahora
- Posts públicos aparecen en Google/Bing (julio 2025) → SEO tradicional aplica
- El algoritmo prioriza: engagement, calidad de contenido, keywords en captions
- Facebook también indexa en Google → Mayor alcance orgánico

1. ESTRUCTURA DEL CAPTION (Hook → Valor → CTA):
   HOOK (primera línea - CRÍTICO, solo 3 segundos para captar):
   ${hookTemplate ? `
   🎯 A/B TEST - USAR ESTE HOOK COMO BASE:
   "${hookTemplate}"
   Adapta este template al contenido manteniendo su estructura.
   Reemplaza placeholders: {{porcentaje}} → "40", {{numero}} → "3", {{destino}} → ciudad relevante
   ` : `
   - Pregunta intrigante: "¿Cansado de pagar de más por alquilar?"
   - Dato sorprendente: "40% más barato que rentadoras tradicionales"
   - Curiosidad: "El secreto que las rentadoras no quieren que sepas"
   - Problema: "Filas eternas, costos ocultos, autos viejos..."
   - Bold statement: "Nunca más vas a alquilar igual"`}

   VALOR (cuerpo - usar fórmula PAS):
   - Problem: Identifica el dolor del usuario
   - Agitate: Profundiza en el problema
   - Solve: AutoRentar es la solución

   CTA (final - específico y accionable):
   - "Guardá este post 📌" → Aumenta saves
   - "Compartí con quien viaja pronto 📤" → Aumenta shares
   - "Contanos en comentarios 👇" → Aumenta comments
   - "Link en bio → Bajá la app" → Tráfico

2. HASHTAGS (NUEVA ESTRATEGIA 2025 - MÁXIMO 5):
   ❌ NO usar 30 hashtags - el algoritmo lo penaliza
   ✅ Usar 3-5 hashtags ULTRA relevantes

   Mix obligatorio:
   - 1 de MARCA: #AutoRentar
   - 1-2 de NICHO (10K-200K posts): #AlquilerDeAutos #AlquilerEntrePersonas
   - 1-2 GEOGRÁFICOS: #Florianópolis #Argentina #Uruguay

   COLOCAR en el caption, NO en comentario (mejor indexación)

3. KEYWORDS SEO (MÁS IMPORTANTES QUE HASHTAGS):
   Long-tail keywords (específicos = mejor ranking):
   - "alquiler de autos entre personas en Argentina"
   - "rent a car barato en Florianópolis"
   - "aluguel de carros particular Brasil"

   Keywords primarias (incluir naturalmente):
   - alquiler de autos, rent a car, aluguel de carros
   - viaje, road trip, vacaciones, escapada
   - económico, barato, ahorro, sin intermediarios

   Keywords geográficas:
   - Florianópolis, Santa Catarina, Punta del Este, Mar del Plata
   - Buenos Aires, Montevideo, São Paulo, Rio de Janeiro

4. ALT TEXT SEO (NUEVO - Google indexa imágenes):
   Generar alt_text descriptivo con keywords:
   - ❌ "auto"
   - ✅ "Pareja joven alquilando auto en Florianópolis para road trip de verano con AutoRentar"
   - Máximo 125 caracteres
   - Incluir: marca, acción, ubicación, contexto

5. ENGAGEMENT BOOSTERS (sin ser spam):
   ❌ PROHIBIDO engagement bait: "Like si estás de acuerdo", "Comenta SÍ"
   ✅ PERMITIDO: Preguntas genuinas que inviten conversación

   Buenos ejemplos:
   - "¿Cuál es tu destino soñado para este verano? 👇"
   - "¿Ya conocés Floripa? Contanos tu experiencia"
   - "¿Qué auto elegirías para tu road trip?"

   Emojis: Máximo 5, relevantes, no al azar
   - Viaje: 🚗 ✈️ 🗺️
   - Verano: ☀️ 🌴 🏖️
   - Acción: 👇 📲 ➡️

6. CONTENIDO AUTÉNTICO (Facebook penaliza AI puro):
   - Tono humano, conversacional, con personalidad
   - Historias reales > claims genéricos
   - Incluir: nombres de lugares reales, situaciones cotidianas
   - Variedad en cada post (no repetir fórmulas)

REGLAS TÉCNICAS:
- Idioma: ${language === 'es' ? 'Español latinoamericano (voseo rioplatense OK)' : 'Portugués brasileño (informal, amigable)'}
- Máximo ${platformConfig.maxChars} caracteres para el caption
- Máximo 5 hashtags (NUNCA más, el algoritmo penaliza)
- Tono: ${platformConfig.style}
- NUNCA inventar precios o datos falsos
- SIEMPRE mencionar @autorentar o AutoRentar
- Hashtags en ${language === 'es' ? 'español' : 'portugués'}
- INCLUIR link de Google Play: https://play.google.com/apps/test/app.autorentar/70

REGLAS SEO:
- Primera línea = HOOK irresistible (pregunta, dato, o problema)
- Keywords naturales en el texto (no forzados)
- Pregunta de engagement al FINAL (genera comentarios)
- CTA específico (guardar, compartir, comentar, o link)
- NO engagement bait ("Like si...", "Comenta SÍ")
- Emojis: máximo 5, relevantes al contenido

CTAs DE ALTO RENDIMIENTO:
- "📌 Guardá este post para tu próximo viaje"
- "📤 Compartí con quien planea escaparse"
- "👇 Contanos: ¿cuál es tu destino soñado?"
- "📲 Bajá la app → link en bio"
- "➡️ Más info en autorentar.com"

FORMATO DE RESPUESTA (JSON):
{
  "caption": "Hook potente\\n\\nCuerpo con valor y keywords\\n\\nPregunta de engagement + CTA",
  "hashtags": ["AutoRentar", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "call_to_action": "CTA principal del post",
  "alt_text": "Descripción SEO de la imagen (máx 125 chars) con keywords: marca, acción, ubicación",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"]
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

  // Parse JSON response with SEO fields
  try {
    const parsed = JSON.parse(textResponse);
    // Limitar hashtags a 5 máximo (SEO 2025)
    const limitedHashtags = (parsed.hashtags || []).slice(0, 5);

    // Post-procesamiento: Asegurar CTA de app según plataforma
    const GOOGLE_PLAY_LINK = 'https://play.google.com/apps/test/app.autorentar/70';
    let caption = parsed.caption || '';
    let callToAction = parsed.call_to_action || '';

    // Verificar si ya tiene mención de la app
    const hasAppMention = caption.includes('play.google.com') ||
                          caption.includes('link en bio') ||
                          caption.includes('Link en bio') ||
                          callToAction.includes('play.google.com') ||
                          callToAction.includes('link en bio');

    if (!hasAppMention) {
      console.log(`[generate-marketing-content] Adding app CTA for ${platform}`);
      // Instagram: "Link en bio" (links no son clickeables en captions)
      // Otras plataformas: URL completa
      if (platform === 'instagram') {
        callToAction = callToAction
          ? `${callToAction}\n📲 Bajá la app → Link en bio`
          : `📲 Bajá la app → Link en bio`;
      } else {
        callToAction = callToAction
          ? `${callToAction}\n📲 Descargá la app: ${GOOGLE_PLAY_LINK}`
          : `📲 Descargá la app: ${GOOGLE_PLAY_LINK}`;
      }
    }

    return {
      caption,
      hashtags: limitedHashtags,
      call_to_action: callToAction,
      alt_text: parsed.alt_text || '',
      seo_keywords: parsed.seo_keywords || [],
      hook_variant_id: hookVariantId,
    };
  } catch {
    // If JSON parsing fails, try to extract content
    console.warn('[generate-marketing-content] Failed to parse JSON, using raw response');
    return {
      caption: textResponse.substring(0, platformConfig.maxChars),
      hashtags: ['AutoRentar', 'AlquilerDeAutos', 'RoadTrip'],
      call_to_action: 'Descubrí más en autorentar.com\n📲 Descargá la app: https://play.google.com/apps/test/app.autorentar/70',
      alt_text: 'AutoRentar - Alquiler de autos entre personas en Latinoamérica',
      seo_keywords: ['alquiler de autos', 'rent a car', 'road trip'],
      hook_variant_id: hookVariantId,
    };
  }
}

// ============================================================================
// IMAGE GENERATION WITH LATAM CONTEXT (PROMPTS V2 - PREMIUM)
// ============================================================================

// High-quality personas with specific style details
const LATAM_PEOPLE_SCENES = [
  'a stylish Latin American woman (28 years old), wearing a beige trench coat and sunglasses, looking confident and happy, wind in hair',
  'a handsome Latin American man (35 years old), casual-chic style, white linen shirt, beard, smiling authentically at the camera',
  'an adventurous young Latin American couple (25s), wearing travel gear and backpacks, laughing together, genuine connection',
  'a modern Latin American digital nomad (24), holding an iced coffee, wearing stylish streetwear, leaning relaxed',
  'a sophisticated Latin American senior woman (60), elegant silver hair, wearing a colorful scarf, smiling warmly',
  'a cool Latin American guy (22) with curly hair, wearing a retro football jersey style t-shirt, energetic vibe'
];

// Atmospheric locations with lighting cues - SUMMER FOCUSED 🌴
const LATAM_LOCATIONS = [
  // Argentina
  'a charming cobblestone street in San Telmo Buenos Aires, dappled sunlight through trees, colonial architecture background',
  'a scenic vineyard road in Mendoza, Andes mountains faintly visible in the distance, warm golden hour lighting',
  'the beachfront of Mar del Plata, Atlantic ocean waves, summer crowds, vibrant coastal energy',
  // Uruguay
  'the modern waterfront rambla of Montevideo, clean concrete lines, bright blue sky, ocean horizon in background',
  'a coastal road in Punta del Este, pine trees and sand dunes visible, bright summer lighting, luxury resort vibes',
  'José Ignacio lighthouse in the background, bohemian beach town atmosphere, golden hour',
  // Brazil - SANTA CATARINA (SUMMER HOTSPOT)
  'Florianópolis beachfront (Praia da Joaquina), turquoise waters, surfers in background, tropical summer paradise',
  'Balneário Camboriú seafront promenade, modern skyscrapers, cable car visible, Brazilian Riviera vibes',
  'Praia do Rosa (Santa Catarina), pristine beach, lush green hills, bohemian surf town atmosphere',
  'Bombinhas beach road, crystal clear waters, boats in the marina, summer vacation paradise',
  'scenic coastal road SC-406 in Florianópolis, ocean views, palm trees, convertible weather',
  // Brazil - Other
  'Buzios waterfront (Rio de Janeiro), cobblestone streets, boutique shops, Mediterranean charm in Brazil',
  'Arraial do Cabo (Brazilian Caribbean), white sand beach, impossibly blue water, road trip destination',
  // Urban premium
  'a modern architectural garage or valet zone, concrete and glass textures, premium city vibe'
];

// Photography styles to rotate quality
const PHOTO_STYLES = [
  'Shot on 35mm film, Kodak Portra 400 grain, warm tones, nostalgic travel vibe',
  'High-end editorial photography, shot on Canon R5, 50mm f/1.2 lens, shallow depth of field (bokeh), sharp focus on subject',
  'Authentic influencer lifestyle shot, iPhone 15 Pro Max quality, HDR, bright and airy, high contrast',
  'Cinematic lighting, sun flare, golden hour, volumetric light, 8k resolution, highly detailed'
];

// Improved Prompt Templates
const MARKETING_IMAGE_PROMPTS: Record<ContentType, string[]> = {
  tip: [
    'POV shot (Point of View) of {person} holding a modern car key fob, focus on the hand and keys, {car_desc} blurred in the background parked on {location}. {style}.',
    'Close-up lifestyle shot of {person} adjusting the rear-view mirror inside a {car_desc}, interior perspective, safe driving vibe, {location} visible through windshield. {style}.',
    'Over-the-shoulder shot of {person} looking at a smartphone map app next to a {car_desc}, ready for a trip, {location} background. {style}.'
  ],
  promo: [
    'Hero shot: {person} jumping in the air or raising hands in victory holding car keys next to a shiny {car_desc}, {location}, celebration energy, sparks of joy. {style}.',
    'Lifestyle luxury: {person} leaning confidently against the hood of a {car_desc}, arms crossed, smiling, {location}, "own the road" energy. {style}.',
    'Travel aesthetic: The trunk of a {car_desc} open, filled with stylish vintage luggage and a guitar, {person} closing it happily, {location}, road trip ready. {style}.'
  ],
  car_spotlight: [
    'Automotive editorial shot: Low angle view of a {car_desc} parked on {location}, wet pavement reflections, dramatic sky, headlights on, powerful stance. {style}.',
    'Detail shot: Close up of the front grille and headlight of a {car_desc}, sun flare hitting the metal, {location} blurred background, premium feeling. {style}.',
    'Side profile motion blur: A {car_desc} driving dynamically through {location}, wheels spinning (motion blur), sharp focus on car body, cinematic chase feel. {style}.'
  ],
  testimonial: [
    'Portrait photography: {person} leaning out of the driver window of a {car_desc}, big genuine smile, wind in hair, {location}, feeling of freedom. {style}.',
    'Candid moment: {person} high-fiving a friend (or receiving keys), natural laughter, standing next to {car_desc}, {location}, trust and community vibe. {style}.',
    'Selfie perspective: {person} taking a high-angle selfie with the {car_desc} visible behind them, {location}, "just got my ride" excitement. {style}.'
  ],
  seasonal: [
    'Seasonal atmosphere: {car_desc} parked at {location} with {person} sitting on the hood watching a sunset, warm orange and purple sky, romantic travel vibe. {style}.',
    'Holiday vibe: {person} loading wrapped gifts into a {car_desc}, {location} with festive lights in background (bokeh), cozy atmosphere. {style}.',
    'Summer escape: {car_desc} parked near a beach access (sand visible), {person} holding a surfboard or beach bag, sunny flare, {location}. {style}.'
  ],
  community: [
    'Community warmth: {person} handing car keys to another diverse person, both smiling, close up on the exchange, {car_desc} background, {location}. {style}.',
    'Group shot: Three diverse Latin American friends laughing inside a {car_desc} (seen through windshield), road trip snacks, happy chaos, {location}. {style}.',
    'Owner pride: {person} washing or polishing a {car_desc}, water droplets sparkling in sun, {location}, care and quality theme. {style}.'
  ],
};

async function generateMarketingImage(
  carData: CarData | null,
  contentType: ContentType
): Promise<{ url?: string; base64?: string } | undefined> {
  // If car has existing images and it's car_spotlight, use them (50% chance to still generate AI art for variety)
  if (carData?.images && carData.images.length > 0 && contentType === 'car_spotlight' && Math.random() > 0.5) {
    return { url: carData.images[0] };
  }

  // Generate with Gemini 2.5 Flash Image
  if (!GEMINI_API_KEY) {
    console.log('[generate-marketing-content] No Gemini API key, skipping image generation');
    return undefined;
  }

  try {
    // Select random elements
    const person = LATAM_PEOPLE_SCENES[Math.floor(Math.random() * LATAM_PEOPLE_SCENES.length)];
    const location = LATAM_LOCATIONS[Math.floor(Math.random() * LATAM_LOCATIONS.length)];
    const style = PHOTO_STYLES[Math.floor(Math.random() * PHOTO_STYLES.length)];
    
    const promptTemplates = MARKETING_IMAGE_PROMPTS[contentType];
    const promptTemplate = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

    // Define Car Description
    let carDesc = 'modern silver sedan';
    if (carData) {
      carDesc = `${carData.color || 'metallic'} ${carData.brand} ${carData.model} (${carData.year})`;
    }

    // Build final prompt
    let finalPrompt = promptTemplate
      .replace('{person}', person)
      .replace('{location}', location)
      .replace('{car_desc}', carDesc)
      .replace('{style}', style);

    // Add technical negative prompt / guidelines
    finalPrompt += ' Ensure the car steering wheel is on the LEFT side (Latin America standard). High detail, realistic texture, no text overlays, no watermarks, photorealistic.';

    console.log('[generate-marketing-content] Generating image with PROMPT V2:', finalPrompt);

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

async function uploadMarketingImageToStorage(params: {
  base64: string;
  bucket: string;
  contentType: string;
  prefix: string;
}): Promise<{ publicUrl?: string; path?: string; error?: string } | undefined> {
  try {
    const { base64, bucket, contentType, prefix } = params;
    const extension = contentType.split('/')[1] || 'png';
    const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filePath = `${prefix}/${uniqueId}.${extension}`;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': contentType,
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return { error: `Storage upload failed (${uploadResponse.status}): ${errorText}` };
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    return { publicUrl, path: filePath };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown storage error' };
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
  supabase: ReturnType<typeof createClient>,
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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:predictLongRunning`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          instances: [{ prompt: videoPrompt }],
          parameters: {
            aspectRatio: '9:16',
            durationSeconds: 8,
            sampleCount: 1,
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

      // Poll for completion (max 120s - Edge Functions can run up to 150s)
      const maxPollTime = 120000;
      const pollInterval = 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxPollTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
          {
            headers: {
              'x-goog-api-key': GEMINI_API_KEY,
            },
          }
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

          const videoFile =
            pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video ||
            pollData.response?.generatedVideos?.[0]?.video;

          const videoUri = videoFile?.uri || videoFile?.name;
          if (videoUri) {
            console.log(`[generate-marketing-content] Video generated with ${model.name}`);

            // Download the video with API key
            const videoResponse = await fetch(videoUri, {
              headers: { 'x-goog-api-key': GEMINI_API_KEY },
            });
            if (!videoResponse.ok) {
              const errorText = await videoResponse.text();
              return {
                status: 'failed',
                operation_id: operationName,
                error: `No se pudo descargar el video (${videoResponse.status}): ${errorText.substring(0, 120)}`,
                model_used: model.name,
              };
            }

            const videoBlob = await videoResponse.blob();
            const contentType = videoBlob.type || 'video/mp4';
            const extension = contentType.split('/')[1] || 'mp4';
            const filePath = `marketing/videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

            const { error: uploadError } = await supabase.storage
              .from(MARKETING_MEDIA_BUCKET)
              .upload(filePath, videoBlob, { contentType, upsert: false });

            if (uploadError) {
              return {
                status: 'failed',
                operation_id: operationName,
                error: `No se pudo subir el video a Storage: ${uploadError.message}`,
                model_used: model.name,
              };
            }

            const { data: publicUrlData } = supabase.storage
              .from(MARKETING_MEDIA_BUCKET)
              .getPublicUrl(filePath);

            if (!publicUrlData?.publicUrl) {
              return {
                status: 'failed',
                operation_id: operationName,
                error: 'No se pudo obtener la URL publica del video',
                model_used: model.name,
              };
            }

            return {
              url: publicUrlData.publicUrl,
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

function getBestTimes(platform: Platform): { hour: number; minute: number }[] {
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
  return bestTimes[platform];
}

function getSuggestedPostTime(platform: Platform): string {
  const times = getBestTimes(platform);
  const randomTime = times[Math.floor(Math.random() * times.length)];

  // Create date for tomorrow at the suggested time (Argentina timezone)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(randomTime.hour + 3, randomTime.minute, 0, 0); // +3 for UTC

  return tomorrow.toISOString();
}

function getAllSuggestedPostTimes(platform: Platform): string[] {
  const times = getBestTimes(platform);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return times.map(time => {
    const date = new Date(tomorrow);
    date.setHours(time.hour + 3, time.minute, 0, 0); // +3 for UTC
    return date.toISOString();
  });
}
