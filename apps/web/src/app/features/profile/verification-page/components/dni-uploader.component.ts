import {Component, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { VerificationService } from '@core/services/verification/verification.service';

type Country = 'AR' | 'EC';

interface OcrResultDisplay {
  success: boolean;
  confidence: number;
  extractedName?: string;
  extractedNumber?: string;
  errors: string[];
  warnings: string[];
  profileUpdated?: boolean;
}

@Component({
  selector: 'app-dni-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="space-y-6">
      <!-- Country Selector -->
      <div class="flex gap-2 mb-4">
        <button
          (click)="selectCountry('AR')"
          class="flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
          [class]="selectedCountry() === 'AR'
            ? 'bg-cta-default text-cta-text'
            : 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-default'"
        >
          🇦🇷 Argentina (DNI)
        </button>
        <button
          (click)="selectCountry('EC')"
          class="flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
          [class]="selectedCountry() === 'EC'
            ? 'bg-cta-default text-cta-text'
            : 'bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-default'"
        >
          🇪🇨 Ecuador (Cédula)
        </button>
      </div>

      <h3 class="text-lg font-bold text-text-primary dark:text-text-primary">
        {{ selectedCountry() === 'AR' ? 'DNI Argentina' : 'Cédula Ecuador' }}
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
    
        <!-- OCR Result Display -->
        @if (frontOcrResult() || backOcrResult()) {
          <div class="p-4 rounded-lg bg-surface-secondary border border-border-default">
            <h4 class="font-semibold text-sm text-text-primary mb-3">Datos Extraídos (OCR)</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              @if (frontOcrResult()?.extractedName) {
                <div>
                  <span class="text-text-muted">Nombre:</span>
                  <span class="font-medium text-text-primary ml-1">{{ frontOcrResult()?.extractedName }}</span>
                </div>
              }
              @if (frontOcrResult()?.extractedNumber || backOcrResult()?.extractedNumber) {
                <div>
                  <span class="text-text-muted">{{ selectedCountry() === 'AR' ? 'DNI' : 'Cédula' }}:</span>
                  <span class="font-medium text-text-primary ml-1">{{ frontOcrResult()?.extractedNumber || backOcrResult()?.extractedNumber }}</span>
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

        <!-- Status message - show when OCR results exist -->
        @if (frontOcrResult() || backOcrResult()) {
          <div
            class="mt-3 p-3 rounded-lg text-sm flex items-center gap-2"
            [class]="getStatusClass()"
            >
            @if (isProfileLocked()) {
              <!-- Lock icon when profile is protected -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
            } @else {
              <!-- Check icon for verification -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                  />
              </svg>
            }
            <span>{{ getStatusMessage() }}</span>
          </div>
        }
      </div>
    `,
})
export class DniUploaderComponent {
  private verificationService = inject(VerificationService);

  // Country selection
  selectedCountry = signal<Country>('AR');

  uploadingFront = signal(false);
  uploadingBack = signal(false);

  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  frontUploaded = signal(false);
  backUploaded = signal(false);

  // OCR Results
  frontOcrResult = signal<OcrResultDisplay | null>(null);
  backOcrResult = signal<OcrResultDisplay | null>(null);

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

  /**
   * Determina si el documento está verificado automáticamente
   * Criterios: OCR confianza >= 70% O success del backend O profileUpdated
   */
  isAutoVerified(): boolean {
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const profileUpdated = this.frontOcrResult()?.profileUpdated;

    // Verificado si: perfil actualizado, alta confianza, o success del backend
    return (profileUpdated === true || frontConf >= 70 || frontSuccess === true);
  }

  /**
   * Determina si el perfil fue actualizado e inmutable
   */
  isProfileLocked(): boolean {
    return this.frontOcrResult()?.profileUpdated === true;
  }

  getStatusClass(): string {
    if (this.isAutoVerified()) {
      return 'bg-success-bg border border-success-border text-success-text';
    }
    if (this.frontOcrResult() || this.backOcrResult()) {
      return 'bg-warning-bg border border-warning-border text-warning-text';
    }
    return 'bg-info-bg border border-info-border text-info-text';
  }

  getStatusMessage(): string {
    const docName = this.selectedCountry() === 'AR' ? 'DNI' : 'Cédula';
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const backConf = this.backOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const backSuccess = this.backOcrResult()?.success;
    const profileLocked = this.isProfileLocked();

    // Caso 1: Perfil actualizado y bloqueado (verificación automática completa)
    if (profileLocked) {
      if (!this.backOcrResult()) {
        return `Identidad verificada y perfil actualizado. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `Identidad verificada. Datos del perfil actualizados y protegidos.`;
      }
      return `Identidad verificada. Dorso requiere mejor foto para completar.`;
    }

    // Caso 2: Verificado automáticamente pero sin actualización de perfil (ya estaba bloqueado)
    if (frontSuccess === true || frontConf >= 70) {
      if (!this.backOcrResult()) {
        return `${docName} verificado. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `${docName} verificado correctamente.`;
      }
      return `${docName} frente verificado. Dorso requiere mejor foto.`;
    }

    // Caso 3: Frente con baja confianza
    if (this.frontOcrResult() && frontConf > 0 && frontConf < 70) {
      return `${docName} con baja confianza (${frontConf}%). Intenta con mejor foto.`;
    }

    // Caso 4: Solo dorso procesado
    if (this.backOcrResult() && !this.frontOcrResult()) {
      return `Dorso procesado. Falta subir el frente del ${docName}.`;
    }

    // Caso 5: Error o estado desconocido
    return `Documento procesado. Verificación en curso.`;
  }

  async onFileSelected(event: Event, type: 'dni_front' | 'dni_back') {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Map type to correct docType based on country
    const docType = this.selectedCountry() === 'AR'
      ? (type === 'dni_front' ? 'gov_id_front' : 'gov_id_back')
      : (type === 'dni_front' ? 'gov_id_front' : 'gov_id_back');

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      if (type === 'dni_front') this.frontPreview.set(result);
      else this.backPreview.set(result);
    };
    reader.readAsDataURL(file);

    // Subida real con OCR
    if (type === 'dni_front') this.uploadingFront.set(true);
    else this.uploadingBack.set(true);

    try {
      const result = await this.verificationService.uploadAndVerifyDocument(
        file,
        docType,
        this.selectedCountry()
      );

      // Mark as uploaded
      if (type === 'dni_front') {
        this.frontUploaded.set(true);
        if (result.ocrResult) {
          // Check if profile was auto-updated (message from backend)
          const profileUpdated = result.ocrResult.warnings?.some(
            (w: string) => w.includes('Identidad verificada automaticamente')
          ) || false;

          this.frontOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            extractedName: result.ocrResult.extracted_data?.['fullName'] as string,
            extractedNumber: result.ocrResult.extracted_data?.['documentNumber'] as string,
            errors: result.ocrResult.errors,
            warnings: result.ocrResult.warnings?.filter(
              (w: string) => !w.includes('Identidad verificada automaticamente')
            ) || [],
            profileUpdated,
          });
        }
      } else {
        this.backUploaded.set(true);
        if (result.ocrResult) {
          this.backOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            extractedName: result.ocrResult.extracted_data?.['fullName'] as string,
            extractedNumber: result.ocrResult.extracted_data?.['documentNumber'] as string,
            errors: result.ocrResult.errors,
            warnings: result.ocrResult.warnings || [],
          });
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
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
