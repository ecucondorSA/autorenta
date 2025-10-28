import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FgoV1_1Service } from '../../../core/services/fgo-v1-1.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { InspectionStage, InspectionPhoto } from '../../../core/models/fgo-v1-1.model';

// Window extension for inspection callback
interface WindowWithInspectionCallback extends Window {
  inspectionUploaderCallback?: (data: unknown) => void;
}

/**
 * Componente para subir inspecciones de vehículos (check-in/check-out)
 *
 * Standalone component que permite:
 * - Subir fotos (mínimo 8)
 * - Registrar odómetro
 * - Registrar nivel de combustible
 * - Firmar digitalmente
 *
 * Uso:
 * ```typescript
 * const modal = await this.modalCtrl.create({
 *   component: InspectionUploaderComponent,
 *   componentProps: { bookingId: '...', stage: 'check_in' }
 * });
 * ```
 */
@Component({
  selector: 'app-inspection-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-uploader.component.html',
  styleUrl: './inspection-uploader.component.css',
})
export class InspectionUploaderComponent implements OnInit {
  @Input() bookingId!: string;
  @Input() stage!: InspectionStage;

  private readonly fgoService = inject(FgoV1_1Service);
  private readonly supabaseService = inject(SupabaseClientService);

  // Estado del componente
  readonly photos = signal<InspectionPhoto[]>([]);
  readonly uploading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Datos de la inspección
  odometer = 0;
  fuelLevel = 100;

  // Computed properties
  readonly isValid = computed(() => {
    return (
      this.photos().length >= 8 && this.odometer > 0 && this.fuelLevel >= 0 && this.fuelLevel <= 100
    );
  });

  readonly stageLabel = computed(() => {
    return this.stage === 'check_in' ? 'Check-in' : 'Check-out';
  });

  readonly photoCount = computed(() => this.photos().length);

  readonly missingPhotos = computed(() => {
    const count = this.photoCount();
    return count < 8 ? 8 - count : 0;
  });

  ngOnInit(): void {
    if (!this.bookingId || !this.stage) {
      this.error.set('Faltan parámetros requeridos: bookingId y stage');
    }
  }

  /**
   * Maneja la selección de fotos del input file
   */
  async onPhotosSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.uploading.set(true);
    this.error.set(null);

    try {
      const files = Array.from(input.files);

      // Validar que sean imágenes
      const invalidFiles = files.filter((f) => !f.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        this.error.set('Solo se permiten archivos de imagen');
        return;
      }

      // Validar tamaño (max 5MB por foto)
      const largeFiles = files.filter((f) => f.size > 5 * 1024 * 1024);
      if (largeFiles.length > 0) {
        this.error.set('Las fotos no deben superar 5MB cada una');
        return;
      }

      // Subir fotos a Supabase Storage
      for (const file of files) {
        const photo = await this.uploadPhoto(file);
        if (photo) {
          this.photos.update((p) => [...p, photo]);
        }
      }

    } catch (err) {
      this.error.set('Error al subir fotos. Intente nuevamente.');
    } finally {
      this.uploading.set(false);
      // Limpiar input para permitir resubir las mismas fotos
      input.value = '';
    }
  }

  /**
   * Sube una foto a Supabase Storage
   */
  private async uploadPhoto(file: File): Promise<InspectionPhoto | null> {
    try {
      const supabase = this.supabaseService.getClient();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Generar nombre único
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${this.bookingId}_${this.stage}_${timestamp}.${extension}`;
      const filePath = `${userId}/inspections/${fileName}`;

      // Subir a bucket 'car-images' (reutilizamos el bucket existente)
      const { error: uploadError } = await supabase.storage
        .from('car-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('car-images').getPublicUrl(filePath);

      return {
        url: publicUrl,
        type: 'exterior', // Por defecto exterior, en versión avanzada podría categorizarse
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Elimina una foto de la lista
   */
  removePhoto(index: number): void {
    this.photos.update((p) => p.filter((_, i) => i !== index));
  }

  /**
   * Guarda la inspección y la firma
   */
  async save(): Promise<void> {
    if (!this.isValid()) {
      this.error.set('Complete todos los campos requeridos');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      // 1. Obtener ID del usuario actual (inspector)
      const supabase = this.supabaseService.getClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 2. Crear inspección
      const inspection = await firstValueFrom(
        this.fgoService.createInspection({
          bookingId: this.bookingId,
          stage: this.stage,
          inspectorId: user.id,
          photos: this.photos(),
          odometer: this.odometer,
          fuelLevel: this.fuelLevel,
        }),
      );

      if (!inspection) {
        throw new Error('No se pudo crear la inspección');
      }


      // 3. Firmar inspección
      const signed = await firstValueFrom(this.fgoService.signInspection(inspection.id));

      if (!signed) {
        throw new Error('No se pudo firmar la inspección');
      }


      // 4. Cerrar modal y retornar inspección
      this.closeModal(inspection);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Error al guardar inspección. Intente nuevamente.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Cancela y cierra el modal
   */
  cancel(): void {
    if (this.photos().length > 0 || this.odometer > 0) {
      if (!confirm('¿Descartar inspección? Se perderán los datos ingresados.')) {
        return;
      }
    }
    this.closeModal(null);
  }

  /**
   * Cierra el modal (placeholder - implementar según framework de modals usado)
   */
  private closeModal(data: unknown): void {
    // TODO: Implementar cierre de modal según framework usado
    // Ejemplo con Angular Material Dialog:
    // this.dialogRef.close(data);

    // Ejemplo con Ionic:
    // this.modalCtrl.dismiss({ inspection: data });

    // Por ahora, emitir evento al padre

    // Si hay un callback en el window (workaround temporal)
    const win = window as WindowWithInspectionCallback;
    if (win.inspectionUploaderCallback) {
      win.inspectionUploaderCallback(data);
    }
  }
}
