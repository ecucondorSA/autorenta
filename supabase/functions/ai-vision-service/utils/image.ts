
// ============================================================================
// CONSTANTS
// ============================================================================

const IMAGE_FETCH_TIMEOUT_MS = 8_000; // 8 seconds for image download
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB max for base64 encoding (generous limit)

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converts Uint8Array to base64 string efficiently using chunks
 * Avoids stack overflow with large arrays
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    result += String.fromCharCode(...chunk);
  }
  return btoa(result);
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Downloads an image from a URL and converts it to base64
 */
export async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log(`[image-utils] Fetching image from URL (timeout: ${IMAGE_FETCH_TIMEOUT_MS}ms)...`);

    const response = await fetchWithTimeout(url, {}, IMAGE_FETCH_TIMEOUT_MS);
    if (!response.ok) {
      console.error(`[image-utils] Failed to fetch image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    // Check image size
    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      console.warn(`[image-utils] Image size ${arrayBuffer.byteLength} bytes exceeds ${MAX_IMAGE_SIZE_BYTES} bytes limit`);
    }

    // Use chunked conversion to avoid stack overflow
    const base64 = uint8ArrayToBase64(new Uint8Array(arrayBuffer));

    console.log(`[image-utils] Image converted to base64 (${Math.round(arrayBuffer.byteLength / 1024)}KB)`);

    return {
      base64,
      mimeType: contentType.split(';')[0],
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[image-utils] Image fetch timed out');
    } else {
      console.error('[image-utils] Error converting image to base64:', error);
    }
    return null;
  }
}
