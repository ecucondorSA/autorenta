import {
  Component,
  inject,
  signal,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VerificationService } from '@core/services/verification/verification.service';
import { DEFAULT_IMAGE_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';

const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'OTHER', name: 'Otro / Other', flag: '🌍' },
];

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

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB (mobile-friendly)

import { ToastService } from '@core/services/ui/toast.service';

@Component({
  selector: 'app-license-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Screen Reader Announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="license-status-announcements">
      {{ getStatusMessage() }}
    </div>

    <div class="max-w-md mx-auto">
      @if (uploadError()) {
        <div
          class="mb-4 rounded-xl border border-error-border bg-error-bg/60 px-4 py-3 text-sm text-error-strong animate-shake"
          role="alert"
          aria-live="polite"
        >
          {{ uploadError() }}
        </div>
      }

      <!-- Country Selector (Only shown in front step) -->
      @if (!hideCountrySelector() && step() === 'front') {
        <div class="flex items-center justify-center mb-6">
          <div class="relative group">
            <select
              [ngModel]="selectedCountry()"
              (ngModelChange)="selectCountry($event)"
              class="appearance-none bg-surface-raised pl-4 pr-10 py-2 rounded-full text-sm font-semibold text-text-primary shadow-sm border border-border-default focus:ring-2 focus:ring-cta-default focus:outline-none cursor-pointer hover:border-cta-default transition-all"
              aria-label="Seleccionar país"
            >
              @for (country of countries; track country.code) {
                <option [value]="country.code">{{ country.flag }} {{ country.name }}</option>
              }
            </select>
            <div
              class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      }

      <!-- STEP Content -->
      <div
        class="bg-surface-base rounded-3xl overflow-hidden min-h-[400px] flex flex-col relative transition-all duration-500"
      >
        <!-- STEP: FRONT -->
        @if (step() === 'front') {
          <div
            class="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in"
          >
            <div
              class="relative w-64 h-40 mb-8 rounded-2xl bg-surface-secondary border-2 border-dashed border-border-default flex items-center justify-center overflow-hidden group hover:border-cta-default transition-colors"
            >
              <!-- Illustration -->
              @if (frontPreview()) {
                <img
                  [src]="frontPreview()"
                  class="w-full h-full object-cover"
                  alt="Licencia frente preview"
                />
                @if (uploadingFront()) {
                  <div
                    class="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"
                  >
                    <div
                      class="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                  </div>
                }
              } @else {
                <div
                  class="text-cta-default opacity-80 group-hover:scale-110 transition-transform duration-300"
                >
                  <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke-width="1.5" />
                    <circle cx="8.5" cy="10.5" r="2.5" stroke-width="1.5" />
                    <line x1="13" y1="9" x2="17" y2="9" stroke-width="1.5" stroke-linecap="round" />
                    <line
                      x1="13"
                      y1="13"
                      x2="17"
                      y2="13"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <line
                      x1="6"
                      y1="16"
                      x2="18"
                      y2="16"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
                <div
                  class="absolute bottom-3 text-[10px] text-text-muted font-medium uppercase tracking-wider"
                >
                  Frente
                </div>
              }
            </div>

            <h3 class="text-xl font-bold text-text-primary mb-2">Escanea el Frente</h3>
            <p class="text-text-secondary text-sm mb-8 max-w-xs">
              Asegúrate que los datos sean legibles y no haya reflejos fuertes.
            </p>

            <input
              #frontInput
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              (change)="onFileSelected($event, 'license_front')"
            />
            <button
              (click)="frontInput.click()"
              class="w-full max-w-xs py-4 bg-cta-default hover:bg-cta-hover text-white font-bold rounded-2xl shadow-lg shadow-cta-default/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Tomar Foto
            </button>
          </div>
        }

        <!-- STEP: BACK -->
        @else if (step() === 'back') {
          <div
            class="flex-1 flex flex-col items-center justify-center p-6 text-center animate-slide-in-right"
          >
            <!-- Status Header -->
            <div class="absolute top-4 left-0 right-0 flex justify-center">
              <div
                class="bg-success-100 text-success-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
                Frente completado
              </div>
            </div>

            <div
              class="relative w-64 h-40 mb-8 rounded-2xl bg-surface-secondary border-2 border-dashed border-border-default flex items-center justify-center overflow-hidden group hover:border-cta-default transition-colors mt-8"
            >
              <!-- Illustration -->
              @if (backPreview()) {
                <img
                  [src]="backPreview()"
                  class="w-full h-full object-cover"
                  alt="Licencia dorso preview"
                />
                @if (uploadingBack()) {
                  <div
                    class="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"
                  >
                    <div
                      class="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                  </div>
                }
              } @else {
                <div
                  class="text-cta-default opacity-80 group-hover:scale-110 transition-transform duration-300"
                >
                  <!-- Barcode/QR icon -->
                  <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke-width="1.5" />
                    <path d="M7 8h10M7 12h10M7 16h6" stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                </div>
                <div
                  class="absolute bottom-3 text-[10px] text-text-muted font-medium uppercase tracking-wider"
                >
                  Dorso
                </div>
              }
            </div>

            <h3 class="text-xl font-bold text-text-primary mb-2">Ahora el Dorso</h3>
            <p class="text-text-secondary text-sm mb-8 max-w-xs">
              Gira tu licencia y fotografía el código de barras o QR.
            </p>

            <input
              #backInput
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden"
              (change)="onFileSelected($event, 'license_back')"
            />
            <button
              (click)="backInput.click()"
              class="w-full max-w-xs py-4 bg-cta-default hover:bg-cta-hover text-white font-bold rounded-2xl shadow-lg shadow-cta-default/20 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Escanear Dorso
            </button>
          </div>
        }

        <!-- STEP: COMPLETE (Summary) -->
        @else if (step() === 'complete') {
          <div
            class="flex-1 flex flex-col items-center justify-center p-6 text-center animate-scale-up"
          >
            <div
              class="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center text-success-600 mb-6 shadow-sm"
            >
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h3 class="text-2xl font-bold text-text-primary mb-2">¡Perfecto!</h3>
            <p class="text-text-secondary mb-6">Hemos verificado tu licencia exitosamente.</p>

            <!-- Extracted Data Card -->
            <div
              class="w-full bg-surface-raised rounded-2xl p-4 border border-border-default mb-6 text-left"
            >
              <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-bold text-text-muted uppercase">Datos Verificados</span>
                <span
                  class="bg-success-100 text-success-700 text-[10px] font-bold px-2 py-0.5 rounded"
                  >IA APPROVAL</span
                >
              </div>
              @for (field of extractedFields(); track field.key) {
                <div class="flex justify-between py-1 border-b border-border-subtle last:border-0">
                  <span class="text-sm text-text-secondary">{{ field.label }}</span>
                  <span class="text-sm font-semibold text-text-primary">{{ field.value }}</span>
                </div>
              }
            </div>

            <p class="text-xs text-text-muted animate-pulse">Avanzando automáticamente...</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes scaleUp {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes shake {
        0%,
        100% {
          transform: translateX(0);
        }
        25% {
          transform: translateX(-4px);
        }
        75% {
          transform: translateX(4px);
        }
      }

      .animate-fade-in {
        animation: fadeIn 0.4s ease-out forwards;
      }
      .animate-slide-in-right {
        animation: slideInRight 0.4s ease-out forwards;
      }
      .animate-scale-up {
        animation: scaleUp 0.4s ease-out forwards;
      }
      .animate-shake {
        animation: shake 0.3s ease-in-out;
      }
    `,
  ],
})
export class LicenseUploaderComponent {
  private verificationService = inject(VerificationService);
  private toastService = inject(ToastService);

  readonly countries = COUNTRIES;

  // Input para ocultar el selector de país si ya se seleccionó en DNI
  hideCountrySelector = input(false);
  initialCountry = input<string>('AR');

  // Output para auto-avance
  verificationCompleted = output<void>();

  // Country selection
  selectedCountry = signal<string>('AR');

  // Step management
  step = signal<'front' | 'back' | 'complete'>('front');

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
  uploadError = signal<string | null>(null);

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
        verified,
      });
    }

    // License number
    const licenseNumber = front?.licenseNumber || back?.licenseNumber;
    if (licenseNumber) {
      fields.push({
        key: 'licenseNumber',
        label: 'Nro. Licencia',
        value: licenseNumber,
        verified,
      });
    }

    // Category
    const category = front?.category || back?.category;
    if (category) {
      fields.push({
        key: 'category',
        label: 'Categoría',
        value: category,
        verified,
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
        isExpired: expired,
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

  selectCountry(country: string): void {
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
    this.uploadError.set(null);
  }

  getSelectedCountryFlag(): string {
    return this.countries.find((c) => c.code === this.selectedCountry())?.flag || '🌍';
  }

  // Paste Support
  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Validate file size (max 2MB)
          if (file.size > MAX_UPLOAD_BYTES) {
            this.setUploadError('Imagen demasiado grande. Máximo 2MB.');
            event.preventDefault();
            break;
          }

          if (!this.validateSelectedFile(file)) {
            event.preventDefault();
            break;
          }

          // Smart assignment
          let targetType: 'license_front' | 'license_back' | null = null;
          if (!this.frontUploaded() && !this.frontPreview()) {
            targetType = 'license_front';
          } else if (!this.backUploaded() && !this.backPreview()) {
            targetType = 'license_back';
          }
          if (targetType) {
            this.processFile(file, targetType);
            // Announce paste action
            const side = targetType === 'license_front' ? 'frente' : 'dorso';
            this.announcePaste(`Imagen pegada para el ${side} de la licencia`);
          }
          event.preventDefault();
          break;
        }
      }
    }
  }

  private announcePaste(message: string): void {
    // Update the paste announcements div
    const announcementDiv = document.getElementById('license-paste-announcements');
    if (announcementDiv) {
      announcementDiv.textContent = message;
      // Clear after a short delay
      setTimeout(() => {
        announcementDiv.textContent = '';
      }, 1000);
    }
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
    if (file && file.type.startsWith('image/') && this.validateSelectedFile(file)) {
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

    if (!this.validateSelectedFile(file)) {
      if (input) input.value = '';
      return;
    }

    await this.processFile(file, type);

    // Clear input for re-selection of same file
    if (input) input.value = '';
  }

  private async processFile(file: File, type: 'license_front' | 'license_back'): Promise<void> {
    const docType = type === 'license_front' ? 'license_front' : 'license_back';
    const isFront = type === 'license_front';

    this.uploadError.set(null);

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

    // Notify user
    this.toastService.info('Procesando', 'Analizando imagen con IA...');

    // UX OPTIMISTA
    const progressInterval = setInterval(() => {
      const current = isFront ? this.frontProgress() : this.backProgress();
      if (current < 80) {
        const increment = Math.random() * 25 + 10;
        const newProgress = Math.min(current + increment, 85);
        if (isFront) this.frontProgress.set(Math.round(newProgress));
        else this.backProgress.set(Math.round(newProgress));
      }
    }, 150);

    try {
      const result = await this.verificationService.uploadAndVerifyDocument(
        file,
        docType,
        this.selectedCountry(),
      );

      // Complete progress
      clearInterval(progressInterval);
      if (isFront) this.frontProgress.set(100);
      else this.backProgress.set(100);

      this.toastService.success('Éxito', 'Imagen procesada correctamente');

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

          // Check for full completion
          const frontConf = result.ocrResult.ocr_confidence || 0;
          const backConf = this.backOcrResult()?.confidence || 0;

          if (
            (result.ocrResult.success || frontConf >= 70) &&
            (this.backOcrResult()?.success || backConf >= 70)
          ) {
            setTimeout(() => this.verificationCompleted.emit(), 1000);
          }
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

          // Check for full completion (Front + Back verified)
          const frontConf = this.frontOcrResult()?.confidence || 0;
          const backConf = result.ocrResult.ocr_confidence || 0;

          if (
            (this.frontOcrResult()?.success || frontConf >= 70) &&
            (result.ocrResult.success || backConf >= 70)
          ) {
            this.step.set('complete');
            // Delay slightly for UX
            setTimeout(() => this.verificationCompleted.emit(), 1500);
          }
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error uploading license:', error);
      this.setUploadError('No pudimos subir la foto. Intenta nuevamente con mejor luz.');
      this.toastService.error('Error', 'No pudimos procesar la imagen.');

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

  private validateSelectedFile(file: File): boolean {
    const validation = validateFile(file, {
      maxSizeBytes: MAX_UPLOAD_BYTES,
      allowedMimeTypes: DEFAULT_IMAGE_MIME_TYPES,
    });

    if (!validation.valid) {
      this.setUploadError(validation.error || 'Archivo no válido');
      return false;
    }

    this.uploadError.set(null);
    return true;
  }

  private setUploadError(message: string): void {
    this.uploadError.set(message);
    this.announcePaste(message);
  }
}
