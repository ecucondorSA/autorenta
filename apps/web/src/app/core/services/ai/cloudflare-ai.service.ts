import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environment';

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

  // Estilos EXTERIOR - auto ESTACIONADO (marketplace LATAM)
  private readonly EXTERIOR_STYLES = [
    'phone photo, car PARKED ON THE SIDE of residential street, by the curb, latin american neighborhood, afternoon light, houses in background',
    'amateur iphone photo, car PARKED AGAINST THE CURB on quiet street, Uruguay/Argentina border town vibe, overcast sky, slightly dusty',
    'samsung photo, car PARKED BY THE SIDEWALK, small shops in background, latin american town, golden hour light',
    'phone camera photo, car PARKED IN DRIVEWAY of modest latin american house, concrete floor, afternoon shade',
    'phone photo, car PARKED IN PARKING LOT, shopping area visible, latin american city, daytime',
    'iphone photo, car PARKED IN GAS STATION, pumps visible in background, latin america, afternoon',
  ];

  // Estilos INTERIOR - auto ESTACIONADO, volante a la IZQUIERDA (LATAM)
  private readonly INTERIOR_STYLES = [
    'interior photo of PARKED CAR from backseat, LEFT HAND DRIVE, ENGINE OFF, dashboard and steering wheel on left, water bottle in cupholder, PARKED on quiet residential street, houses visible, no traffic',
    'amateur interior of STATIONARY CAR from rear seat, LEFT HAND DRIVE, earbuds on passenger seat, PARKED by the curb, latin american neighborhood, empty street outside',
    'interior shot of PARKED VEHICLE from behind driver seat, LEFT HAND DRIVE, phone charging cable visible, CAR PARKED IN PARKING LOT, other parked cars visible outside',
    'phone photo of PARKED car interior from backseat, LEFT SIDE STEERING WHEEL, sunglasses on dashboard, coffee cup in holder, CAR PARKED in front of house, driveway visible',
    'amateur photo of PARKED car interior from rear, LEFT HAND DRIVE, energy drink in cupholder, CAR PARKED AT GAS STATION, pumps visible through windshield, engine off',
    'interior photo from backseat of PARKED CAR, LEFT HAND DRIVE, steering wheel on left side, clean interior, afternoon light, CAR STATIONARY on suburban street',
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

    // Seleccionar estilos aleatorios (uno para exterior, otro para interior)
    const exteriorStyle =
      this.EXTERIOR_STYLES[Math.floor(Math.random() * this.EXTERIOR_STYLES.length)];
    const interiorStyle =
      this.INTERIOR_STYLES[Math.floor(Math.random() * this.INTERIOR_STYLES.length)];

    const promises = angles.map((angle) =>
      this.generateCarImage({
        ...params,
        angle,
        // Usar estilo de interior para 'interior', exterior para los demás
        style: angle === 'interior' ? interiorStyle : exteriorStyle,
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
