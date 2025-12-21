import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { LoggerService } from '../../../core/services/logger.service';

type UploadedEvidence = {
  name: string;
  url: string;
};

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

  private readonly supabaseService = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

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
      const {
        data: { user },
      } = await this.supabaseService.getClient().auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      for (const file of filesToUpload) {
        if (!this.isAllowedFile(file)) {
          this.error.set('Formato no permitido. Solo imágenes o PDF.');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          this.error.set('Archivo muy grande. Máximo 5MB.');
          continue;
        }

        const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const filePath = `${user.id}/evidence/${this.context}/${this.bookingId}/${uuidv4()}.${extension}`;

        const { error: uploadError } = await this.supabaseService
          .getClient()
          .storage.from('documents')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          this.logger.error('Evidence upload failed', 'EvidenceUploader', uploadError);
          this.error.set('Error al subir evidencia. Intenta nuevamente.');
          continue;
        }

        const { data } = this.supabaseService.getClient().storage.from('documents').getPublicUrl(filePath);
        const url = data.publicUrl;
        this.uploaded.update((current) => [...current, { name: file.name, url }]);
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

  private isAllowedFile(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    if (file.type === 'application/pdf') return true;
    return false;
  }
}
