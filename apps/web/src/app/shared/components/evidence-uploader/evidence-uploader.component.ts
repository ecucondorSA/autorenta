import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FileUploadService } from '@core/services/infrastructure/file-upload.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to service facade
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

type UploadedEvidence = {
  name: string;
  url: string;
};

/**
 * Evidence Uploader Component
 *
 * Component for uploading evidence files (images, PDFs) with automatic:
 * - Image compression (reduces size by ~70-90%)
 * - File size validation
 * - Type validation
 * - Error handling
 *
 * Features:
 * - Automatic compression before upload (targets 1MB per image)
 * - Clear error messages
 * - Progress indication
 * - File preview
 * - Removal capability
 *
 * Usage:
 * ```html
 * <app-evidence-uploader
 *   [bookingId]="bookingId"
 *   [userId]="userId"
 *   [context]="'dispute'"
 *   [maxFiles]="5"
 *   (urlsChange)="onEvidenceUploaded($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-evidence-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  templateUrl: './evidence-uploader.component.html',
  styleUrls: ['./evidence-uploader.component.css'],
})
export class EvidenceUploaderComponent {
  @Input({ required: true }) bookingId!: string;
  @Input() context = 'general';
  @Input() maxFiles = 5;
  @Input() accept = 'image/*,application/pdf';
  @Input() disabled = false;
  @Output() urlsChange = new EventEmitter<string[]>();

  private readonly fileUploadService = inject(FileUploadService);
  private readonly logger = inject(LoggerService);
  private readonly supabaseService = inject(SupabaseClientService);

  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly uploaded = signal<UploadedEvidence[]>([]);

  async onFilesSelected(event: Event): Promise<void> {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, this.maxFiles - this.uploaded().length);
    const filesToUpload = files.slice(0, remainingSlots);

    if (filesToUpload.length < files.length) {
      this.error.set(`Máximo ${this.maxFiles} archivos.`);
    } else {
      this.error.set(null);
    }

    this.uploading.set(true);
    try {
      // Get authenticated user
      const {
        data: { user },
      } = await this.supabaseService.getClient().auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      for (const file of filesToUpload) {
        // Upload with automatic compression and validation
        const result = await this.fileUploadService.uploadFile(file, {
          storagePath: `${user.id}/evidence/${this.context}/${this.bookingId}`,
          maxSizeBytes: 10 * 1024 * 1024, // 10MB max before compression
          targetSizeMB: 1, // Compress images to ~1MB
          compressImages: true,
          allowedTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
            'application/pdf',
          ],
        });

        if (!result.success) {
          this.error.set(result.error || 'Error al subir archivo');
          this.logger.error('Evidence upload failed', 'EvidenceUploader', {
            error: result.error,
            fileName: file.name,
          });
          continue;
        }

        // Show compression info if applicable
        if (result.compressionRatio && result.compressionRatio > 10) {
          this.logger.info('Image compressed successfully', 'EvidenceUploader', {
            fileName: file.name,
            reduction: `${result.compressionRatio}%`,
            originalSize: FileUploadService.formatBytes(result.originalSize!),
            compressedSize: FileUploadService.formatBytes(result.compressedSize!),
          });
        }

        this.uploaded.update((current) => [...current, { name: file.name, url: result.url! }]);
        this.emitUrls();
      }
    } catch (err) {
      this.logger.error('Evidence upload error', 'EvidenceUploader', err);
      this.error.set('No se pudo subir la evidencia.');
    } finally {
      this.uploading.set(false);
      if (input) input.value = '';
    }
  }

  removeEvidence(url: string): void {
    this.uploaded.update((current) => current.filter((item) => item.url !== url));
    this.emitUrls();
  }

  private emitUrls(): void {
    this.urlsChange.emit(this.uploaded().map((item) => item.url));
  }
}
