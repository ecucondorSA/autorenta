import {Component, inject, signal, input,
  ChangeDetectionStrategy} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';

import { VerificationService } from '@core/services/verification/verification.service';

type Country = 'AR' | 'EC';

interface LicenseOcrResultDisplay {
  success: boolean;
  confidence: number;
  licenseNumber?: string;
  category?: string;
  expiryDate?: string;
  holderName?: string;
  errors: string[];
  warnings: string[];
}

@Component({
  selector: 'app-license-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DatePipe],
  template: `
    <div class="space-y-6">
      <!-- Country Selector (inherited from parent or standalone) -->
      @if (!hideCountrySelector()) {
        <div class="flex gap-2 mb-4">
          <button
            (click)="selectCountry('AR')"
            class="flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
            [class]="selectedCountry() === 'AR'
              ? 'bg-cta-default text-cta-text'
              : 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-default'"
          >
            🇦🇷 Argentina
          </button>
          <button
            (click)="selectCountry('EC')"
            class="flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
            [class]="selectedCountry() === 'EC'
              ? 'bg-cta-default text-cta-text'
              : 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-default'"
          >
            🇪🇨 Ecuador
          </button>
        </div>
      }

      <h3 class="text-lg font-bold text-text-primary dark:text-text-primary">
        Licencia de Conducir
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
              (change)="onFileSelected($event, 'license_front')"
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
              (change)="onFileSelected($event, 'license_back')"
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

        <!-- OCR Result Display -->
        @if (frontOcrResult() || backOcrResult()) {
          <div class="p-4 rounded-lg bg-surface-secondary border border-border-default">
            <h4 class="font-semibold text-sm text-text-primary mb-3">Datos Extraídos (OCR)</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              @if (frontOcrResult()?.holderName) {
                <div>
                  <span class="text-text-muted">Titular:</span>
                  <span class="font-medium text-text-primary ml-1">{{ frontOcrResult()?.holderName }}</span>
                </div>
              }
              @if (frontOcrResult()?.licenseNumber || backOcrResult()?.licenseNumber) {
                <div>
                  <span class="text-text-muted">N° Licencia:</span>
                  <span class="font-medium text-text-primary ml-1">{{ frontOcrResult()?.licenseNumber || backOcrResult()?.licenseNumber }}</span>
                </div>
              }
              @if (frontOcrResult()?.category || backOcrResult()?.category) {
                <div>
                  <span class="text-text-muted">Categoría:</span>
                  <span class="font-medium text-text-primary ml-1">{{ frontOcrResult()?.category || backOcrResult()?.category }}</span>
                </div>
              }
              @if (frontOcrResult()?.expiryDate || backOcrResult()?.expiryDate) {
                <div>
                  <span class="text-text-muted">Vencimiento:</span>
                  <span class="font-medium ml-1" [class]="isExpired() ? 'text-error-text' : 'text-success-text'">
                    {{ frontOcrResult()?.expiryDate || backOcrResult()?.expiryDate }}
                    @if (isExpired()) {
                      <span class="text-xs">(VENCIDA)</span>
                    }
                  </span>
                </div>
              }
              <div>
                <span class="text-text-muted">Confianza:</span>
                <span class="font-medium ml-1" [class]="(frontOcrResult()?.confidence || 0) >= 70 ? 'text-success-text' : 'text-warning-text'">
                  {{ (frontOcrResult()?.confidence || backOcrResult()?.confidence || 0) | number:'1.0-0' }}%
                </span>
              </div>
            </div>
            @if ((frontOcrResult()?.warnings?.length || 0) > 0 || (backOcrResult()?.warnings?.length || 0) > 0) {
              <div class="mt-2 text-xs text-warning-text">
                @for (warning of frontOcrResult()?.warnings || []; track warning) {
                  <p>⚠️ {{ warning }}</p>
                }
                @for (warning of backOcrResult()?.warnings || []; track warning) {
                  <p>⚠️ {{ warning }}</p>
                }
              </div>
            }
          </div>
        }

        <!-- Expiry Warning -->
        @if (isExpired()) {
          <div
            class="p-3 rounded-lg bg-error-bg border border-error-border text-sm text-error-text flex items-center gap-2"
            >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
                />
            </svg>
            <span>Tu licencia está vencida. Debes renovarla para poder alquilar vehículos.</span>
          </div>
        }

        <!-- Status message -->
        @if (frontUploaded() && backUploaded()) {
          <div
            class="p-3 rounded-lg text-sm flex items-center gap-2"
            [class]="(frontOcrResult()?.success && backOcrResult()?.success && !isExpired())
              ? 'bg-success-bg border border-success-border text-success-text'
              : 'bg-warning-bg border border-warning-border text-warning-text'"
            >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
                />
            </svg>
            <span>
              @if (frontOcrResult()?.success && backOcrResult()?.success && !isExpired()) {
                Licencia de conducir verificada correctamente.
              } @else if (isExpired()) {
                Licencia subida pero VENCIDA. Renueva tu licencia.
              } @else {
                Licencia subida. Verificación manual pendiente.
              }
            </span>
          </div>
        }
      </div>
    `,
})
export class LicenseUploaderComponent {
  private verificationService = inject(VerificationService);

