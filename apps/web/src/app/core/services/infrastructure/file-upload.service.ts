import { Injectable, inject } from '@angular/core';
import imageCompression from 'browser-image-compression';

import { LoggerService } from './logger.service';
import { SupabaseClientService } from './supabase-client.service';

export interface UploadOptions {
  /**
   * Maximum file size in bytes (before compression)
   * Default: 50MB
   */
  maxSizeBytes?: number;

  /**
   * Compress images before upload
   * Default: true
   */
  compressImages?: boolean;

  /**
   * Maximum width/height for compressed images
   * Default: 1920px
   */
  maxImageDimension?: number;

  /**
   * Target file size in MB after compression
   * Default: 1MB
   */
  targetSizeMB?: number;

  /**
   * Allowed file types
   * Default: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
   */
  allowedTypes?: string[];

  /**
   * Supabase storage bucket name
   * Default: 'documents'
   */
  bucket?: string;

  /**
   * File path in storage (without filename)
   * Example: 'user-id/evidence/booking-id'
   */
  storagePath: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
}

/**
 * File Upload Service
 *
 * Centralizes file upload logic with:
 * - Automatic image compression
 * - File size validation
 * - Type validation
 * - Error handling
 * - Upload progress tracking
 *
 * Usage:
 * ```typescript
 * const result = await fileUploadService.uploadFile(file, {
 *   storagePath: `${userId}/evidence/${bookingId}`,
 *   maxSizeBytes: 10 * 1024 * 1024, // 10MB
 *   targetSizeMB: 1 // Compress to ~1MB
 * });
 *
 * if (result.success) {
 *   console.log('Uploaded:', result.url);
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

  private readonly DEFAULT_OPTIONS: Required<Omit<UploadOptions, 'storagePath'>> = {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB (Supabase default limit)
    compressImages: true,
    maxImageDimension: 1920,
    targetSizeMB: 1,
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
      'video/mp4',
      'video/quicktime',
    ],
    bucket: 'documents',
  };

  /**
   * Upload a single file with automatic compression and validation
   */
  async uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // 1. Validate file type
      if (!opts.allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: `Tipo de archivo no permitido: ${file.type}. Permitidos: ${opts.allowedTypes.join(', ')}`,
        };
      }

      // 2. Validate file size (before compression)
      if (file.size > opts.maxSizeBytes) {
        const maxMB = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1);
        const fileMB = (file.size / (1024 * 1024)).toFixed(1);
        return {
          success: false,
          error: `Archivo muy grande (${fileMB}MB). Máximo permitido: ${maxMB}MB.`,
          originalSize: file.size,
        };
      }

      // 3. Compress image if applicable
      let fileToUpload = file;
      let compressedSize = file.size;

      if (opts.compressImages && this.isImage(file)) {
        try {
          const compressed = await this.compressImage(file, {
            maxSizeMB: opts.targetSizeMB,
            maxWidthOrHeight: opts.maxImageDimension,
          });

          fileToUpload = compressed;
          compressedSize = compressed.size;

          this.logger.info(
            'Image compressed',
            'FileUploadService',
            {
              original: `${(file.size / 1024).toFixed(0)}KB`,
              compressed: `${(compressed.size / 1024).toFixed(0)}KB`,
              ratio: `${((1 - compressed.size / file.size) * 100).toFixed(0)}%`,
            }
          );
        } catch (compressionError) {
          // If compression fails, upload original
          this.logger.warn('Image compression failed, uploading original', 'FileUploadService', compressionError);
        }
      }

      // 4. Generate unique filename
      const extension = this.getFileExtension(fileToUpload.name);
      const filename = `${crypto.randomUUID()}.${extension}`;
      const filePath = `${opts.storagePath}/${filename}`;

      // 5. Upload to Supabase Storage
      const { error: uploadError } = await this.supabaseService
        .getClient()
        .storage
        .from(opts.bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        this.logger.error('File upload failed', 'FileUploadService', uploadError);

        // Handle specific Supabase errors
        if (uploadError.message.includes('exceeded')) {
          return {
            success: false,
            error: 'El archivo es demasiado grande. Por favor, reduce el tamaño o calidad.',
            originalSize: file.size,
            compressedSize,
          };
        }

        return {
          success: false,
          error: 'Error al subir el archivo. Intenta nuevamente.',
        };
      }

      // 6. Get public URL
      const { data } = this.supabaseService
        .getClient()
        .storage
        .from(opts.bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: data.publicUrl,
        originalSize: file.size,
        compressedSize,
        compressionRatio: file.size !== compressedSize
          ? parseFloat(((1 - compressedSize / file.size) * 100).toFixed(1))
          : 0,
      };
    } catch (error) {
      this.logger.error('Unexpected upload error', 'FileUploadService', error);
      return {
        success: false,
        error: 'Error inesperado al subir el archivo.',
      };
    }
  }

  /**
   * Upload multiple files concurrently
   */
  async uploadFiles(
    files: File[],
    options: UploadOptions
  ): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.uploadFile(file, options)));
  }

  /**
   * Compress an image file
   */
  private async compressImage(
    file: File,
    options: { maxSizeMB: number; maxWidthOrHeight: number }
  ): Promise<File> {
    return imageCompression(file, {
      maxSizeMB: options.maxSizeMB,
      maxWidthOrHeight: options.maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/jpeg', // Always convert to JPEG for best compression
      initialQuality: 0.85,
    });
  }

  /**
   * Check if file is an image
   */
  private isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
  }

  /**
   * Format bytes to human-readable size
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
