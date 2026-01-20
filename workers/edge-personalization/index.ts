/**
 * Edge Personalization Worker
 * Cloudflare Worker para personalización en el edge
 *
 * Funcionalidades:
 * - Geolocalización automática (país, ciudad, moneda)
 * - A/B testing en edge (sin JS del cliente)
 * - Personalización de headers
 * - Cache personalizado por segmento
 * - Redirect por región
 */

interface Env {
  // KV Namespace para cache
  EDGE_CONFIG: KVNamespace;
  // Secrets
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface GeoData {
  country: string;
  city: string;
  region: string;
  timezone: string;
  currency: string;
  locale: string;
}

// Mapeo de países a monedas y locales
const COUNTRY_CONFIG: Record<string, { currency: string; locale: string }> = {
  AR: { currency: 'ARS', locale: 'es-AR' },
  BR: { currency: 'BRL', locale: 'pt-BR' },
  CL: { currency: 'CLP', locale: 'es-CL' },
  CO: { currency: 'COP', locale: 'es-CO' },
  MX: { currency: 'MXN', locale: 'es-MX' },
  US: { currency: 'USD', locale: 'en-US' },
  ES: { currency: 'EUR', locale: 'es-ES' },
};

// Variantes de A/B test activos
const AB_TESTS: Record<string, { variants: string[]; weights: number[] }> = {
  HERO_EXPERIMENT: {
    variants: ['control', 'variant_a', 'variant_b'],
    weights: [0.34, 0.33, 0.33],
  },
  BOOKING_FLOW: {
    variants: ['original', 'simplified'],
    weights: [0.5, 0.5],
  },
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // API endpoints del worker
    if (url.pathname.startsWith('/edge-api/')) {
      return handleEdgeApi(request, env, url);
    }

    // Para requests normales, agregar headers de personalización
    const geoData = getGeoData(request);
    const abVariants = getAbVariants(request, geoData);

    // Crear response modificada
    const response = await fetch(request);

    // Clonar response para modificar headers
    const newHeaders = new Headers(response.headers);

    // Headers de geolocalización
    newHeaders.set('X-Geo-Country', geoData.country);
    newHeaders.set('X-Geo-City', geoData.city);
    newHeaders.set('X-Geo-Currency', geoData.currency);
    newHeaders.set('X-Geo-Locale', geoData.locale);
    newHeaders.set('X-Geo-Timezone', geoData.timezone);

    // Headers de A/B test
    for (const [testName, variant] of Object.entries(abVariants)) {
      newHeaders.set(`X-AB-${testName}`, variant);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};

/**
 * Extrae datos de geolocalización del request
 */
function getGeoData(request: Request): GeoData {
  // Cloudflare provee estos datos automáticamente
  const cf = (request as unknown as { cf: IncomingRequestCfProperties }).cf;

  const country = cf?.country ?? 'AR';
  const city = cf?.city ?? 'Unknown';
  const region = cf?.region ?? '';
  const timezone = cf?.timezone ?? 'America/Argentina/Buenos_Aires';

  const config = COUNTRY_CONFIG[country] ?? COUNTRY_CONFIG['AR'];

  return {
    country,
    city,
    region,
    timezone,
    currency: config.currency,
    locale: config.locale,
  };
}

/**
 * Asigna variantes de A/B test de forma consistente
 */
function getAbVariants(request: Request, geoData: GeoData): Record<string, string> {
  const variants: Record<string, string> = {};

  // Obtener o generar ID de usuario para consistencia
  const userId = getUserId(request);

  for (const [testName, config] of Object.entries(AB_TESTS)) {
    // Hash consistente basado en userId + testName
    const hash = simpleHash(userId + testName);
    const normalized = hash / 0xffffffff; // 0 a 1

    // Seleccionar variante basada en peso
    let cumulative = 0;
    for (let i = 0; i < config.variants.length; i++) {
      cumulative += config.weights[i];
      if (normalized <= cumulative) {
        variants[testName] = config.variants[i];
        break;
      }
    }

    // Fallback
    if (!variants[testName]) {
      variants[testName] = config.variants[0];
    }
  }

  return variants;
}

/**
 * Obtiene ID de usuario de cookie o genera uno nuevo
 */
function getUserId(request: Request): string {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(/ar_uid=([^;]+)/);

  if (match) {
    return match[1];
  }

  // Generar nuevo ID
  return crypto.randomUUID();
}

/**
 * Hash simple para asignación de variantes
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Maneja endpoints de la API del edge
 */
async function handleEdgeApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace('/edge-api/', '');

  // GET /edge-api/geo - Obtener datos de geolocalización
  if (path === 'geo' && request.method === 'GET') {
    const geoData = getGeoData(request);
    return jsonResponse(geoData);
  }

  // GET /edge-api/config - Obtener configuración por región
  if (path === 'config' && request.method === 'GET') {
    const geoData = getGeoData(request);
    const config = await getRegionalConfig(env, geoData.country);
    return jsonResponse(config);
  }

  // GET /edge-api/ab-variants - Obtener variantes asignadas
  if (path === 'ab-variants' && request.method === 'GET') {
    const geoData = getGeoData(request);
    const variants = getAbVariants(request, geoData);
    const userId = getUserId(request);

    const response = jsonResponse({ userId, variants });

    // Set cookie para mantener consistencia
    response.headers.set(
      'Set-Cookie',
      `ar_uid=${userId}; Path=/; Max-Age=31536000; SameSite=Lax`
    );

    return response;
  }

  // POST /edge-api/track - Tracking de eventos (async)
  if (path === 'track' && request.method === 'POST') {
    const body = await request.json();
    // Fire and forget - no esperar respuesta
    trackEvent(env, body);
    return jsonResponse({ success: true });
  }

  // GET /edge-api/health - Health check
  if (path === 'health') {
    return jsonResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      region: (request as unknown as { cf: IncomingRequestCfProperties }).cf?.colo ?? 'unknown',
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

/**
 * Obtiene configuración específica por región desde KV
 */
async function getRegionalConfig(env: Env, country: string): Promise<Record<string, unknown>> {
  try {
    const cached = await env.EDGE_CONFIG.get(`config:${country}`, 'json');
    if (cached) {
      return cached as Record<string, unknown>;
    }
  } catch {
    // KV no disponible, usar defaults
  }

  // Configuración por defecto
  const defaults: Record<string, Record<string, unknown>> = {
    AR: {
      currency: 'ARS',
      locale: 'es-AR',
      defaultSearchRadius: 50,
      paymentMethods: ['mercadopago', 'card'],
      features: {
        instantBooking: true,
        priceNegotiation: false,
      },
    },
    BR: {
      currency: 'BRL',
      locale: 'pt-BR',
      defaultSearchRadius: 30,
      paymentMethods: ['pix', 'card'],
      features: {
        instantBooking: true,
        priceNegotiation: true,
      },
    },
  };

  return defaults[country] ?? defaults['AR'];
}

/**
 * Envía evento de tracking a Supabase (async)
 */
async function trackEvent(
  env: Env,
  event: { type: string; data: Record<string, unknown> }
): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/edge_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        event_type: event.type,
        event_data: event.data,
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Ignorar errores de tracking
  }
}

/**
 * Helper para respuestas JSON
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}

// Type definitions for Cloudflare
interface IncomingRequestCfProperties {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  colo?: string;
}
