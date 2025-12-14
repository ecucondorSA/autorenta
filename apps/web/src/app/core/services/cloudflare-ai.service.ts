import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
 * Servicio para generar imágenes de autos con Cloudflare AI (FLUX.1-schnell)
 *
 * Este servicio GENERA imágenes desde cero (no usa stock photos)
 * Es mucho más potente que el stock-photos service
 */
@Injectable({
  providedIn: 'root',
})
export class CloudflareAiService {
  private readonly http = inject(HttpClient);

  // URL del worker desplegado en Cloudflare
  private readonly WORKER_URL =
    'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev';

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
   * Genera una imagen de un auto usando FLUX.1-schnell
   */
  async generateCarImage(params: CloudflareAIRequest): Promise<Blob> {
    try {
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
        num_steps: 8, // Max quality for FLUX.1-schnell
      }),
    );

    return await Promise.all(promises);
  }

  /**
   * Verifica si el worker está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
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
