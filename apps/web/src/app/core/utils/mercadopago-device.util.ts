/**
 * Utilidades para Device ID de MercadoPago
 *
 * Device ID es un identificador único del dispositivo que ayuda a MercadoPago
 * a prevenir fraude y mejorar la tasa de aprobación de pagos.
 *
 * Según documentación MP: "En Checkout Pro y integraciones que utilizan el SDK
 * de JS v2 de Mercado Pago, esta funcionalidad ya se encuentra implementada de
 * forma transparente."
 *
 * Sin embargo, para asegurar que siempre se envía, generamos uno único por sesión
 * y lo almacenamos en localStorage.
 */

/**
 * Genera un Device ID único para el dispositivo/sesión
 *
 * Formato: UUID v4 o similar
 * Persistencia: localStorage (persiste entre sesiones del mismo navegador)
 *
 * @returns Device ID único
 */
export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'mp_device_id';

  // Intentar obtener de localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored.length > 0) {
    return stored;
  }

  // Generar nuevo Device ID
  // Usamos una combinación de timestamp + random + user agent hash
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const userAgentHash = hashString(navigator.userAgent).substring(0, 8);
  const screenHash = hashString(`${screen.width}x${screen.height}`).substring(0, 8);

  const deviceId = `${timestamp}-${random}-${userAgentHash}-${screenHash}`;

  // Guardar en localStorage para persistencia
  try {
    localStorage.setItem(STORAGE_KEY, deviceId);
  } catch (e) {
    // Si localStorage no está disponible (modo privado, etc.), usar solo en memoria
    console.warn('No se pudo guardar device_id en localStorage:', e);
  }

  return deviceId;
}

/**
 * Hash simple de string (para generar identificadores únicos)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Obtiene información adicional del dispositivo para mejorar el Device ID
 * (opcional, para casos avanzados)
 */
export function getDeviceFingerprint(): {
  device_id: string;
  user_agent: string;
  screen_resolution: string;
  timezone: string;
  language: string;
} {
  return {
    device_id: getOrCreateDeviceId(),
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}




