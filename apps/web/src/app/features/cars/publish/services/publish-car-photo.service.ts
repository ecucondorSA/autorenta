import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

export interface PhotoPreview {
  file: File;
  preview: string;
}

export interface GenerateAIPhotosOptions {
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
  /** Same set id for the 3 photos so context/color stays consistent. */
  setId?: string;
}

/**
 * Service for managing car photos
 *
 * Responsibilities:
 * - Photo selection and validation
 * - AI photo generation
 * - Photo upload to storage
 * - Photo removal
 */
@Injectable()
export class PublishCarPhotoService {
  private readonly carsService = inject(CarsService);
  private readonly notifications = inject(NotificationManagerService);

  // State
  readonly uploadedPhotos = signal<PhotoPreview[]>([]);
  readonly isProcessingPhotos = signal(false);
  readonly isGeneratingAIPhotos = signal(false);

  private readonly MAX_PHOTOS = 10;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Handle photo selection from file input
   */
  async selectPhotos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isProcessingPhotos.set(true);

    try {
      const files = Array.from(input.files);
      const currentPhotos = this.uploadedPhotos();

      // Check max limit
      if (currentPhotos.length + files.length > this.MAX_PHOTOS) {
        throw new Error(`Máximo ${this.MAX_PHOTOS} fotos permitidas`);
      }

      // Validate and create previews
      const newPhotos: PhotoPreview[] = [];

      for (const file of files) {
        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        newPhotos.push({ file, preview });
      }

      // Update state
      this.uploadedPhotos.set([...currentPhotos, ...newPhotos]);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.isProcessingPhotos.set(false);
      // Reset input
      input.value = '';
    }
  }

  /**
   * Validate photo file
   */
  private validatePhoto(file: File): void {
    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Tipo de archivo no válido: ${file.type}. Usa JPG, PNG o WebP.`);
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `Archivo muy pesado: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 10MB.`,
      );
    }
  }

  /**
   * Create preview URL for photo
   */
  private createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate AI photos for a car
   */
  async generateAIPhotos(
    brand: string,
    model: string,
    year: number,
    options: GenerateAIPhotosOptions = {},
  ): Promise<void> {
    if (!brand || !model || !year) {
      alert('Debes seleccionar marca, modelo y año para generar fotos con IA.');
      return;
    }

    const currentPhotos = this.uploadedPhotos();
    // Solo generaremos hasta 3 imágenes nuevas (front, rear, interior) respetando el máximo total de fotos
    let remainingSlots = Math.min(this.MAX_PHOTOS - currentPhotos.length, 3);

    if (remainingSlots <= 0) {
      alert('Ya alcanzaste el máximo de fotos permitidas.');
      return;
    }

    this.isGeneratingAIPhotos.set(true);

    try {
      // Generación de imágenes se hace vía Worker (server-side) para no exponer keys en el navegador.
      const workerEnabled = Boolean(environment.cloudflareWorkerUrl);
      if (!workerEnabled) {
        alert('Falta configurar NG_APP_CLOUDFLARE_WORKER_URL (worker de Gemini para imágenes).');
        return;
      }

      const generatedPhotos: PhotoPreview[] = [];
      const errors: string[] = [];

      const setId =
        options.setId ||
        (globalThis.crypto && 'randomUUID' in globalThis.crypto
          ? (globalThis.crypto as Crypto).randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

      // Generar hasta 3 imágenes: 3/4 frontal, lateral, interior (estilo marketplace)
      const angles: Array<'3/4-front' | 'side' | 'interior'> = ['3/4-front', 'side', 'interior'];
      for (const [index, angle] of angles.entries()) {
        if (remainingSlots <= 0) break;

        try {
          const workerResponse = await fetch(`${environment.cloudflareWorkerUrl}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand,
              model,
              year,
              color: options.color,
              body_type: options.body_type,
              trim_level: options.trim_level,
              angle,
              // Marketplace-style photos (avoid studio/showroom look)
              style: 'marketplace_latam_border_town',
              set_id: setId,
            }),
          });

          const workerResult = await workerResponse.json().catch(() => ({}));

          const modelUsed = workerResult?.metadata?.model;
          if (modelUsed) {
            console.info('[AI Photos] Worker model:', modelUsed);
          }

          if (!workerResponse.ok || !workerResult.success || !workerResult.image) {
            const message = workerResult?.error || workerResponse.statusText;
            throw new Error(message || 'Error al generar foto con IA');
          }

          const workerFile = await this.base64ToFile(
            workerResult.image,
            `ai-${brand}-${model}-${Date.now()}-${index}.png`,
          );
          const workerPreview = await this.createPreview(workerFile);
          generatedPhotos.push({ file: workerFile, preview: workerPreview });
          remainingSlots--;
        } catch (error) {
          console.error(`Error generando foto ${index + 1} con worker:`, error);
          errors.push(`IA #${index + 1}: ${error instanceof Error ? error.message : 'falló'}`);
        }
      }

      if (generatedPhotos.length > 0) {
        this.uploadedPhotos.set([...currentPhotos, ...generatedPhotos]);
        const errorMsg = errors.length ? ` (algunas fallaron: ${errors.join('; ')})` : '';
        alert(`✨ Se generaron ${generatedPhotos.length} foto(s) con IA${errorMsg}. Revisa consola para ver el modelo usado.`);
      } else {
        const msg = errors.length
          ? `No se generaron fotos. Errores: ${errors.join('; ')}`
          : 'No se pudo generar ninguna foto con IA. Verifica NG_APP_CLOUDFLARE_WORKER_URL.';
        alert(msg);
      }
    } catch (error) {
      console.error('Error general durante la generación de fotos con IA:', error);
      alert('Ocurrió un error inesperado al generar fotos con IA. Intenta nuevamente.');
    } finally {
      this.isGeneratingAIPhotos.set(false);
    }
  }

  // Helper function to convert base64 to File object
  private async base64ToFile(
    base64String: string,
    filename: string,
    mimeType = 'image/png',
    maxBytes = 900_000,
    maxDimension = 1600,
  ): Promise<File> {
    const dataUrl = base64String.startsWith('data:')
      ? base64String
      : `data:${mimeType};base64,${base64String}`;

    // Cargar la imagen en un elemento <img>
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen generada'));
      img.src = dataUrl;
    });

    // Ajustar dimensiones si excede el máximo permitido
    const { width, height } = image;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo crear el contexto de canvas');
    }
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    // Comprimir iterativamente hasta quedar debajo de maxBytes o calidad mínima
    let quality = 0.85;
    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    while (compressedDataUrl.length > maxBytes * 1.37 && quality > 0.5) {
      // dataURL pesa ~1.37x el binario base64
      quality -= 0.05;
      compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // Convertir dataURL a Blob
    const compressedBlob = await (await fetch(compressedDataUrl)).blob();
    const finalMime = compressedBlob.type || 'image/jpeg';
    return new File([compressedBlob], filename.replace(/\.[^.]+$/, '.jpg'), { type: finalMime });
  }

  /**
   * Remove photo at index
   */
  removePhoto(index: number): void {
    const photos = this.uploadedPhotos();
    const newPhotos = photos.filter((_, i) => i !== index);
    this.uploadedPhotos.set(newPhotos);
  }

  /**
   * Upload photos to storage for a car
   */
  async uploadPhotos(carId: string): Promise<void> {
    const photos = this.uploadedPhotos();
    if (photos.length === 0) return;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      await this.carsService.uploadPhoto(photo.file, carId, i);
    }
  }

  /**
   * Clear all photos
   */
  clearPhotos(): void {
    this.uploadedPhotos.set([]);
  }

  /**
   * Get photo count
   */
  getPhotoCount(): number {
    return this.uploadedPhotos().length;
  }

  /**
   * Check if minimum photos requirement is met
   */
  hasMinimumPhotos(): boolean {
    return this.uploadedPhotos().length >= 3;
  }

  /**
   * Add stock photos (Files) to the photo list
   */
  async addStockPhotosFiles(files: File[]): Promise<void> {
    const currentPhotos = this.uploadedPhotos();
    const remainingSlots = this.MAX_PHOTOS - currentPhotos.length;

    if (files.length > remainingSlots) {
      alert(`Solo puedes agregar ${remainingSlots} foto(s) más. Máximo ${this.MAX_PHOTOS} fotos.`);
      return;
    }

    this.isProcessingPhotos.set(true);

    try {
      const newPhotos: PhotoPreview[] = [];

      for (const file of files) {
        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        newPhotos.push({ file, preview });
      }

      this.uploadedPhotos.set([...currentPhotos, ...newPhotos]);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.isProcessingPhotos.set(false);
    }
  }

  /**
   * Add stock photos (URLs) to the photo list
   */
  async addStockPhotos(photoUrls: string[]): Promise<void> {
    const currentPhotos = this.uploadedPhotos();
    const remainingSlots = this.MAX_PHOTOS - currentPhotos.length;

    if (photoUrls.length > remainingSlots) {
      alert(`Solo puedes agregar ${remainingSlots} foto(s) más. Máximo ${this.MAX_PHOTOS} fotos.`);
      return;
    }

    this.isProcessingPhotos.set(true);

    try {
      const newPhotos: PhotoPreview[] = [];

      for (const url of photoUrls) {
        // Fetch image and convert to File
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `stock-${Date.now()}.jpg`, {
          type: blob.type || 'image/jpeg',
        });

        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        newPhotos.push({ file, preview });
      }

      this.uploadedPhotos.set([...currentPhotos, ...newPhotos]);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.isProcessingPhotos.set(false);
    }
  }

  /**
   * Add AI generated photos (Files) to the photo list
   */
  async addAIPhotosFiles(files: File[]): Promise<void> {
    const currentPhotos = this.uploadedPhotos();
    const remainingSlots = this.MAX_PHOTOS - currentPhotos.length;

    if (files.length > remainingSlots) {
      alert(`Solo puedes agregar ${remainingSlots} foto(s) más. Máximo ${this.MAX_PHOTOS} fotos.`);
      return;
    }

    this.isProcessingPhotos.set(true);

    try {
      const newPhotos: PhotoPreview[] = [];

      for (const file of files) {
        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        newPhotos.push({ file, preview });
      }

      this.uploadedPhotos.set([...currentPhotos, ...newPhotos]);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.isProcessingPhotos.set(false);
    }
  }

  /**
   * Add AI generated photos (URLs) to the photo list
   */
  async addAIPhotos(photoUrls: string[]): Promise<void> {
    const currentPhotos = this.uploadedPhotos();
    const remainingSlots = this.MAX_PHOTOS - currentPhotos.length;

    if (photoUrls.length > remainingSlots) {
      alert(`Solo puedes agregar ${remainingSlots} foto(s) más. Máximo ${this.MAX_PHOTOS} fotos.`);
      return;
    }

    this.isProcessingPhotos.set(true);

    try {
      const newPhotos: PhotoPreview[] = [];

      for (const url of photoUrls) {
        // Fetch image and convert to File
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `ai-${Date.now()}.png`, { type: blob.type || 'image/png' });

        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        newPhotos.push({ file, preview });
      }

      this.uploadedPhotos.set([...currentPhotos, ...newPhotos]);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      this.isProcessingPhotos.set(false);
    }
  }

  // Genera prompts variados para evitar imágenes repetidas
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

  /**
   * Load existing photos for editing
   */
  async loadExistingPhotos(carId: string): Promise<void> {
    try {
      const photos = await this.carsService.getCarPhotos(carId);

      const previews: PhotoPreview[] = await Promise.all(
        photos.map(async (photo) => {
          const response = await fetch(photo.url);
          if (!response.ok) throw new Error('No se pudo descargar la foto existente');
          const blob = await response.blob();
          const file = new File([blob], `photo-${photo.position || 0}.jpg`, {
            type: blob.type || 'image/jpeg',
          });
          return { file, preview: photo.url };
        }),
      );

      this.uploadedPhotos.set(previews);
    } catch (error) {
      console.error('Failed to load existing photos:', error);
      this.notifications.warning('Fotos', 'No pudimos cargar las fotos existentes.');
    }
  }
}
