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

// Content types: legacy + new authority system + expanded types
type ContentType = 'tip' | 'promo' | 'car_spotlight' | 'testimonial' | 'seasonal' | 'community' | 'authority' | 'emotional' | 'educational' | 'promotional';
// ACTIVE PLATFORMS (TikTok requires video media)
type Platform = 'instagram' | 'facebook' | 'tiktok';
type Language = 'es' | 'pt';

// Authority Concept from database (scroll-stopping psychology)
interface AuthorityConcept {
  concept_id: string;
  term_name: string;
  parenting_pain_point: string;
  financial_analogy: string;
  image_scene_concept: string;
  image_reference?: string;
}

interface GenerateContentRequest {
  content_type: ContentType;
  platform: Platform;
  car_id?: string;
  theme?: string;
  language?: Language;
  generate_image?: boolean;
  video_url?: string; // Optional: pre-generated video URL (required for TikTok)
  batch_mode?: boolean; // Generate posts for all daily slots
  save_to_db?: boolean;
  authority_concept_id?: string; // Optional: Override random selection with specific concept ID
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
  instagram: { maxChars: 2200, maxHashtags: 5, style: 'engaging, visual-focused, lifestyle, SEO-optimized' },
  facebook: { maxChars: 500, maxHashtags: 5, style: 'conversational, community-focused, authentic' },
  tiktok: { maxChars: 2200, maxHashtags: 5, style: 'short, punchy, TikTok-native tone' },
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

  // Alias: promotional -> promo (mismo contenido)
  promotional: `Genera un post promocional para AutoRentar.
    Destaca: ahorro vs rentadoras tradicionales (hasta 40% menos), facilidad de uso, confianza entre personas.
    IMPORTANTE: Invita a descargar la app de Google Play (beta abierta).
    Tono: {style}
    Incluye oferta o beneficio específico.
    Call-to-action claro: descargá la app, probala gratis, reservá tu próximo viaje.
    Genera FOMO (Fear Of Missing Out): "Miles ya viajan así", "Sé de los primeros", "Los mejores autos se reservan rápido".`,

  // Nuevo: emotional (conexión emocional profunda)
  emotional: `Genera un post emocional y profundo para AutoRentar.
    Enfoque: Conectar con los sueños, miedos y aspiraciones del usuario.
    Temas: libertad, independencia, momentos con familia, escapar de la rutina, lograr metas.
    Estructura: Historia corta → Reflexión → Conexión con AutoRentar
    Tono: {style}, pero más íntimo y vulnerable.
    NO vendas directamente, cuenta una historia que resuene.
    Ejemplo de hook: "Hay viajes que cambian todo..." o "¿Cuándo fue la última vez que manejaste sin destino?"`,

  // Nuevo: educational (contenido de valor informativo)
  educational: `Genera un post educativo/informativo para AutoRentar.
    Enfoque: Enseñar algo útil sobre autos, viajes, finanzas personales o economía colaborativa.
    Formatos sugeridos:
    - "5 cosas que no sabías sobre..."
    - "Error #1 que cometen los que alquilan..."
    - "Cómo calcular si te conviene alquilar vs comprar"
    - "Checklist antes de un road trip"
    Tono: {style}, experto pero accesible.
    Incluye datos o tips concretos (no genéricos).
    CTA: Guardar el post, compartir con alguien que lo necesite.`,
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
    const {
      content_type,
      platform,
      car_id,
      theme,
      language = 'es',
      generate_image = false,
      video_url,
      batch_mode = false,
      save_to_db = false,
      authority_concept_id,
    } = request;

    // Validate required fields
    if (!content_type || !platform) {
      throw new Error('content_type and platform are required');
    }

