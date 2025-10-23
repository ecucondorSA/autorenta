import { Injectable, inject } from '@angular/core';
import { BackgroundRemovalService } from './background-removal.service';
import { StockPhotosService, StockPhoto } from './stock-photos.service';
import { CloudflareAiService } from './cloudflare-ai.service';

export interface EnhancedPhoto {
  original: File;
  enhanced: Blob;
  stockPhoto?: StockPhoto;
  preview: string; // Object URL
  source: 'stock' | 'cloudflare-ai'; // NEW: indicar origen
}

export type GenerationMethod = 'stock-photos' | 'cloudflare-ai';

/**
 * Servicio para mejorar fotos de autos con IA
 * Soporta 2 métodos:
 * 1. Stock Photos + Background Removal (rápido, fotos reales)
 * 2. Cloudflare AI FLUX.1 (lento, generación desde cero)
 */
@Injectable({
  providedIn: 'root',
})
export class AiPhotoEnhancerService {
  private readonly backgroundRemoval = inject(BackgroundRemovalService);
  private readonly stockPhotos = inject(StockPhotosService);
  private readonly cloudflareAi = inject(CloudflareAiService);

  /**
   * Genera fotos de un auto - soporta 2 métodos
   * @param method 'stock-photos' (default, rápido) o 'cloudflare-ai' (lento, generación real)
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

    if (method === 'cloudflare-ai') {
      return this.generateWithCloudflareAI(params);
    }

    return this.generateWithStockPhotos(params);
  }

  /**
   * Método 1: Stock Photos + Background Removal (RÁPIDO)
   */
  private async generateWithStockPhotos(params: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    count?: number;
  }): Promise<EnhancedPhoto[]> {
    const count = params.count || 3;

    console.log('[AiPhotoEnhancer] Searching stock photos...');

    // 1. Buscar fotos de stock
    const stockPhotos = await this.stockPhotos.searchCarPhotos(params);

    if (stockPhotos.length === 0) {
      throw new Error('No se encontraron fotos para este auto');
    }

    // 2. Tomar las mejores N fotos
    const selectedPhotos = stockPhotos.slice(0, count);

    console.log(`[AiPhotoEnhancer] Processing ${selectedPhotos.length} photos...`);

    // 3. Descargar y mejorar cada foto
    const enhanced: EnhancedPhoto[] = [];

    for (const stockPhoto of selectedPhotos) {
      try {
        // Descargar foto
        const originalFile = await this.stockPhotos.downloadPhoto(stockPhoto);

        // Remover fondo (opcional - puede ser toggle)
        const enhancedBlob = await this.backgroundRemoval.removeBackground(originalFile);

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
      } catch (error) {
        console.error('[AiPhotoEnhancer] Failed to process photo:', error);
        // Continuar con las demás fotos
      }
    }

    console.log(`[AiPhotoEnhancer] ✅ Generated ${enhanced.length} stock photos`);

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

    console.log(`[AiPhotoEnhancer] Generating ${count} images with Cloudflare AI...`);

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
      } catch (error) {
        console.error('[AiPhotoEnhancer] Failed to generate AI image:', error);
        // Continuar con las demás imágenes
      }
    }

    console.log(`[AiPhotoEnhancer] ✅ Generated ${enhanced.length} AI images`);

    return enhanced;
  }

  /**
   * Mejora una foto existente removiendo el fondo
   */
  async enhanceExistingPhoto(photo: File): Promise<EnhancedPhoto> {
    console.log('[AiPhotoEnhancer] Enhancing existing photo...');

    const enhancedBlob = await this.backgroundRemoval.removeBackground(photo);
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
    backgroundType: 'showroom' | 'street' | 'white' = 'white'
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
        // Gradiente gris profesional
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#F5F5F5');
        gradient.addColorStop(1, '#E0E0E0');
        ctx.fillStyle = gradient;
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

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
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
}
