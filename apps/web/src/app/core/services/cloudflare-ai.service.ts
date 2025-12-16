import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudflareAIRequest {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  body_type?:
  | 'sedan'
  | 'hatchback'
  | 'suv'
  | 'crossover'
  | 'pickup'
  | 'coupe'
  | 'wagon'
  | 'minivan';
  trim_level?: 'base' | 'lx' | 'ex' | 'sport' | 'touring' | 'limited' | 'type-r';
  angle?: 'front' | 'side' | 'rear' | '3/4-front' | 'interior';
  style?: 'showroom' | 'street' | 'studio' | 'outdoor' | string;
  num_steps?: number;
}

export interface CloudflareAIResponse {
  success: boolean;
  image?: string; // Base64 PNG/JPEG
  error?: string;
  metadata?: {
    prompt: string;
    model: string;
    steps: number;
    duration_ms: number;
  };
}

/**
 * Servicio para generar imágenes de autos vía Worker (server-side).
 *
 * Actualmente el worker `functions/workers/ai-car-generator` usa Gemini 2.5 Flash
 * (modelo configurable por secret/vars). El navegador NO debe exponer API keys.
 */
@Injectable({
  providedIn: 'root',
})
export class CloudflareAiService {
  private readonly http = inject(HttpClient);

  // URL del worker de generación de imágenes (Gemini)
  // IMPORTANTE: debe configurarse por env var (NG_APP_CLOUDFLARE_WORKER_URL).
  // No hacemos fallback a workers.dev porque puede apuntar a un deploy viejo.
  private readonly WORKER_URL = environment.cloudflareWorkerUrl;

  // Estilos "marketplace" realistas (Amateur / Phone Quality)
  private readonly REALISTIC_STYLES = [
    'photo taken with iphone, parked on crowded street, harsh afternoon sun, hard shadows, dirty car, unwashed, amateur shot',
    'shot on samsung galaxy, dusty dirt road, overcast sky, mud on tires, candid photo, slightly tilted angle, realistic',
    'craigslist car ad photo, parked in driveway, suburbs, boring lighting, unedited, daily driver car, leaves on ground',
    'gas station parking lot, night time, fluorescent lights, grainy phone photo, reflection on hood, wet ground',
    'random street parking, trees reflection on window, sunny day, lens flare, shot from sidewalk, real life, used car',
    'parking garage, concrete background, dim lighting, flash photography, dust particles, raw photo, no filter'
  ];

  /**
   * Genera una imagen de un auto usando el worker (Gemini)
   */
  async generateCarImage(params: CloudflareAIRequest): Promise<Blob> {
    try {
      if (!this.WORKER_URL) {
        throw new Error('Falta configurar NG_APP_CLOUDFLARE_WORKER_URL (worker Gemini)');
      }

      const response = await firstValueFrom(
        this.http.post<CloudflareAIResponse>(this.WORKER_URL, params),
      );

      if (!response.success || !response.image) {
        throw new Error(response.error || 'Failed to generate image');
      }

      // Convertir base64 a Blob (La API devuelve JPEGs a menudo, aunque diga PNG)
      const blob = this.base64ToBlob(response.image, 'image/jpeg');

      return blob;
    } catch {
      throw new Error('No pudimos generar la imagen con IA. Por favor, intenta de nuevo.');
    }
  }

  /**
   * Genera múltiples imágenes (diferentes ángulos)
   */
  async generateMultipleCarImages(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    body_type?:
    | 'sedan'
    | 'hatchback'
    | 'suv'
    | 'crossover'
    | 'pickup'
    | 'coupe'
    | 'wagon'
    | 'minivan';
    trim_level?: 'base' | 'lx' | 'ex' | 'sport' | 'touring' | 'limited' | 'type-r';
    angles?: Array<'front' | 'side' | 'rear' | '3/4-front' | 'interior'>;
  }): Promise<Blob[]> {
    const angles = params.angles || ['3/4-front', 'side', 'interior'];

    // Seleccionar un estilo aleatorio para todo el set de fotos de este auto
    // para mantener coherencia (mismo clima/lugar para el mismo auto)
    const randomStyle =
      this.REALISTIC_STYLES[Math.floor(Math.random() * this.REALISTIC_STYLES.length)];

    const promises = angles.map((angle) =>
      this.generateCarImage({
        ...params,
        angle,
        style: randomStyle,
        // Steps are worker/model-specific; worker may ignore this for Gemini.
        num_steps: 8,
      }),
    );

    return await Promise.all(promises);
  }

  /**
   * Verifica si el worker está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.WORKER_URL) return false;
      const response = await fetch(this.WORKER_URL, {
        method: 'OPTIONS',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Convierte base64 a Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    // Eliminar prefix si existe (data:image/png;base64,)
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');

    // Decodificar base64
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    return new Blob([byteArray], { type: mimeType });
  }
}
