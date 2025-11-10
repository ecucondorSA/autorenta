/**
 * CORS Configuration with Whitelist
 *
 * ✅ SECURITY: Solo dominios específicos permitidos
 * ❌ NO usar '*' - permite CSRF attacks
 *
 * Dominios permitidos:
 * - https://autorenta.com (producción)
 * - https://autorenta-web.pages.dev (Cloudflare Pages)
 * - http://localhost:4200 (desarrollo local)
 */

const ALLOWED_ORIGINS = [
  'https://autorenta.com',
  'https://www.autorenta.com',
  'https://autorenta-web.pages.dev',
  'http://localhost:4200',
  'http://localhost:8787', // Worker local
];

/**
 * Get CORS headers based on request Origin
 *
 * @param req - Request object
 * @returns CORS headers with validated Origin
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin');

  // Validar que el Origin esté en la whitelist
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Default a producción si no match

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 horas
  };
}

/**
 * Legacy export para backward compatibility
 * ⚠️ DEPRECATED: Usar getCorsHeaders() en su lugar
 *
 * @deprecated
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
