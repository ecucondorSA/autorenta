import { Injectable, inject, signal, computed } from '@angular/core';
import { environment } from '@environment';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import {
  PhotoQualityService,
  PhotoQualityResult,
  VehiclePosition,
} from '@core/services/ai/photo-quality.service';
import { PlateDetectionService } from '@core/services/ai/plate-detection.service';
import {
  VehicleRecognitionService,
  VehicleRecognitionResult,
} from '@core/services/ai/vehicle-recognition.service';

export interface PhotoPreview {
  file: File;
  preview: string;
  /** Position for vehicle photos (front, rear, left, right, etc.) */
  position?: VehiclePosition;
  /** Quality validation result from AI */
  qualityResult?: PhotoQualityResult;
  /** Whether plates were detected and blurred */
  platesBlurred?: boolean;
  /** Number of plates that were blurred */
  platesCount?: number;
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
  private readonly photoQuality = inject(PhotoQualityService);
  private readonly plateDetection = inject(PlateDetectionService);
  private readonly vehicleRecognition = inject(VehicleRecognitionService);

  // State
  readonly uploadedPhotos = signal<PhotoPreview[]>([]);
  readonly isProcessingPhotos = signal(false);
  readonly isGeneratingAIPhotos = signal(false);
  readonly isValidatingQuality = signal(false);
  readonly isDetectingPlates = signal(false);
  readonly isRecognizingVehicle = signal(false);

  // AI Results
  readonly recognitionResult = signal<VehicleRecognitionResult | null>(null);

  // Computed: Check if any photo has quality issues
  readonly hasQualityIssues = computed(() => {
    const photos = this.uploadedPhotos();
    return photos.some((p) => p.qualityResult && !p.qualityResult.quality.is_acceptable);
  });

  // Computed: Average quality score
  readonly averageQualityScore = computed(() => {
    const photos = this.uploadedPhotos().filter((p) => p.qualityResult);
    if (photos.length === 0) return 0;
    const total = photos.reduce((sum, p) => sum + (p.qualityResult?.quality.score ?? 0), 0);
    return Math.round(total / photos.length);
  });

