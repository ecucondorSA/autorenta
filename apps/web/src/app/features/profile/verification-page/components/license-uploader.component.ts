import {
  Component,
  inject,
  signal,
  input,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

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

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  verified: boolean;
  isExpired?: boolean;
}

@Component({
  selector: 'app-license-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="space-y-5">
      <!-- Country Selector - Segmented Control -->
      @if (!hideCountrySelector()) {
        <div class="relative flex p-1 rounded-xl bg-surface-secondary/80">
          <div
            class="absolute inset-y-1 rounded-lg bg-cta-default shadow-md transition-all duration-300 ease-out"
            [style.left]="selectedCountry() === 'AR' ? '4px' : 'calc(50% + 2px)'"
            [style.width]="'calc(50% - 6px)'"
          ></div>
          <button
            (click)="selectCountry('AR')"
            class="relative z-10 flex-1 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
            [class]="selectedCountry() === 'AR' ? 'text-cta-text' : 'text-text-secondary hover:text-text-primary'"
          >
            <span class="text-base">🇦🇷</span> Argentina
          </button>
          <button
            (click)="selectCountry('EC')"
            class="relative z-10 flex-1 py-3 rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
            [class]="selectedCountry() === 'EC' ? 'text-cta-text' : 'text-text-secondary hover:text-text-primary'"
          >
            <span class="text-base">🇪🇨</span> Ecuador
          </button>
        </div>
      }

      <!-- Document Title -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-cta-default/10 flex items-center justify-center">
          <svg class="w-5 h-5 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-text-primary">Licencia de Conducir</h3>
          <p class="text-xs text-text-muted">Habilitación para conducir</p>
        </div>
      </div>

      <!-- Upload Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- FRENTE -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">Frente</span>
            @if (frontUploaded() && !uploadingFront()) {
              <span class="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700">Listo</span>
            }
          </div>

          <!-- Drop Zone -->
          <div
            class="relative w-full rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group"
            style="aspect-ratio: 85.6 / 54;"
            [class]="getFrontZoneClass()"
            (click)="frontGalleryInput.click()"
            (dragover)="onDragOver($event, 'front')"
            (dragleave)="onDragLeave('front')"
            (drop)="onDrop($event, 'license_front')"
          >
            @if (!frontPreview() && !uploadingFront()) {
              <div class="absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-200">
                <div class="w-14 h-14 rounded-full bg-surface-hover/50 flex items-center justify-center mb-3 group-hover:bg-cta-default/10 group-hover:scale-110 transition-all">
                  <svg class="w-7 h-7 text-text-muted group-hover:text-cta-default transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <span class="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">Frente de la licencia</span>
                <span class="text-xs text-text-muted mt-1">Arrastra o haz clic para subir</span>
              </div>
            }

            @if (frontPreview() && !uploadingFront()) {
              <img [src]="frontPreview()" class="w-full h-full object-cover" alt="Frente Licencia"/>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div class="absolute bottom-3 left-3">
                  <span class="text-xs text-white/80">Clic para cambiar</span>
                </div>
              </div>
              <div class="absolute top-3 right-3 w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            }

            @if (uploadingFront()) {
              <div class="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex flex-col items-center justify-center">
                <div class="relative w-16 h-16">
                  <svg class="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke-width="4" class="fill-none stroke-surface-hover"/>
                    <circle cx="32" cy="32" r="28" stroke-width="4"
                      class="fill-none stroke-cta-default transition-all duration-300"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="176"
                      [attr.stroke-dashoffset]="176 - (176 * frontProgress() / 100)"/>
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-cta-default">
                    {{ frontProgress() }}%
                  </span>
                </div>
                <span class="mt-3 text-sm text-text-secondary">Procesando...</span>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <label class="flex-1 md:hidden">
              <input #frontCameraInput type="file" accept="image/*" capture="environment" (change)="onFileSelected($event, 'license_front')" class="hidden"/>
              <div class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cta-default text-cta-text font-medium text-sm cursor-pointer hover:bg-cta-hover active:scale-[0.98] transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Cámara
              </div>
            </label>
            <label class="flex-1">
              <input #frontGalleryInput type="file" accept="image/*" (change)="onFileSelected($event, 'license_front')" class="hidden"/>
              <div
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm cursor-pointer active:scale-[0.98] transition-all"
                [class]="frontPreview()
                  ? 'bg-surface-secondary text-text-primary hover:bg-surface-hover border border-border-default'
                  : 'bg-cta-default text-cta-text hover:bg-cta-hover'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {{ frontPreview() ? 'Cambiar' : 'Galería' }}
              </div>
            </label>
          </div>
        </div>

        <!-- DORSO -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">Dorso</span>
            @if (backUploaded() && !uploadingBack()) {
              <span class="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700">Listo</span>
            }
          </div>

          <div
            class="relative w-full rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group"
            style="aspect-ratio: 85.6 / 54;"
            [class]="getBackZoneClass()"
            (click)="backGalleryInput.click()"
            (dragover)="onDragOver($event, 'back')"
            (dragleave)="onDragLeave('back')"
            (drop)="onDrop($event, 'license_back')"
          >
            @if (!backPreview() && !uploadingBack()) {
              <div class="absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-200">
                <div class="w-14 h-14 rounded-full bg-surface-hover/50 flex items-center justify-center mb-3 group-hover:bg-cta-default/10 group-hover:scale-110 transition-all">
                  <svg class="w-7 h-7 text-text-muted group-hover:text-cta-default transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </div>
                <span class="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">Dorso de la licencia</span>
                <span class="text-xs text-text-muted mt-1">Arrastra o haz clic para subir</span>
              </div>
            }

            @if (backPreview() && !uploadingBack()) {
              <img [src]="backPreview()" class="w-full h-full object-cover" alt="Dorso Licencia"/>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div class="absolute bottom-3 left-3">
                  <span class="text-xs text-white/80">Clic para cambiar</span>
                </div>
              </div>
              <div class="absolute top-3 right-3 w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            }

            @if (uploadingBack()) {
              <div class="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex flex-col items-center justify-center">
                <div class="relative w-16 h-16">
                  <svg class="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke-width="4" class="fill-none stroke-surface-hover"/>
                    <circle cx="32" cy="32" r="28" stroke-width="4"
                      class="fill-none stroke-cta-default transition-all duration-300"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="176"
                      [attr.stroke-dashoffset]="176 - (176 * backProgress() / 100)"/>
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-cta-default">
                    {{ backProgress() }}%
                  </span>
                </div>
                <span class="mt-3 text-sm text-text-secondary">Procesando...</span>
              </div>
            }
          </div>

          <div class="flex gap-2">
            <label class="flex-1 md:hidden">
              <input #backCameraInput type="file" accept="image/*" capture="environment" (change)="onFileSelected($event, 'license_back')" class="hidden"/>
              <div class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cta-default text-cta-text font-medium text-sm cursor-pointer hover:bg-cta-hover active:scale-[0.98] transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Cámara
              </div>
            </label>
            <label class="flex-1">
              <input #backGalleryInput type="file" accept="image/*" (change)="onFileSelected($event, 'license_back')" class="hidden"/>
              <div
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm cursor-pointer active:scale-[0.98] transition-all"
                [class]="backPreview()
                  ? 'bg-surface-secondary text-text-primary hover:bg-surface-hover border border-border-default'
                  : 'bg-cta-default text-cta-text hover:bg-cta-hover'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {{ backPreview() ? 'Cambiar' : 'Galería' }}
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- OCR Results Card -->
      @if (frontOcrResult() || backOcrResult()) {
        <div class="rounded-xl border border-border-default overflow-hidden bg-gradient-to-br from-surface-raised to-surface-base animate-fade-in-up">
          <div class="p-4 border-b border-border-default/50 bg-gradient-to-r from-transparent to-surface-secondary/30">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center"
                  [class]="getConfidenceIconClass()">
                  @if (isVerified() && !isExpired()) {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  }
                </div>
                <div>
                  <h4 class="font-semibold text-text-primary">Datos de Licencia</h4>
                  <p class="text-xs text-text-secondary">Verificación automática OCR</p>
                </div>
              </div>

              <div class="relative w-14 h-14">
                <svg class="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke-width="5" class="fill-none stroke-surface-hover"/>
                  <circle cx="28" cy="28" r="24" stroke-width="5"
                    class="fill-none transition-all duration-1000 ease-out"
                    stroke-linecap="round"
                    [class]="getConfidence() >= 70 ? 'stroke-success-500' : 'stroke-warning-500'"
                    [attr.stroke-dasharray]="150.8"
                    [attr.stroke-dashoffset]="150.8 - (150.8 * getConfidence() / 100)"/>
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  [class]="getConfidence() >= 70 ? 'text-success-600' : 'text-warning-600'">
                  {{ getConfidence() | number:'1.0-0' }}%
                </span>
              </div>
            </div>
          </div>

          <div class="p-4 grid grid-cols-2 gap-4">
            @for (field of extractedFields(); track field.key; let i = $index) {
              <div class="animate-fade-in-up" [style.animation-delay]="(i * 100) + 'ms'">
                <span class="text-xs text-text-muted uppercase tracking-wide">{{ field.label }}</span>
                <p class="mt-1 font-semibold flex items-center gap-2"
                  [class]="field.isExpired ? 'text-error-600' : 'text-text-primary'">
                  {{ field.value }}
                  @if (field.isExpired) {
                    <span class="text-xs px-1.5 py-0.5 rounded bg-error-100 text-error-700">VENCIDA</span>
                  } @else if (field.verified) {
                    <svg class="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  }
                </p>
              </div>
            }
          </div>

          @if (hasWarnings()) {
            <div class="px-4 pb-4">
              <div class="p-3 rounded-lg bg-warning-100/50 border border-warning-200">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <div class="space-y-1">
                    @for (warning of getAllWarnings(); track warning) {
                      <p class="text-sm text-warning-700">{{ warning }}</p>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Expiry Warning -->
        @if (isExpired()) {
          <div class="p-3 rounded-xl bg-error-50 border border-error-200 text-sm text-error-700 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-error-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </div>
            <span class="font-medium">Tu licencia está vencida. Debes renovarla para poder reservar.</span>
          </div>
        }

        <!-- Status Message -->
        <div
          class="p-3 rounded-xl text-sm flex items-center gap-3"
          [class]="getStatusClass()"
        >
          <div class="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0">
            @if (isVerified() && !isExpired()) {
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            }
          </div>
          <span class="font-medium">{{ getStatusMessage() }}</span>
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

  // Upload states
  uploadingFront = signal(false);
  uploadingBack = signal(false);

  // Previews
  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  // Upload status
  frontUploaded = signal(false);
  backUploaded = signal(false);

  // Progress (simulated for UX)
  frontProgress = signal(0);
  backProgress = signal(0);

  // Drag states
  isDraggingFront = signal(false);
  isDraggingBack = signal(false);

  // OCR Results
  frontOcrResult = signal<LicenseOcrResultDisplay | null>(null);
  backOcrResult = signal<LicenseOcrResultDisplay | null>(null);

  // Computed: Extracted fields for display
  extractedFields = computed<ExtractedField[]>(() => {
    const fields: ExtractedField[] = [];
    const front = this.frontOcrResult();
    const back = this.backOcrResult();
    const verified = this.isVerified();
    const expired = this.isExpired();

    // Holder name
    const holderName = front?.holderName || back?.holderName;
    if (holderName) {
      fields.push({
        key: 'holderName',
        label: 'Titular',
        value: holderName,
        verified
      });
    }

    // License number
    const licenseNumber = front?.licenseNumber || back?.licenseNumber;
    if (licenseNumber) {
      fields.push({
        key: 'licenseNumber',
        label: 'Nro. Licencia',
        value: licenseNumber,
        verified
      });
    }

    // Category
    const category = front?.category || back?.category;
    if (category) {
      fields.push({
        key: 'category',
        label: 'Categoría',
        value: category,
        verified
      });
    }

    // Expiry date
    const expiryDate = front?.expiryDate || back?.expiryDate;
    if (expiryDate) {
      fields.push({
        key: 'expiryDate',
        label: 'Vencimiento',
        value: expiryDate,
        verified: verified && !expired,
        isExpired: expired
      });
    }

    return fields;
  });

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
    this.frontProgress.set(0);
    this.backProgress.set(0);
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent, zone: 'front' | 'back'): void {
    event.preventDefault();
    event.stopPropagation();
    if (zone === 'front') {
      this.isDraggingFront.set(true);
    } else {
      this.isDraggingBack.set(true);
    }
  }

  onDragLeave(zone: 'front' | 'back'): void {
    if (zone === 'front') {
      this.isDraggingFront.set(false);
    } else {
      this.isDraggingBack.set(false);
    }
  }

  onDrop(event: DragEvent, type: 'license_front' | 'license_back'): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingFront.set(false);
    this.isDraggingBack.set(false);

    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.processFile(file, type);
    }
  }

  // Zone class getters
  getFrontZoneClass(): string {
    if (this.isDraggingFront()) {
      return 'border-2 border-dashed border-cta-default bg-cta-default/10 ring-4 ring-cta-default/20';
    }
    if (this.frontPreview()) {
      return 'border-2 border-solid border-success-400 bg-success-50/30';
    }
    return 'border-2 border-dashed border-border-default bg-gradient-to-br from-surface-secondary/50 to-surface-elevated/30 hover:border-cta-default hover:from-cta-default/5 hover:to-cta-default/10';
  }

  getBackZoneClass(): string {
    if (this.isDraggingBack()) {
      return 'border-2 border-dashed border-cta-default bg-cta-default/10 ring-4 ring-cta-default/20';
    }
    if (this.backPreview()) {
      return 'border-2 border-solid border-success-400 bg-success-50/30';
    }
    return 'border-2 border-dashed border-border-default bg-gradient-to-br from-surface-secondary/50 to-surface-elevated/30 hover:border-cta-default hover:from-cta-default/5 hover:to-cta-default/10';
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

  isVerified(): boolean {
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    return frontSuccess === true || frontConf >= 70;
  }

  getConfidence(): number {
    return this.frontOcrResult()?.confidence || this.backOcrResult()?.confidence || 0;
  }

  getConfidenceIconClass(): string {
    if (this.isVerified() && !this.isExpired()) {
      return 'bg-success-100 text-success-600';
    }
    if (this.isExpired()) {
      return 'bg-error-100 text-error-600';
    }
    return 'bg-warning-100 text-warning-600';
  }

  hasWarnings(): boolean {
    const frontWarnings = this.frontOcrResult()?.warnings?.length || 0;
    const backWarnings = this.backOcrResult()?.warnings?.length || 0;
    return frontWarnings > 0 || backWarnings > 0;
  }

  getAllWarnings(): string[] {
    const warnings: string[] = [];
    if (this.frontOcrResult()?.warnings) {
      warnings.push(...this.frontOcrResult()!.warnings);
    }
    if (this.backOcrResult()?.warnings) {
      warnings.push(...this.backOcrResult()!.warnings);
    }
    return warnings;
  }

  getStatusClass(): string {
    if (this.isExpired()) {
      return 'bg-error-50 border border-error-200 text-error-700';
    }
    if (this.isVerified()) {
      return 'bg-success-50 border border-success-200 text-success-700';
    }
    if (this.frontOcrResult() || this.backOcrResult()) {
      return 'bg-warning-50 border border-warning-200 text-warning-700';
    }
    return 'bg-info-50 border border-info-200 text-info-700';
  }

  getStatusMessage(): string {
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const backConf = this.backOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const backSuccess = this.backOcrResult()?.success;

    if (this.isExpired()) {
      return 'Licencia vencida. Renueva para poder reservar.';
    }

    if (frontSuccess === true || frontConf >= 70) {
      if (!this.backOcrResult()) {
        return 'Licencia verificada. Falta subir el dorso.';
      }
      if (backSuccess === true || backConf >= 70) {
        return 'Licencia verificada correctamente.';
      }
      return 'Frente verificado. Mejora la foto del dorso.';
    }

    if (this.frontOcrResult() && frontConf > 0 && frontConf < 70) {
      return `Baja confianza (${frontConf}%). Intenta con mejor foto.`;
    }

    if (this.backOcrResult() && !this.frontOcrResult()) {
      return 'Dorso procesado. Falta subir el frente.';
    }

    return 'Procesando verificación...';
  }

  async onFileSelected(event: Event, type: 'license_front' | 'license_back'): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    await this.processFile(file, type);

    // Clear input for re-selection of same file
    if (input) input.value = '';
  }

  private async processFile(file: File, type: 'license_front' | 'license_back'): Promise<void> {
    const docType = type === 'license_front' ? 'license_front' : 'license_back';
    const isFront = type === 'license_front';

    // Preview local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      if (isFront) this.frontPreview.set(result);
      else this.backPreview.set(result);
    };
    reader.readAsDataURL(file);

    // Set uploading state
    if (isFront) {
      this.uploadingFront.set(true);
      this.frontProgress.set(0);
    } else {
      this.uploadingBack.set(true);
      this.backProgress.set(0);
    }

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      const current = isFront ? this.frontProgress() : this.backProgress();
      if (current < 90) {
        const increment = Math.random() * 15 + 5;
        const newProgress = Math.min(current + increment, 90);
        if (isFront) this.frontProgress.set(Math.round(newProgress));
        else this.backProgress.set(Math.round(newProgress));
      }
    }, 200);

    try {
      const result = await this.verificationService.uploadAndVerifyDocument(
        file,
        docType,
        this.selectedCountry()
      );

      // Complete progress
      clearInterval(progressInterval);
      if (isFront) this.frontProgress.set(100);
      else this.backProgress.set(100);

      // Mark as uploaded
      if (isFront) {
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
      clearInterval(progressInterval);
      console.error('Error uploading license:', error);

      // Clear preview on error
      if (isFront) {
        this.frontPreview.set(null);
        this.frontProgress.set(0);
      } else {
        this.backPreview.set(null);
        this.backProgress.set(0);
      }
    } finally {
      if (isFront) this.uploadingFront.set(false);
      else this.uploadingBack.set(false);
    }
  }
}
