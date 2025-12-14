import {Component, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';

import { VerificationService } from '../../../../core/services/verification.service';

@Component({
  selector: 'app-dni-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <h3 class="text-lg font-bold text-text-primary dark:text-text-primary">
        Documento de Identidad (DNI)
      </h3>
    
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- FRENTE -->
        <div
          class="card bg-surface-base dark:bg-surface-secondary border border-border-default rounded-lg"
          >
          <div class="p-4 flex flex-col items-center text-center">
            <h4 class="font-semibold text-sm text-text-primary dark:text-text-primary mb-2">
              Frente
            </h4>
            <div
              class="w-full h-32 bg-surface-secondary dark:bg-surface-tertiary rounded-lg flex items-center justify-center overflow-hidden relative"
              >
              @if (frontPreview()) {
                <img
                  [src]="frontPreview()"
                  class="object-cover w-full h-full"
                  />
              }
              @if (!frontPreview()) {
                <span class="text-4xl opacity-20">🪪</span>
              }
    
              <!-- Loading Overlay -->
              @if (uploadingFront()) {
                <div
                  class="absolute inset-0 bg-surface-base/50 dark:bg-surface-base/50 flex items-center justify-center"
                  >
                  <span class="loading loading-spinner text-cta-default"></span>
                </div>
              }
    
              <!-- Success Check -->
              @if (frontUploaded() && !uploadingFront()) {
                <div
                  class="absolute top-2 right-2 bg-success-bg text-success-text rounded-full p-1"
                  >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                      />
                  </svg>
                </div>
              }
            </div>
    
            <input
              #frontInput
              type="file"
              hidden
              accept="image/*"
              (change)="onFileSelected($event, 'dni_front')"
              />
            <button
              class="mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              [class]="
                frontPreview()
                  ? 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-default'
                  : 'bg-cta-default hover:bg-cta-hover text-cta-text'
              "
              (click)="frontInput.click()"
              [disabled]="uploadingFront()"
              >
              {{ frontPreview() ? 'Cambiar' : 'Subir Foto' }}
            </button>
          </div>
        </div>
    
        <!-- DORSO -->
        <div
          class="card bg-surface-base dark:bg-surface-secondary border border-border-default rounded-lg"
          >
          <div class="p-4 flex flex-col items-center text-center">
            <h4 class="font-semibold text-sm text-text-primary dark:text-text-primary mb-2">
              Dorso
            </h4>
            <div
              class="w-full h-32 bg-surface-secondary dark:bg-surface-tertiary rounded-lg flex items-center justify-center overflow-hidden relative"
              >
              @if (backPreview()) {
                <img [src]="backPreview()" class="object-cover w-full h-full" />
              }
              @if (!backPreview()) {
                <span class="text-4xl opacity-20">🔄</span>
              }
    
              <!-- Loading Overlay -->
              @if (uploadingBack()) {
                <div
                  class="absolute inset-0 bg-surface-base/50 dark:bg-surface-base/50 flex items-center justify-center"
                  >
                  <span class="loading loading-spinner text-cta-default"></span>
                </div>
              }
    
              <!-- Success Check -->
              @if (backUploaded() && !uploadingBack()) {
                <div
                  class="absolute top-2 right-2 bg-success-bg text-success-text rounded-full p-1"
                  >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                      />
                  </svg>
                </div>
              }
            </div>
    
            <input
              #backInput
              type="file"
              hidden
              accept="image/*"
              (change)="onFileSelected($event, 'dni_back')"
              />
            <button
              class="mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              [class]="
                backPreview()
                  ? 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-default'
                  : 'bg-cta-default hover:bg-cta-hover text-cta-text'
              "
              (click)="backInput.click()"
              [disabled]="uploadingBack()"
              >
              {{ backPreview() ? 'Cambiar' : 'Subir Foto' }}
            </button>
          </div>
        </div>
      </div>
    
      <div
        class="p-3 rounded-lg bg-info-bg border border-info-border text-sm text-info-text flex items-start gap-2"
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-current shrink-0 w-5 h-5 mt-0.5"
          >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <span
          >Asegúrate de que el texto sea legible, la foto esté bien iluminada y no haya
          reflejos.</span
          >
        </div>
    
        <!-- Status message -->
        @if (frontUploaded() && backUploaded()) {
          <div
            class="p-3 rounded-lg bg-success-bg border border-success-border text-sm text-success-text flex items-center gap-2"
            >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
                />
            </svg>
            <span>DNI subido correctamente. Será verificado en las próximas horas.</span>
          </div>
        }
      </div>
    `,
})
export class DniUploaderComponent {
  private verificationService = inject(VerificationService);

  uploadingFront = signal(false);
  uploadingBack = signal(false);

  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  frontUploaded = signal(false);
  backUploaded = signal(false);

  async onFileSelected(event: Event, type: 'dni_front' | 'dni_back') {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      if (type === 'dni_front') this.frontPreview.set(result);
      else this.backPreview.set(result);
    };
    reader.readAsDataURL(file);

    // Subida real
    if (type === 'dni_front') this.uploadingFront.set(true);
    else this.uploadingBack.set(true);

    try {
      await this.verificationService.uploadDocument(file, type);

      // Mark as uploaded
      if (type === 'dni_front') this.frontUploaded.set(true);
      else this.backUploaded.set(true);
    } catch (error) {
      console.error('Error uploading DNI:', error);
      alert('Error al subir imagen. Intenta de nuevo.');

      // Clear preview on error
      if (type === 'dni_front') this.frontPreview.set(null);
      else this.backPreview.set(null);
    } finally {
      if (type === 'dni_front') this.uploadingFront.set(false);
      else this.uploadingBack.set(false);
    }
  }
}