  // Input para ocultar el selector de país si ya se seleccionó en DNI
  hideCountrySelector = input(false);
  initialCountry = input<Country>('AR');

  // Country selection
  selectedCountry = signal<Country>('AR');

  uploadingFront = signal(false);
  uploadingBack = signal(false);

  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  frontUploaded = signal(false);
  backUploaded = signal(false);

  // OCR Results
  frontOcrResult = signal<LicenseOcrResultDisplay | null>(null);
  backOcrResult = signal<LicenseOcrResultDisplay | null>(null);

  constructor() {
    // Set initial country from input
    if (this.initialCountry()) {
      this.selectedCountry.set(this.initialCountry());
    }
  }

  selectCountry(country: Country): void {
    this.selectedCountry.set(country);
    // Reset state when country changes
    this.frontPreview.set(null);
    this.backPreview.set(null);
    this.frontUploaded.set(false);
    this.backUploaded.set(false);
    this.frontOcrResult.set(null);
    this.backOcrResult.set(null);
  }

  isExpired(): boolean {
    const expiryStr = this.frontOcrResult()?.expiryDate || this.backOcrResult()?.expiryDate;
    if (!expiryStr) return false;

    try {
      // Parse date in format DD/MM/YYYY or YYYY-MM-DD
      let expiryDate: Date;
      if (expiryStr.includes('/')) {
        const parts = expiryStr.split('/');
        expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        expiryDate = new Date(expiryStr);
      }
      return expiryDate < new Date();
    } catch {
      return false;
    }
  }

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

    // Subida real con OCR
    if (type === 'license_front') this.uploadingFront.set(true);
    else this.uploadingBack.set(true);

    try {
      // Use driver_license type for both front and back
      // Note: side is derived internally from docType (driver_license = front, driver_license_back = back)
      const docType = type === 'license_front' ? 'driver_license' : 'driver_license_back';

      const result = await this.verificationService.uploadAndVerifyDocument(
        file,
        docType,
        this.selectedCountry()
      );

      // Mark as uploaded
      if (type === 'license_front') {
        this.frontUploaded.set(true);
        if (result.ocrResult) {
          this.frontOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            licenseNumber: result.ocrResult.extracted_data?.['licenseNumber'] as string,
            category: result.ocrResult.extracted_data?.['category'] as string,
            expiryDate: result.ocrResult.extracted_data?.['expiryDate'] as string,
            holderName: result.ocrResult.extracted_data?.['holderName'] as string,
            errors: result.ocrResult.errors,
            warnings: result.ocrResult.warnings,
          });
        }
      } else {
        this.backUploaded.set(true);
        if (result.ocrResult) {
          this.backOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            licenseNumber: result.ocrResult.extracted_data?.['licenseNumber'] as string,
            category: result.ocrResult.extracted_data?.['category'] as string,
            expiryDate: result.ocrResult.extracted_data?.['expiryDate'] as string,
            holderName: result.ocrResult.extracted_data?.['holderName'] as string,
            errors: result.ocrResult.errors,
            warnings: result.ocrResult.warnings,
          });
        }
      }
    } catch (error) {
      console.error('Error uploading license:', error);
      alert('Error al subir imagen. Intenta de nuevo.');

      // Clear preview on error
      if (type === 'license_front') this.frontPreview.set(null);
      else this.backPreview.set(null);
    } finally {
      if (type === 'license_front') this.uploadingFront.set(false);
      else this.uploadingBack.set(false);
    }
  }
}
