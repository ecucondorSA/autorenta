import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VerificationService } from '../../../core/services/verification.service';

interface DocumentConfig {
  id: string;
  label: string;
  description: string;
  emoji: string;
  hasFrontBack?: boolean;
  // DB enum kinds for front/back documents
  frontKind?: string;
  backKind?: string;
}

const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  driver_license: {
    id: 'driver_license',
    label: 'Licencia de Conducir',
    description: 'Sube el frente y dorso de tu licencia de conducir vigente',
    emoji: '🪪',
    hasFrontBack: true,
    frontKind: 'license_front',  // DB enum: license_front
    backKind: 'license_back',    // DB enum: license_back
  },
  gov_id: {
    id: 'gov_id',
    label: 'DNI',
    description: 'Sube el frente y dorso de tu documento de identidad',
    emoji: '🆔',
    hasFrontBack: true,
    frontKind: 'gov_id_front',   // DB enum: gov_id_front
    backKind: 'gov_id_back',     // DB enum: gov_id_back
  },
  gov_id_front: {
    id: 'gov_id_front',
    label: 'DNI - Frente',
    description: 'Foto clara del frente de tu documento de identidad',
    emoji: '🆔',
  },
  gov_id_back: {
    id: 'gov_id_back',
    label: 'DNI - Reverso',
    description: 'Foto clara del dorso de tu documento de identidad',
    emoji: '🆔',
  },
  vehicle_registration: {
    id: 'vehicle_registration',
    label: 'Cédula del Vehículo',
    description: 'Cédula de identidad del vehículo (título o cédula verde)',
    emoji: '📄',
  },
  vehicle_insurance: {
    id: 'vehicle_insurance',
    label: 'Póliza de Seguro',
    description: 'Póliza de seguro del vehículo vigente',
    emoji: '🛡️',
  },
  selfie: {
    id: 'selfie',
    label: 'Selfie de Verificación',
    description: 'Una foto tuya sosteniendo tu documento de identidad',
    emoji: '🤳',
  },
};

@Component({
  selector: 'app-document-upload-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ config?.emoji }}</span>
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ config?.label }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-500">
                {{ config?.description }}
              </p>
            </div>
          </div>
          <button
            (click)="closed.emit()"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          @if (config?.hasFrontBack) {
            <!-- Front/Back Upload -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Front -->
              <div class="space-y-2">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-500">Frente</p>
                <div
                  class="aspect-[3/2] bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary-500 transition-colors"
                  (click)="frontInput.click()"
                >
                  @if (frontPreview()) {
                    <img [src]="frontPreview()" class="w-full h-full object-cover" />
                  } @else {
                    <div class="text-center p-4">
                      <span class="text-3xl">📷</span>
                      <p class="text-xs text-gray-500 mt-2">Click para subir</p>
                    </div>
                  }
                  @if (uploadingFront()) {
                    <div class="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                  }
                </div>
                <input
                  #frontInput
                  type="file"
                  hidden
                  accept="image/*"
                  (change)="onFileSelected($event, 'front')"
                />
              </div>

              <!-- Back -->
              <div class="space-y-2">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-500">Dorso</p>
                <div
                  class="aspect-[3/2] bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary-500 transition-colors"
                  (click)="backInput.click()"
                >
                  @if (backPreview()) {
                    <img [src]="backPreview()" class="w-full h-full object-cover" />
                  } @else {
                    <div class="text-center p-4">
                      <span class="text-3xl">📷</span>
                      <p class="text-xs text-gray-500 mt-2">Click para subir</p>
                    </div>
                  }
                  @if (uploadingBack()) {
                    <div class="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                  }
                </div>
                <input
                  #backInput
                  type="file"
                  hidden
                  accept="image/*"
                  (change)="onFileSelected($event, 'back')"
                />
              </div>
            </div>
          } @else {
            <!-- Single Upload -->
            <div class="space-y-2">
              <div
                class="aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-primary-500 transition-colors"
                (click)="singleInput.click()"
              >
                @if (singlePreview()) {
                  <img [src]="singlePreview()" class="w-full h-full object-cover" />
                } @else {
                  <div class="text-center p-8">
                    <span class="text-5xl">📷</span>
                    <p class="text-sm text-gray-500 mt-4">Click o arrastra para subir</p>
                  </div>
                }
                @if (uploadingSingle()) {
                  <div class="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                  </div>
                }
              </div>
              <input
                #singleInput
                type="file"
                hidden
                accept="image/*"
                (change)="onFileSelected($event, 'single')"
              />
            </div>
          }

          <!-- Success Message -->
          @if (uploadSuccess()) {
            <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Documento subido correctamente
            </div>
          }

          <!-- Error Message -->
          @if (uploadError()) {
            <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {{ uploadError() }}
            </div>
          }

          <!-- Info -->
          <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-start gap-2">
            <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Asegurate que la imagen sea clara, sin reflejos y que el texto sea legible.</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            (click)="closed.emit()"
            class="px-4 py-2 text-gray-700 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DocumentUploadModalComponent {
  @Input() docType: string = '';
  @Output() closed = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<void>();

  private verificationService = inject(VerificationService);

  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);
  singlePreview = signal<string | null>(null);

  uploadingFront = signal(false);
  uploadingBack = signal(false);
  uploadingSingle = signal(false);

  uploadSuccess = signal(false);
  uploadError = signal<string | null>(null);

  get config(): DocumentConfig | null {
    return DOCUMENT_CONFIGS[this.docType] || null;
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  async onFileSelected(event: Event, position: 'front' | 'back' | 'single') {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Reset messages
    this.uploadSuccess.set(false);
    this.uploadError.set(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      if (position === 'front') this.frontPreview.set(result);
      else if (position === 'back') this.backPreview.set(result);
      else this.singlePreview.set(result);
    };
    reader.readAsDataURL(file);

    // Set loading state
    if (position === 'front') this.uploadingFront.set(true);
    else if (position === 'back') this.uploadingBack.set(true);
    else this.uploadingSingle.set(true);

    try {
      // Determine document kind based on position and docType
      let kind: string;
      if (this.config?.hasFrontBack) {
        // Use explicit DB enum kinds if defined, otherwise fallback to generated
        kind = position === 'front'
          ? (this.config.frontKind ?? `${this.docType}_front`)
          : (this.config.backKind ?? `${this.docType}_back`);
      } else {
        kind = this.docType;
      }

      await this.verificationService.uploadDocument(file, kind);
      this.uploadSuccess.set(true);
      this.uploaded.emit();
    } catch (error) {
      console.error('Error uploading document:', error);
      this.uploadError.set('Error al subir el documento. Por favor intenta de nuevo.');
    } finally {
      if (position === 'front') this.uploadingFront.set(false);
      else if (position === 'back') this.uploadingBack.set(false);
      else this.uploadingSingle.set(false);
    }
  }
}
