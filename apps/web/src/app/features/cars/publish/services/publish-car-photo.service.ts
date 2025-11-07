import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { CarsService } from '../../../../core/services/cars.service';

export interface PhotoPreview {
  file: File;
  preview: string;
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
      throw new Error(`Archivo muy pesado: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 10MB.`);
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
  async generateAIPhotos(brand: string, model: string, year: number): Promise<void> {
    if (!brand || !model || !year) {
      alert('Debes seleccionar marca, modelo y año para generar fotos con IA.');
      return;
    }

    const currentPhotos = this.uploadedPhotos();
    if (currentPhotos.length >= this.MAX_PHOTOS) {
      alert('Ya alcanzaste el máximo de fotos permitidas.');
      return;
    }

    this.isGeneratingAIPhotos.set(true);

    try {
      const response = await fetch(`${environment.cloudflareWorkerUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          model,
          year,
          angle: '3/4-front',
          style: 'showroom',
          num_steps: 8
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al generar fotos con IA');
      }

      // Convert base64 to blob
      const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], `ai-${brand}-${model}-${Date.now()}.png`, { type: 'image/png' });
      const preview = await this.createPreview(file);

      this.uploadedPhotos.set([...currentPhotos, { file, preview }]);

      alert(`✨ Foto generada exitosamente con IA en ${result.metadata?.duration_ms}ms`);
    } catch (error) {
      console.error('AI photo generation failed:', error);
      alert('No se pudo generar la foto. Intenta nuevamente o sube fotos manualmente.');
    } finally {
      this.isGeneratingAIPhotos.set(false);
    }
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
   * Load existing photos for editing
   * TODO: Implement getCarPhotos method in CarsService
   */
  async loadExistingPhotos(carId: string): Promise<void> {
    try {
      // const photos = await this.carsService.getCarPhotos(carId);

      // // Convert URLs to PhotoPreview format
      // const previews: PhotoPreview[] = await Promise.all(
      //   photos.map(async (photo: any) => {
      //     // Fetch image as blob
      //     const response = await fetch(photo.url);
      //     const blob = await response.blob();
      //     const file = new File([blob], `photo-${photo.position}.jpg`, { type: 'image/jpeg' });

      //     return {
      //       file,
      //       preview: photo.url,
      //     };
      //   })
      // );

      // this.uploadedPhotos.set(previews);
      console.warn('loadExistingPhotos not implemented - getCarPhotos method missing in CarsService');
    } catch (error) {
      console.error('Failed to load existing photos:', error);
    }
  }
}
