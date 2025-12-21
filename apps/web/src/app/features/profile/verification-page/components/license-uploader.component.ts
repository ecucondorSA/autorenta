import {Component, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';

import { VerificationService } from '@core/services/verification/verification.service';

@Component({
  selector: 'app-license-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-6">
      <h3 class="text-lg font-bold">Licencia de Conducir</h3>
    
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- FRENTE -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body items-center text-center">
            <h4 class="card-title text-sm">Frente</h4>
            <div
              class="w-full h-32 bg-base-200 rounded-lg flex items-center justify-center overflow-hidden relative"
              >
              @if (frontPreview()) {
                <img
                  [src]="frontPreview()"
                  class="object-cover w-full h-full"
                  />
              }
              @if (!frontPreview()) {
                <span class="text-4xl text-base-content/20">🪪</span>
              }
    
              <!-- Loading Overlay -->
              @if (uploadingFront()) {
                <div
                  class="absolute inset-0 bg-base-100/50 flex items-center justify-center"
                  >
                  <span class="loading loading-spinner"></span>
                </div>
              }
            </div>
    
            <input
              #frontInput
              type="file"
              hidden
              accept="image/*"
              (change)="onFileSelected($event, 'license_front')"
              />
            <button
              class="btn btn-sm btn-outline mt-2"
              (click)="frontInput.click()"
              [disabled]="uploadingFront()"
              >
              {{ frontPreview() ? 'Cambiar' : 'Subir Foto' }}
            </button>
          </div>
        </div>
    
        <!-- DORSO -->
        <div class="card bg-base-100 border border-base-300">
          <div class="card-body items-center text-center">
            <h4 class="card-title text-sm">Dorso</h4>
            <div
              class="w-full h-32 bg-base-200 rounded-lg flex items-center justify-center overflow-hidden relative"
              >
              @if (backPreview()) {
                <img [src]="backPreview()" class="object-cover w-full h-full" />
              }
              @if (!backPreview()) {
                <span class="text-4xl text-base-content/20">🔄</span>
              }
    
              <!-- Loading Overlay -->
              @if (uploadingBack()) {
                <div
                  class="absolute inset-0 bg-base-100/50 flex items-center justify-center"
                  >
                  <span class="loading loading-spinner"></span>
                </div>
              }
            </div>
    
            <input
              #backInput
              type="file"
              hidden
              accept="image/*"
              (change)="onFileSelected($event, 'license_back')"
              />
            <button
              class="btn btn-sm btn-outline mt-2"
              (click)="backInput.click()"
              [disabled]="uploadingBack()"
              >
              {{ backPreview() ? 'Cambiar' : 'Subir Foto' }}
            </button>
          </div>
        </div>
      </div>
    
      <div class="alert alert-info text-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-current shrink-0 w-6 h-6"
          >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>Asegúrate de que el texto sea legible y no haya reflejos.</span>
      </div>
    </div>
    `,
})
export class LicenseUploaderComponent {
  private verificationService = inject(VerificationService);

  uploadingFront = signal(false);
  uploadingBack = signal(false);

  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  async onFileSelected(event: Event, type: 'license_front' | 'license_back') {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      if (type === 'license_front') this.frontPreview.set(result);
      else this.backPreview.set(result);
    };
    reader.readAsDataURL(file);

    // Subida real
    if (type === 'license_front') this.uploadingFront.set(true);
    else this.uploadingBack.set(true);

    try {
      await this.verificationService.uploadDocument(file, type);
      // Opcional: Notificar éxito
    } catch (error) {
      console.error('Error uploading', error);
      alert('Error al subir imagen. Intenta de nuevo.');
    } finally {
      if (type === 'license_front') this.uploadingFront.set(false);
      else this.uploadingBack.set(false);
    }
  }
}