    console.log(`[generate-marketing-content] Generating ${content_type} for ${platform} (Batch: ${batch_mode}, Save: ${save_to_db})`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ========================================================================
    // AUTHORITY POSTS - New scroll-stopping psychology system
    // ========================================================================
    if (content_type === 'authority') {
      const authorityResult = await generateAuthorityPost(supabase, platform, save_to_db, authority_concept_id);
      return new Response(JSON.stringify(authorityResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // LEGACY CONTENT TYPES (tip, promo, car_spotlight, etc.)
    // ========================================================================

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
      let imageDebug: string | undefined;
      const canGenerateImage = generate_image && platform !== 'tiktok';
      if (canGenerateImage) {
        console.log('[generate-marketing-content] generate_image=true, calling generateMarketingImage...');
        console.log('[generate-marketing-content] GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
        const imageResult = await generateMarketingImage(carData, content_type);
        imageContent = imageResult?.content;
        imageDebug = imageResult?.debug;

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

      const resultItem: GeneratedContent = {
        success: true,
        text: textContent,
        image: imageContent,
        suggested_post_time: timeStr,
      };
      if (imageUploadError) {
        resultItem.error = `Image upload failed: ${imageUploadError}`;
      }
      if (imageDebug) {
        (resultItem as any)._imageDebug = imageDebug;
      }

      results.push(resultItem);

      // Save to DB if requested - DUAL PLATFORM (Instagram + Facebook)
      if (save_to_db) {
        if (platform === 'tiktok') {
          if (!video_url) {
            console.warn('[generate-marketing-content] SKIPPING TikTok post - video_url is required.');
          } else {
            const queueItem = {
              platform: 'tiktok',
              content_type,
              text_content: textContent.caption,
              media_url: video_url,
              media_type: 'video',
              hashtags: textContent.hashtags,
              scheduled_for: timeStr,
              status: 'pending',
              hook_variant_id: textContent.hook_variant_id || null,
              metadata: {
                car_id: carData?.id,
                theme,
                language,
                alt_text: textContent.alt_text || '',
                seo_keywords: textContent.seo_keywords || [],
                call_to_action: textContent.call_to_action || '',
                hook_variant_id: textContent.hook_variant_id || null,
                original_platform: platform,
              },
            };

            const { error: dbError } = await supabase
              .from('marketing_content_queue')
              .insert(queueItem);

            if (dbError) {
              console.error('[generate-marketing-content] TikTok DB insert failed:', dbError);
              resultItem.error = `DB Save Failed: ${dbError.message}`;
            } else {
              console.log(`[generate-marketing-content] Saved TikTok post at ${timeStr}`);
            }
          }
          continue;
        }

        const mediaUrl = imageContent?.url;
        const mediaType = imageContent ? 'image' : null;

        // HARDENED: Always insert for BOTH platforms (Instagram + Facebook)
        const ACTIVE_PLATFORMS: Platform[] = ['instagram', 'facebook'];

        for (const targetPlatform of ACTIVE_PLATFORMS) {
          // HARDENED 2026-01-23: Both platforms REQUIRE image - skip if no media
          if (!mediaUrl) {
            console.warn(`[generate-marketing-content] SKIPPING ${targetPlatform} post - no image generated. Media required.`);
            continue; // Skip this platform if no image
          }

          // Get platform-specific scheduled time
          const platformTimeStr = targetPlatform === platform
            ? timeStr
            : getSuggestedPostTime(targetPlatform);

          const queueItem = {
            platform: targetPlatform,
            content_type,
            text_content: textContent.caption,
            media_url: mediaUrl,
            media_type: mediaType,
            hashtags: textContent.hashtags,
            scheduled_for: platformTimeStr,
            status: 'pending',
            hook_variant_id: textContent.hook_variant_id || null,
            metadata: {
              car_id: carData?.id,
              theme,
              language,
              // SEO 2026 fields
              alt_text: textContent.alt_text || '',
              seo_keywords: textContent.seo_keywords || [],
              call_to_action: textContent.call_to_action || '',
              // A/B Testing tracking
              hook_variant_id: textContent.hook_variant_id || null,
              // Track dual-platform generation
              dual_platform_batch: true,
              original_platform: platform,
            }
          };

          const { error: dbError } = await supabase
            .from('marketing_content_queue')
            .insert(queueItem);

          if (dbError) {
            console.error(`[generate-marketing-content] DB insert failed for ${targetPlatform}:`, dbError);
            if (targetPlatform === platform) {
              resultItem.error = `DB Save Failed: ${dbError.message}`;
            }
          } else {
            console.log(`[generate-marketing-content] Saved post for ${targetPlatform} at ${platformTimeStr}`);
          }
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

// Authority post styles - Moody, emotional, scroll-stopping
const AUTHORITY_PHOTO_STYLES = [
  'Shot on 35mm film, Kodak Portra 400 grain, candid documentary style, honest textures.',
  'Cinematic lighting, moody atmosphere, shallow depth of field, high-end editorial portrait.',
  'Natural window light, 8k resolution, highly realistic, professional color grading.',
  'iPhone 15 Pro Max quality, HDR, dramatic shadows, authentic emotional moment.'
];

// Stressed subjects for authority posts - Real, unfiltered moments
const AUTHORITY_STRESSED_SUBJECTS = [
  'A tired Latin American mother (30s) with messy hair, dark circles under eyes, holding a crying baby.',
  'A stressed Latin American father (35s) sitting at a table surrounded by bills and baby bottles, looking overwhelmed.',
  'A young Latin American couple having a tense discussion in a cluttered living room, body language shows tension.',
  'A man staring blankly at his dusty car in a dark garage, shoulders slumped, looking burdened.',
  'A woman alone on a couch, laptop open, baby monitor in hand, exhausted expression, 3AM lighting.',
  'A parent scrolling phone with worried expression while older relatives point and give unsolicited advice.'
];

// Domestic settings for authority posts - Authentic Latin American homes
const AUTHORITY_DOMESTIC_SETTINGS = [
  'Realistic mess of family life in a Buenos Aires apartment, natural window light, toys scattered.',
  'Dimly lit garage, concrete floor, feeling of confinement and stagnancy, dust particles visible.',
  'Chaotic kitchen counter with baby gear and financial documents spread out, harsh fluorescent light.',
  'Small living room in Montevideo, modest but clean, family photos on wall, cramped feeling.',
  'Modern São Paulo apartment balcony, city lights below, sense of isolation despite proximity.'
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

  // Promotional: mismo que promo
  promotional: [
    'Hero shot: {person} jumping in the air or raising hands in victory holding car keys next to a shiny {car_desc}, {location}, celebration energy, sparks of joy. {style}.',
    'Lifestyle luxury: {person} leaning confidently against the hood of a {car_desc}, arms crossed, smiling, {location}, "own the road" energy. {style}.',
    'Travel aesthetic: The trunk of a {car_desc} open, filled with stylish vintage luggage and a guitar, {person} closing it happily, {location}, road trip ready. {style}.'
  ],

  // Emotional: momentos íntimos y reflexivos
  emotional: [
    'Cinematic moment: {person} sitting alone in a {car_desc} at golden hour, looking out the window pensively, {location}, introspective mood, beautiful melancholy. {style}.',
    'Freedom shot: {person} with arms stretched out of the sunroof of a {car_desc}, hair blowing in wind, {location}, pure joy and liberation. {style}.',
    'Family bond: Parent and child silhouette inside a {car_desc} at sunset, tender moment, {location}, emotional warmth, nostalgia. {style}.',
    'New beginnings: {person} standing next to a {car_desc} looking at a vast open road ahead, {location}, hopeful horizon, cinematic wide angle. {style}.'
  ],

  // Educational: infográfico visual, tips
  educational: [
    'Expert vibe: {person} checking the tires of a {car_desc} with a checklist in hand, {location}, professional and helpful mood. {style}.',
    'POV learning: Close-up of hands on steering wheel of a {car_desc}, dashboard visible, driving lesson aesthetic, {location}. {style}.',
    'Before/After: Split composition - one side showing stressed person at rental counter, other side showing relaxed {person} with {car_desc} keys via app, {location}. {style}.',
    'Money smart: {person} smiling while looking at phone calculator next to a {car_desc}, saving money concept, {location}, smart consumer vibe. {style}.'
  ],
};

async function generateMarketingImage(
  carData: CarData | null,
  contentType: ContentType
): Promise<{ content?: { url?: string; base64?: string }; debug?: string } | undefined> {
  // If car has existing images and it's car_spotlight, use them (50% chance to still generate AI art for variety)
  if (carData?.images && carData.images.length > 0 && contentType === 'car_spotlight' && Math.random() > 0.5) {
    return { content: { url: carData.images[0] }, debug: 'Used existing car image' };
  }

  // Generate with Gemini 2.5 Flash Image
  if (!GEMINI_API_KEY) {
    console.log('[generate-marketing-content] No Gemini API key, skipping image generation');
    return { debug: 'NO_GEMINI_API_KEY' };
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

    // Call Gemini 3 Pro Image Preview (Nano Banana Pro) for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1' }, // Square for social media
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-marketing-content] Gemini image error:', errorText);
      return { debug: `GEMINI_ERROR_${response.status}: ${errorText.substring(0, 200)}` };
    }

    const data = await response.json();
    const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Data) {
      console.warn('[generate-marketing-content] No image data in response');
      const debugInfo = JSON.stringify({
        hasCandidate: !!data?.candidates?.[0],
        hasContent: !!data?.candidates?.[0]?.content,
        hasParts: !!data?.candidates?.[0]?.content?.parts?.[0],
        partKeys: data?.candidates?.[0]?.content?.parts?.[0] ? Object.keys(data.candidates[0].content.parts[0]) : [],
      });
      return { debug: `NO_IMAGE_DATA: ${debugInfo}` };
    }

    console.log('[generate-marketing-content] Image generated successfully');
    return { content: { base64: base64Data }, debug: 'SUCCESS' };
  } catch (error) {
    console.error('[generate-marketing-content] Image generation error:', error);
    return { debug: `EXCEPTION: ${error instanceof Error ? error.message : String(error)}` };
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
// AUTHORITY POST GENERATION (Scroll-Stopping Psychology)
// ============================================================================

/**
 * Generates an authority post using psychological concepts from the database.
 * Uses a 4-paragraph structure: Drama → Bridge → Authority → CTA
 */
async function generateAuthorityPost(
  supabase: ReturnType<typeof createClient>,
  platform: Platform,
  saveToDb: boolean,
  conceptId?: string
): Promise<GeneratedContent> {
  console.log(`[authority] Starting authority post generation (Concept ID: ${conceptId || 'Random'})...`);

  // 1. GET STRATEGIC CONCEPT FROM DATABASE
  let conceptData: AuthorityConcept[] | null = null;
  let conceptError: any = null;

  if (conceptId) {
    // Manual selection
    const { data, error } = await supabase
      .from('marketing_authority_concepts')
      // Map 'id' to 'concept_id' to match interface
      .select('*, concept_id:id')
      .eq('id', conceptId)
      .limit(1);

    // Cast to unknown first to avoid type mismatch if Typescript validates strictly against interface
    conceptData = data as unknown as AuthorityConcept[];
    conceptError = error;
  } else {
    // Random/Algorithm selection via RPC
    const { data, error } = await supabase.rpc('select_authority_concept');
    conceptData = data;
    conceptError = error;
  }

  if (conceptError || !conceptData?.[0]) {
    console.error('[authority] Failed to get concept:', conceptError);
    throw new Error('No authority concept available');
  }

  const concept: AuthorityConcept = conceptData[0];
  console.log(`[authority] Selected concept: ${concept.term_name}`);

  // 2. GENERATE SPLIT-SCREEN IMAGE (parenting pain | auto pain)
  // Optimization: If a master image is already configured for this concept, use it.
  let mediaUrl: string | undefined = concept.image_reference;
  let imageResult: { base64?: string } | undefined;

  if (!mediaUrl) {
    console.log(`[authority] No master image found for ${concept.term_name}, generating new one...`);
    imageResult = await generateAuthorityImage(concept);

    if (imageResult?.base64 && saveToDb) {
      const uploadResult = await uploadMarketingImageToStorage({
        base64: imageResult.base64,
        bucket: MARKETING_MEDIA_BUCKET,
        contentType: 'image/png',
        prefix: 'marketing/authority',
      });
      if (uploadResult?.publicUrl) {
        mediaUrl = uploadResult.publicUrl;
        console.log('[authority] New image uploaded:', mediaUrl);
      }
    }
  } else {
    console.log(`[authority] Using master image for ${concept.term_name}: ${mediaUrl}`);
  }

  // 3. GENERATE NARRATIVE TEXT (4-paragraph structure)
  const textContent = await generateAuthorityText(concept, platform);

  // 4. SAVE TO DATABASE IF REQUESTED - DUAL PLATFORM (Instagram + Facebook)
  if (saveToDb) {
    // HARDENED: Always insert for BOTH platforms (Instagram + Facebook)
    const ACTIVE_PLATFORMS: Platform[] = ['instagram', 'facebook'];

    for (const targetPlatform of ACTIVE_PLATFORMS) {
      // HARDENED 2026-01-23: Require image for both platforms
      if (!mediaUrl) {
        console.warn(`[authority] SKIPPING ${targetPlatform} post - no image generated. Media required.`);
        continue;
      }

      const scheduledFor = getSuggestedPostTime(targetPlatform);

      const { error: insertError } = await supabase
        .from('marketing_content_queue')
        .insert({
          content_type: 'authority',
          platform: targetPlatform,
          text_content: textContent.caption,
          media_url: mediaUrl,
          media_type: 'image',
          hashtags: textContent.hashtags,
          scheduled_for: scheduledFor,
          status: 'pending',
          authority_concept_id: concept.concept_id,
          metadata: {
            authority_term: concept.term_name,
            logic_applied: 'parenting_finance_bridge',
            alt_text: textContent.alt_text,
            seo_keywords: textContent.seo_keywords,
            // Track dual-platform generation
            dual_platform_batch: true,
            original_platform: platform,
          },
        });

      if (insertError) {
        console.error(`[authority] DB insert failed for ${targetPlatform}:`, insertError);
      } else {
        console.log(`[authority] Post saved to queue for ${targetPlatform} at:`, scheduledFor);
      }
    }
  }

  return {
    success: true,
    text: textContent,
    image: imageResult ? { url: mediaUrl, base64: imageResult.base64 } : undefined,
    suggested_post_time: getSuggestedPostTime(platform),
  };
}

/**
 * Generates SPLIT-SCREEN authority images showing the parallel between
 * parenting struggles and car ownership struggles.
 *
 * Format: LEFT side = parenting pain | RIGHT side = auto/financial pain
 * This creates the visual "bridge" that connects emotional resonance to AutoRentar's value proposition.
 */
async function generateAuthorityImage(
  concept: AuthorityConcept
): Promise<{ base64?: string } | undefined> {
  if (!GEMINI_API_KEY) {
    console.log('[authority] No Gemini API key, skipping image generation');
    return undefined;
  }

  try {
    const style = AUTHORITY_PHOTO_STYLES[Math.floor(Math.random() * AUTHORITY_PHOTO_STYLES.length)];

    // Extract short phrases for speech bubbles from concept
    // parenting_pain_point usually starts with 'Te dicen "X"' - extract X
    // financial_analogy usually starts with 'Te dices "X"' or 'Piensas "X"' - extract X
    const extractQuote = (text: string): string => {
      // Try to extract text between quotes
      const quoteMatch = text.match(/"([^"]+)"/);
      if (quoteMatch) {
        // Truncate to max 25 chars for bubble readability
        const quote = quoteMatch[1];
        return quote.length > 30 ? quote.substring(0, 27) + '...' : quote;
      }
      // Fallback: take first sentence, truncate
      const firstSentence = text.split(/[.,!]/)[0];
      return firstSentence.length > 30 ? firstSentence.substring(0, 27) + '...' : firstSentence;
    };

    const parentingQuote = extractQuote(concept.parenting_pain_point);
    const financialQuote = extractQuote(concept.financial_analogy);

    console.log(`[authority] Bubble texts - Left: "${parentingQuote}" | Right: "${financialQuote}"`);

    // Build SPLIT-SCREEN prompt with DYNAMIC text from concept
    const finalPrompt = `
DIPTYCH COMPOSITION - SPLIT EXACTLY IN HALF VERTICALLY:

CONCEPT: "${concept.term_name}"

=== LEFT PANEL - PARENTING STRUGGLE ===
MAIN SUBJECT: Exhausted Latin American mother (30s), messy hair, dark circles, holding a crying baby vigorously.
Setting: Realistic home interior, natural but somber lighting emphasizing tiredness, toys scattered.

CRITICAL ELEMENT - SPEECH BUBBLE WITH TEXT:
A comic-style speech bubble floating above/beside the mother containing:
- An older woman (grandmother/mother-in-law type) with stern/warning expression
- VISIBLE TEXT IN SPANISH inside the bubble: "${parentingQuote}"
- The text must be clearly legible, white background bubble, black text, max 2 lines

=== RIGHT PANEL - AUTO/FINANCIAL PARALLEL ===
MAIN SUBJECT: Worried Latin American man (30s) in a garage, holding dollar bills or looking at paperwork with concern.
Setting: Garage or driveway, a car completely covered by a gray protective tarp (unused, "frozen asset").

CRITICAL ELEMENT - SPEECH BUBBLE WITH TEXT:
A comic-style speech bubble floating above/beside the man containing:
- A younger man (friend/colleague type) with simplistic smile
- VISIBLE TEXT IN SPANISH inside the bubble: "${financialQuote}"
- The text must be clearly legible, white background bubble, black text, max 2 lines

=== VISUAL UNITY ===
- Both panels must feel connected: same color grading, same emotional weight
- The thought bubbles should be visually similar (same style, same size relative to panel)
- The viewer instantly understands: "This is the SAME PATTERN of irrational advice causing stress"
- Both protagonists show visible stress caused by the "noise" from secondary characters

=== TECHNICAL REQUIREMENTS ===
- Aspect ratio: 1:1 (square for Instagram)
- Split EXACTLY in half with subtle vertical divider
- ${style}
- Kodak Portra 400 film grain, cinematic lighting
- Photorealistic, Latin American subjects (Buenos Aires/Montevideo aesthetic)
- The thought bubbles are semi-transparent, dreamlike, floating above subjects
    `.trim();

    console.log('[authority] Generating image with prompt:', finalPrompt.substring(0, 100) + '...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '1:1' },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[authority] Gemini image error:', errorText);
      return undefined;
    }

    const data = await response.json();
    const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Data) {
      console.warn('[authority] No image data in response');
      return undefined;
    }

    console.log('[authority] Image generated successfully');
    return { base64: base64Data };
  } catch (error) {
    console.error('[authority] Image generation error:', error);
    return undefined;
  }
}

/**
 * Generates the 4-paragraph authority text using the psychological concept.
 */
async function generateAuthorityText(
  concept: AuthorityConcept,
  platform: Platform
): Promise<{ caption: string; hashtags: string[]; call_to_action: string; alt_text?: string; seo_keywords?: string[] }> {
  const platformConfig = PLATFORM_LIMITS[platform];

  const systemPrompt = `Actúa como un experto en psicología del comportamiento y fundador de AutoRentar.
Escribe un caption de Instagram con esta estructura exacta de 4 párrafos:

1. EL DRAMA FAMILIAR (Hook emocional):
   Basado en: "${concept.parenting_pain_point}"
   Sé empático y crudo. Conecta con el dolor real de padres/madres.
   Usa "Te dicen..." o "Te pasa que..." para generar identificación inmediata.

2. EL PUENTE A AUTORENTAR:
   Conecta ese cansancio emocional con el peso financiero de un auto parado.
   Transición natural: "Igual que con tu hijo, con tu auto también..."
   Muestra que es el MISMO patrón de consejos no solicitados.

3. LA AUTORIDAD TÉCNICA:
   Explica el término psicológico: "${concept.term_name}"
   Aplícalo a la analogía financiera: "${concept.financial_analogy}"
   Usa datos o lógica que demuestre expertise (no inventes números).

4. CIERRE Y CTA:
   Recomendación de AutoRentar como solución para filtrar el ruido.
   CTA claro: "Link en bio" para Instagram.
   Tono: confianza, no venta agresiva.

REGLAS TÉCNICAS:
- Idioma: Español latinoamericano (voseo rioplatense OK)
- Máximo ${platformConfig.maxChars} caracteres
- Máximo 5 hashtags ultra-relevantes
- Tono: Brutalmente honesto, intelectual, profesional, empático
- NO uses emojis excesivos (máximo 3-4, bien ubicados)
- NO hagas engagement bait ("Like si...", "Comenta SÍ")
- SIEMPRE menciona @autorentar o AutoRentar

HASHTAGS OBLIGATORIOS:
- #AutoRentar (marca)
- 1-2 de nicho financiero/parenting
- 1-2 geográficos (Argentina, Uruguay, Brasil)

FORMATO DE RESPUESTA (JSON):
{
  "caption": "Párrafo 1\\n\\nPárrafo 2\\n\\nPárrafo 3\\n\\nPárrafo 4 + CTA",
  "hashtags": ["AutoRentar", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "call_to_action": "📲 Link en bio para empezar",
  "alt_text": "Descripción emocional de la escena para SEO (máx 125 chars)",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.85, // Slightly higher for more creative emotional content
          maxOutputTokens: 1500,
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
    throw new Error('No response from Gemini for authority text');
  }

  try {
    const parsed = JSON.parse(textResponse);
    return {
      caption: parsed.caption || '',
      hashtags: (parsed.hashtags || []).slice(0, 5),
      call_to_action: parsed.call_to_action || '📲 Link en bio',
      alt_text: parsed.alt_text || '',
      seo_keywords: parsed.seo_keywords || [],
    };
  } catch {
    console.warn('[authority] Failed to parse JSON, using raw response');
    return {
      caption: textResponse.substring(0, platformConfig.maxChars),
      hashtags: ['AutoRentar', 'FinanzasPersonales', 'Crianza'],
      call_to_action: '📲 Link en bio para empezar',
      alt_text: `Authority post sobre ${concept.term_name}`,
      seo_keywords: ['autorentar', 'alquiler de autos', concept.term_name.toLowerCase()],
    };
  }
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
  // Based on engagement data for Latin American audiences
  const bestTimes: Record<Platform, { hour: number; minute: number }[]> = {
    instagram: [
      { hour: 12, minute: 0 },  // 12pm Argentina
      { hour: 17, minute: 0 },  // 5pm Argentina
      { hour: 21, minute: 0 },  // 9pm Argentina
    ],
    facebook: [
      { hour: 13, minute: 0 },  // 1pm Argentina
      { hour: 16, minute: 0 },  // 4pm Argentina
      { hour: 20, minute: 0 },  // 8pm Argentina
    ],
    tiktok: [
      { hour: 11, minute: 0 },  // 11am Argentina
      { hour: 15, minute: 0 },  // 3pm Argentina
      { hour: 20, minute: 0 },  // 8pm Argentina
      { hour: 22, minute: 0 },  // 10pm Argentina
    ],
  };
  return bestTimes[platform];
}

/**
 * Get the next optimal posting time for a platform.
 * Finds the next available slot today or tomorrow at optimal hours.
 * Argentina timezone (UTC-3) is used for calculations.
 */
function getSuggestedPostTime(platform: Platform): string {
  const times = getBestTimes(platform);
  const now = new Date();

  // Check today and tomorrow for available slots
  for (let daysAhead = 0; daysAhead <= 1; daysAhead++) {
    for (const time of times) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysAhead);

      // Set time in UTC (Argentina hour + 3 = UTC)
      targetDate.setUTCHours(time.hour + 3, time.minute, 0, 0);

      // If this time is at least 1 hour in the future, use it
      if (targetDate.getTime() > now.getTime() + 60 * 60 * 1000) {
        console.log(`[scheduling] Next optimal time for ${platform}: ${targetDate.toISOString()} (${time.hour}:00 Argentina)`);
        return targetDate.toISOString();
      }
    }
  }

  // Fallback: tomorrow at the first optimal hour
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(times[0].hour + 3, times[0].minute, 0, 0);

  console.log(`[scheduling] Fallback time for ${platform}: ${tomorrow.toISOString()}`);
  return tomorrow.toISOString();
}

/**
 * Get all optimal posting times for batch generation.
 * Returns times for the next day to allow proper scheduling.
 */
function getAllSuggestedPostTimes(platform: Platform): string[] {
  const times = getBestTimes(platform);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return times.map(time => {
    const date = new Date(tomorrow);
    date.setUTCHours(time.hour + 3, time.minute, 0, 0); // Argentina hour + 3 = UTC
    return date.toISOString();
  });
}