  // Computed: Total plates blurred
  readonly totalPlatesBlurred = computed(() => {
    return this.uploadedPhotos().reduce((sum, p) => sum + (p.platesCount ?? 0), 0);
  });

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
      alert('Debes seleccionar marca, modelo y año para generar fotos de referencia.');
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
        alert('Falta configurar NG_APP_CLOUDFLARE_WORKER_URL (servicio de imágenes).');
        return;
      }

      const generatedPhotos: PhotoPreview[] = [];
      const errors: string[] = [];

      const setId =
        options.setId ||
        (globalThis.crypto && 'randomUUID' in globalThis.crypto
          ? (globalThis.crypto as Crypto).randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

      // Generar hasta 3 imágenes: frente, trasera, interior (estilo marketplace)
      // Map angles to positions for proper slot placement
      const angleConfig: Array<{ angle: '3/4-front' | 'side' | 'interior'; position: VehiclePosition }> = [
        { angle: '3/4-front', position: 'front' },
        { angle: 'side', position: 'rear' },
        { angle: 'interior', position: 'interior' },
      ];

      for (const [index, config] of angleConfig.entries()) {
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
              angle: config.angle,
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
            throw new Error(message || 'Error al generar la foto');
          }

          const workerFile = await this.base64ToFile(
            workerResult.image,
            `ai-${brand}-${model}-${Date.now()}-${index}.png`,
          );
          const workerPreview = await this.createPreview(workerFile);
          // Assign position so photo appears in correct slot
          generatedPhotos.push({ file: workerFile, preview: workerPreview, position: config.position });
          remainingSlots--;
        } catch (error) {
          console.error(`Error generando foto ${index + 1} con worker:`, error);
          errors.push(`Foto #${index + 1}: ${error instanceof Error ? error.message : 'falló'}`);
        }
      }

      if (generatedPhotos.length > 0) {
        this.uploadedPhotos.set([...currentPhotos, ...generatedPhotos]);
        const errorMsg = errors.length ? ` (algunas fallaron: ${errors.join('; ')})` : '';
        alert(
          `Se generaron ${generatedPhotos.length} foto(s)${errorMsg}. Revisa consola para ver el modelo usado.`,
        );
      } else {
        const msg = errors.length
          ? `No se generaron fotos. Errores: ${errors.join('; ')}`
          : 'No se pudo generar ninguna foto. Verifica NG_APP_CLOUDFLARE_WORKER_URL.';
        alert(msg);
      }
    } catch (error) {
      console.error('Error general durante la generación de fotos:', error);
      alert('Ocurrió un error inesperado al generar fotos. Intenta nuevamente.');
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
   *
   * 🚀 PERF: Parallelized with concurrency limit of 3
   * - Uploads 3 photos simultaneously for better performance
   * - Maintains order with position index
   * - Falls back gracefully on individual failures
   */
  async uploadPhotos(carId: string): Promise<void> {
    const photos = this.uploadedPhotos();
    if (photos.length === 0) return;

    // 🚀 PERF: Upload in parallel with concurrency limit
    const CONCURRENCY = 3;
    const errors: string[] = [];

    for (let i = 0; i < photos.length; i += CONCURRENCY) {
      const batch = photos.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map(async (photo, batchIndex) => {
        const position = i + batchIndex;
        try {
          await this.carsService.uploadPhoto(photo.file, carId, position);
        } catch (error) {
          console.error(`Error uploading photo ${position}:`, error);
          errors.push(`Foto ${position + 1}`);
        }
      });
      await Promise.all(batchPromises);
    }

    if (errors.length > 0) {
      this.notifications.warning('Fotos', `Algunas fotos no se subieron: ${errors.join(', ')}`);
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
   *
   * 🚀 PERF: Parallelized fetch of all URLs simultaneously
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
      // 🚀 PERF: Fetch and process all URLs in parallel
      const photoPromises = photoUrls.map(async (url, index) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `stock-${Date.now()}-${index}.jpg`, {
          type: blob.type || 'image/jpeg',
        });

        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        return { file, preview };
      });

      const newPhotos = await Promise.all(photoPromises);
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
   *
   * 🚀 PERF: Parallelized fetch of all URLs simultaneously
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
      // 🚀 PERF: Fetch and process all URLs in parallel
      const photoPromises = photoUrls.map(async (url, index) => {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `ai-${Date.now()}-${index}.png`, {
          type: blob.type || 'image/png',
        });

        this.validatePhoto(file);
        const preview = await this.createPreview(file);
        return { file, preview };
      });

      const newPhotos = await Promise.all(photoPromises);
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

  // ============================================================================
  // AI VISUAL FEATURES
  // ============================================================================

  /**
   * Validates quality of a single photo
   * Updates the photo's qualityResult in the photos array
   */
  async validatePhotoQuality(
    index: number,
    position?: VehiclePosition,
  ): Promise<PhotoQualityResult | null> {
    const photos = this.uploadedPhotos();
    const photo = photos[index];
    if (!photo) return null;

    this.isValidatingQuality.set(true);

    try {
      const result = await this.photoQuality.validatePhoto(
        photo.preview,
        'vehicle_exterior',
        position,
      );

      // Update photo with result
      this.uploadedPhotos.update((list) => {
        const newList = [...list];
        newList[index] = {
          ...newList[index],
          qualityResult: result,
          position,
        };
        return newList;
      });

      return result;
    } catch (error) {
      console.error('Quality validation failed:', error);
      return null;
    } finally {
      this.isValidatingQuality.set(false);
    }
  }

  /**
   * Validates quality of all photos
   */
  async validateAllPhotosQuality(): Promise<{
    allValid: boolean;
    averageScore: number;
    issueCount: number;
  }> {
    this.isValidatingQuality.set(true);

    try {
      const photos = this.uploadedPhotos();
      const positions: VehiclePosition[] = ['front', 'rear', 'left', 'right', 'interior'];

      await Promise.all(
        photos.map((_, index) =>
          this.validatePhotoQuality(index, positions[index % positions.length]),
        ),
      );

      const validatedPhotos = this.uploadedPhotos().filter((p) => p.qualityResult);
      const issueCount = validatedPhotos.filter(
        (p) => !p.qualityResult?.quality.is_acceptable,
      ).length;

      return {
        allValid: issueCount === 0,
        averageScore: this.averageQualityScore(),
        issueCount,
      };
    } finally {
      this.isValidatingQuality.set(false);
    }
  }

  /**
   * Detects and blurs license plates in a photo
   * Updates the photo with blurred version if plates found
   */
  async detectAndBlurPlates(index: number): Promise<{ found: boolean; count: number }> {
    const photos = this.uploadedPhotos();
    const photo = photos[index];
    if (!photo) return { found: false, count: 0 };

    this.isDetectingPlates.set(true);

    try {
      const result = await this.plateDetection.detectAndBlur(photo.preview);

      if (result.hasPlates && result.blurredBlob) {
        // Create new preview from blurred blob
        const blurredPreview = URL.createObjectURL(result.blurredBlob);
        const blurredFile = new File([result.blurredBlob], photo.file.name, { type: 'image/jpeg' });

        // Update photo with blurred version
        this.uploadedPhotos.update((list) => {
          const newList = [...list];
          newList[index] = {
            ...newList[index],
            file: blurredFile,
            preview: blurredPreview,
            platesBlurred: true,
            platesCount: result.platesCount,
          };
          return newList;
        });

        this.notifications.success(
          'Privacidad',
          `Se difuminó ${result.platesCount} placa(s) automáticamente`,
        );
      }

      return { found: result.hasPlates, count: result.platesCount };
    } catch (error) {
      console.error('Plate detection failed:', error);
      return { found: false, count: 0 };
    } finally {
      this.isDetectingPlates.set(false);
    }
  }

  /**
   * Detects and blurs plates in all photos
   */
  async detectAndBlurAllPlates(): Promise<{ totalFound: number }> {
    this.isDetectingPlates.set(true);

    try {
      const photos = this.uploadedPhotos();
      let totalFound = 0;

      // Process sequentially to avoid overwhelming the API
      for (let i = 0; i < photos.length; i++) {
        const result = await this.detectAndBlurPlates(i);
        totalFound += result.count;
      }

      if (totalFound > 0) {
        this.notifications.success(
          'Privacidad',
          `Se difuminaron ${totalFound} placa(s) en total para proteger tu privacidad`,
        );
      }

      return { totalFound };
    } finally {
      this.isDetectingPlates.set(false);
    }
  }

  /**
   * Recognizes vehicle make/model from the first photo
   * Returns auto-complete suggestions for form fields
   */
  async recognizeVehicle(): Promise<VehicleRecognitionResult | null> {
    const photos = this.uploadedPhotos();
    if (photos.length === 0) return null;

    this.isRecognizingVehicle.set(true);

    try {
      const result = await this.vehicleRecognition.recognizeFromBase64(photos[0].preview);
      this.recognitionResult.set(result);

      if (result.success && result.vehicle.confidence >= 70) {
        this.notifications.success(
          'Vehículo detectado',
          `${result.vehicle.brand} ${result.vehicle.model} (${result.vehicle.confidence}% confianza)`,
        );
      }

      return result;
    } catch (error) {
      console.error('Vehicle recognition failed:', error);
      return null;
    } finally {
      this.isRecognizingVehicle.set(false);
    }
  }

  /**
   * Validates vehicle in photo matches expected info
   */
  async validateVehicleMatch(expected: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
  }): Promise<{ matches: boolean; discrepancies: string[] }> {
    const photos = this.uploadedPhotos();
    if (photos.length === 0) {
      return { matches: true, discrepancies: [] };
    }

    this.isRecognizingVehicle.set(true);

    try {
      const result = await this.vehicleRecognition.validateVehicle(photos[0].preview, expected);

      if (!result.matches && result.discrepancies.length > 0) {
        this.notifications.warning(
          'Verificación',
          `Las fotos podrían no coincidir con el vehículo: ${result.discrepancies[0]}`,
        );
      }

      return result;
    } finally {
      this.isRecognizingVehicle.set(false);
    }
  }

  /**
   * Gets auto-complete values from vehicle recognition
   */
  getAutoCompleteFromRecognition(): {
    brand?: string;
    model?: string;
    yearSuggestion?: [number, number];
    color?: string;
  } | null {
    const result = this.recognitionResult();
    if (!result?.success || result.vehicle.confidence < 60) {
      return null;
    }

    return {
      brand: result.vehicle.brand !== 'Desconocido' ? result.vehicle.brand : undefined,
      model: result.vehicle.model !== 'Desconocido' ? result.vehicle.model : undefined,
      yearSuggestion: result.vehicle.year_range,
      color: result.vehicle.color !== 'desconocido' ? result.vehicle.color : undefined,
    };
  }

  /**
   * Runs all AI validations on photos:
   * 1. Quality check
   * 2. Plate detection and blur
   * 3. Vehicle recognition (first photo only)
   */
  async runAllAIValidations(): Promise<{
    qualityScore: number;
    qualityIssues: number;
    platesBlurred: number;
    vehicleRecognized: boolean;
  }> {
    const photos = this.uploadedPhotos();
    if (photos.length === 0) {
      return { qualityScore: 0, qualityIssues: 0, platesBlurred: 0, vehicleRecognized: false };
    }

    // Run validations in sequence to provide feedback
    this.notifications.info('Validando', 'Analizando calidad de fotos...');
    const qualityResult = await this.validateAllPhotosQuality();

    this.notifications.info('Validando', 'Detectando placas para privacidad...');
    const plateResult = await this.detectAndBlurAllPlates();

    this.notifications.info('Validando', 'Reconociendo vehículo...');
    const recognition = await this.recognizeVehicle();

    return {
      qualityScore: qualityResult.averageScore,
      qualityIssues: qualityResult.issueCount,
      platesBlurred: plateResult.totalFound,
      vehicleRecognized: recognition?.success ?? false,
    };
  }

  // ============================================================================
  // PHOTO UPLOAD AI COMPONENT INTEGRATION
  // ============================================================================

  /**
   * Sets photos from the PhotoUploadAIComponent
   * Replaces all current photos with AI-validated ones
   *
   * This method is called when photos change in the PhotoUploadAIComponent.
   * It syncs the validated photos with this service for later upload.
   */
  setPhotosFromAI(
    photos: Array<{
      file: File;
      preview: string;
      position?: VehiclePosition;
      aiValidation?: {
        quality?: number;
        vehicle?: {
          brand: string;
          model: string;
          year?: number;
          color?: string;
          confidence: number;
        };
        plates?: Array<{
          text: string;
          confidence: number;
          blurred: boolean;
        }>;
      };
    }>,
  ): void {
    // Convert AI photos to PhotoPreview format
    const photosPreviews: PhotoPreview[] = photos.map((p) => ({
      file: p.file,
      preview: p.preview,
      position: p.position,
      qualityResult: p.aiValidation?.quality
        ? {
            success: true,
            quality: {
              score: p.aiValidation.quality,
              is_acceptable: p.aiValidation.quality >= 50,
              issues: [],
            },
            content: {
              matches_subject: true,
              detected_subject: 'vehicle',
              area_coverage: 80,
              position_detected: p.position,
            },
            recommendations: [],
          }
        : undefined,
      platesBlurred: p.aiValidation?.plates?.some((plate) => plate.blurred) ?? false,
      platesCount: p.aiValidation?.plates?.length ?? 0,
    }));

    // Replace all photos
    this.uploadedPhotos.set(photosPreviews);

    // Update recognition result if vehicle was detected
    const firstWithVehicle = photos.find((p) => p.aiValidation?.vehicle);
    if (firstWithVehicle?.aiValidation?.vehicle) {
      const v = firstWithVehicle.aiValidation.vehicle;
      this.recognitionResult.set({
        success: true,
        vehicle: {
          brand: v.brand,
          model: v.model,
          year_range: v.year ? [v.year, v.year] : [2020, 2024],
          color: v.color || 'desconocido',
          body_type: 'sedan',
          confidence: v.confidence,
        },
        suggestions: [],
      });
    }
  }
}
