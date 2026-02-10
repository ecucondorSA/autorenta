import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { StockPhotosService, StockPhoto } from '@core/services/ai/stock-photos.service';
import { CloudflareAiService } from '@core/services/ai/cloudflare-ai.service';

export interface EnhancedPhoto {
  original: File;
  enhanced: Blob;
  stockPhoto?: StockPhoto;
  preview: string; // Object URL
  source: 'stock' | 'cloudflare-ai' | 'google-ai';
}

export type GenerationMethod = 'stock-photos' | 'cloudflare-ai' | 'google-ai';

/**
 * Servicio para mejorar fotos de autos con IA
 * Soporta 3 métodos:
 * 1. Stock Photos (rápido, fotos reales de Unsplash)
 * 2. Cloudflare AI FLUX.1 (lento, generación desde cero)
 * 3. Google AI Vertex (alta calidad, genera via Edge Function)
 */
@Injectable({
  providedIn: 'root',
})
export class AiPhotoEnhancerService {
  private readonly supabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService).createChildLogger('AiPhotoEnhancer');
  private readonly stockPhotos = inject(StockPhotosService);
  private readonly cloudflareAi = inject(CloudflareAiService);

  /**
   * Genera fotos de un auto - soporta 3 métodos
   * @param method 'stock-photos' (default), 'cloudflare-ai', o 'google-ai' (Vertex AI)
   */
  async generateCarPhotos(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    count?: number;
    method?: GenerationMethod;
  }): Promise<EnhancedPhoto[]> {
    const method = params.method || 'stock-photos';

    if (method === 'google-ai') {
      return this.generateWithGoogleAI(params);
    }

    if (method === 'cloudflare-ai') {
      return this.generateWithCloudflareAI(params);
    }

    return this.generateWithStockPhotos(params);
  }

  /**
   * Método 3: Google Vertex AI (ALTA CALIDAD, via Edge Function)
   * Llama a la Edge Function `generate-car-images` que usa ImageGeneration@006
   * Retorna 3 imágenes base64 PNG en formato 4:3
   */
  private async generateWithGoogleAI(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    count?: number;
  }): Promise<EnhancedPhoto[]> {
    this.logger.info('Generating with Google Vertex AI', 'generateWithGoogleAI', {
      brand: params.brand,
      model: params.model,
    });

    const { data, error } = await this.supabaseClient.functions.invoke('generate-car-images', {
      body: {
        brand: params.brand,
        model: params.model,
        year: params.year ?? new Date().getFullYear(),
        color: params.color ?? 'silver',
      },
    });

    if (error) {
      this.logger.error('Edge Function error', 'generateWithGoogleAI', { error });
      throw new Error(`Google AI generation failed: ${error.message}`);
    }

    if (!data?.success || !Array.isArray(data.images)) {
      throw new Error('Respuesta inválida de generate-car-images');
    }

    const enhanced: EnhancedPhoto[] = [];
    const count = params.count || 3;
    const images: string[] = data.images.slice(0, count);

    for (let i = 0; i < images.length; i++) {
      try {
        const base64 = images[i];
        const byteString = atob(base64);
        const bytes = new Uint8Array(byteString.length);
        for (let j = 0; j < byteString.length; j++) {
          bytes[j] = byteString.charCodeAt(j);
        }
        const blob = new Blob([bytes], { type: 'image/png' });

        const file = new File(
          [blob],
          `google-ai-${params.brand}-${params.model}-${i + 1}.png`,
          { type: 'image/png' },
        );

        const preview = URL.createObjectURL(blob);

        enhanced.push({
          original: file,
          enhanced: blob,
          preview,
          source: 'google-ai',
        });
      } catch {
        this.logger.warn(`Failed to decode image ${i + 1}`, 'generateWithGoogleAI');
      }
    }

    if (data.mock) {
      this.logger.warn('Google AI returned mock images (credentials not configured)', 'generateWithGoogleAI');
    }

    return enhanced;
  }

  /**
   * Método 1: Stock Photos (RÁPIDO)
   */
  private async generateWithStockPhotos(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    count?: number;
  }): Promise<EnhancedPhoto[]> {
    const count = params.count || 3;

    // 1. Buscar fotos de stock
    const stockPhotos = await this.stockPhotos.searchCarPhotos(params);

    if (stockPhotos.length === 0) {
      throw new Error('No se encontraron fotos para este auto');
    }

    // 2. Tomar las mejores N fotos
    const selectedPhotos = stockPhotos.slice(0, count);

    // 3. Descargar cada foto
    const enhanced: EnhancedPhoto[] = [];

    for (const stockPhoto of selectedPhotos) {
      try {
        // Descargar foto
        const originalFile = await this.stockPhotos.downloadPhoto(stockPhoto);

        // Usar foto original sin modificaciones
        const enhancedBlob = new Blob([originalFile], { type: originalFile.type });

        // Crear preview URL
        const preview = URL.createObjectURL(enhancedBlob);

        enhanced.push({
          original: originalFile,
          enhanced: enhancedBlob,
          stockPhoto,
          preview,
          source: 'stock',
        });

        // Track download (requerido por Unsplash)
        await this.stockPhotos.trackDownload(stockPhoto.id);
      } catch {
        // Continuar con las demás fotos
      }
    }

    return enhanced;
  }

  /**
   * Método 2: Cloudflare AI FLUX.1 (LENTO pero GENERACIÓN REAL)
   */
  private async generateWithCloudflareAI(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    count?: number;
  }): Promise<EnhancedPhoto[]> {
    const count = params.count || 3;
    const angles: Array<'front' | 'side' | 'rear' | '3/4-front' | 'interior'> =
      count === 1
        ? ['3/4-front']
        : count === 2
          ? ['3/4-front', 'side']
          : ['3/4-front', 'side', 'interior'];

    const enhanced: EnhancedPhoto[] = [];

    for (const angle of angles.slice(0, count)) {
      try {
        // Generar imagen con FLUX.1
        const generatedBlob = await this.cloudflareAi.generateCarImage({
          brand: params.brand,
          model: params.model,
          year: params.year,
          color: params.color,
          angle,
          style: 'showroom',
          num_steps: 8, // Max quality for FLUX.1-schnell
        });

        // Crear File desde Blob
        const file = new File([generatedBlob], `ai-${params.brand}-${params.model}-${angle}.png`, {
          type: 'image/png',
        });

        // Crear preview URL
        const preview = URL.createObjectURL(generatedBlob);

        enhanced.push({
          original: file,
          enhanced: generatedBlob,
          preview,
          source: 'cloudflare-ai',
        });
      } catch {
        // Continuar con las demás imágenes
      }
    }

    return enhanced;
  }

  /**
   * Mejora una foto existente (actualmente sin procesamiento adicional)
   */
  async enhanceExistingPhoto(photo: File): Promise<EnhancedPhoto> {
    // Usar foto original sin modificaciones
    const enhancedBlob = new Blob([photo], { type: photo.type });
    const preview = URL.createObjectURL(enhancedBlob);

    return {
      original: photo,
      enhanced: enhancedBlob,
      preview,
      source: 'stock', // User uploaded, treated as stock
    };
  }

  /**
   * Agrega fondo profesional a una foto sin fondo
   */
  async addPremiumBackground(
    photoWithoutBg: Blob,
    backgroundType: 'showroom' | 'street' | 'white' = 'white',
  ): Promise<Blob> {
    // Crear canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Cargar imagen sin fondo
    const img = await this.loadImageFromBlob(photoWithoutBg);

    canvas.width = img.width;
    canvas.height = img.height;

    // 1. Dibujar fondo
    switch (backgroundType) {
      case 'white':
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;

      case 'showroom': {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      }

      case 'street':
        // Fondo gris oscuro (simula asfalto)
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
    }

    // 2. Dibujar auto encima
    ctx.drawImage(img, 0, 0);

    // 3. Agregar sombra sutil (opcional)
    if (backgroundType !== 'white') {
      this.addSoftShadow(ctx, canvas.width, canvas.height);
    }

    // 4. Convertir a blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Agrega sombra sutil al auto
   */
  private addSoftShadow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const shadowHeight = height * 0.1;
    const shadowY = height - shadowHeight;

    const gradient = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, width / 2);

    gradient.addColorStop(0, '#7B7B7B');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, shadowY, width, shadowHeight);
  }

  /**
   * Carga imagen desde Blob
   */
  private loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image from blob'));
      };

      img.src = url;
    });
  }

  /**
   * Limpia URLs de preview para liberar memoria
   */
  cleanupPreviews(photos: EnhancedPhoto[]): void {
    photos.forEach((photo) => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
  }

  // Preserved logic for Gemini prompts (not currently used)
  private buildGeminiPrompts(brand: string, model: string, year: number): string[] {
    const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

    const weather = pick([
      'bright sunny day with soft shadows',
      'slightly overcast day with diffused light',
      'after-rain damp ground and cloudy sky',
      'golden hour warm light with long shadows',
      'early morning cool light with a bit of mist',
    ]);

    const terrain = pick([
      'on a dirt road with light tire marks',
      'on a gravel turnout near trees',
      'on a rural roadside with dry grass',
      'on a damp compacted earth surface',
      'on a light muddy patch with puddles nearby',
    ]);

    const background = pick([
      'trees and bushes behind the car',
      'a distant hill line',
      'light forest edge',
      'open countryside',
      'sparse shrubs and a cloudy horizon',
    ]);

    const camera = pick([
      'handheld smartphone at eye level',
      'handheld smartphone slightly low angle',
      'handheld smartphone slightly high angle',
    ]);

    const interiorLight = pick([
      'natural daylight entering through windows',
      'soft overcast light through windshield',
      'late afternoon warm light through side windows',
    ]);

    const interiorWeather = pick([
      'windows slightly dusty',
      'light reflections from cloudy sky',
      'subtle streaks on glass from recent rain',
    ]);

    const exteriorPrompt = `Generate a realistic photo (not render, not showroom) of a ${year} ${brand} ${model} car parked ${terrain}, ${weather}, background of ${background}. Angle: 3/4 front. Style: ${camera}, natural shadows, slight imperfections, realistic reflections, no studio lighting, no advertising vibe. Vary the scene subtly each time so photos are not identical.`;

    const interiorPrompt = `Generate a realistic interior photo (not render) of a ${year} ${brand} ${model} car. Show front seats, dashboard and steering wheel from driver's door perspective. Lighting: ${interiorLight}, ${interiorWeather}. Style: handheld smartphone photo, slight imperfections, realistic textures, no studio lighting, no advertising vibe. Vary small details so photos are not identical.`;

    const rearPrompt = `Generate a realistic photo (not render) of a ${year} ${brand} ${model} car parked ${terrain}, ${weather}, background of ${background}. Angle: 3/4 rear view showing trunk and tail lights. Style: ${camera}, natural shadows, slight imperfections, realistic reflections, no studio lighting, no advertising vibe.`;

    return [exteriorPrompt, interiorPrompt, rearPrompt];
  }
}
