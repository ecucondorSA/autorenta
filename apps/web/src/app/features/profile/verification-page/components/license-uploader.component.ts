import { Component, inject, signal, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VerificationService } from '@core/services/verification/verification.service';

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

@Component({
  selector: 'app-license-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Country Selector (Compact) -->
      @if (!hideCountrySelector()) {
        <div class="flex items-center justify-between p-1">
          <label class="text-sm font-medium text-text-secondary">País de emisión</label>
          <div class="relative group">
            <select
              [ngModel]="selectedCountry()"
              (ngModelChange)="selectCountry($event)"
              class="appearance-none bg-transparent pl-8 pr-8 py-1.5 text-right font-semibold text-text-primary focus:ring-0 cursor-pointer hover:text-cta-default transition-colors border-none focus:outline-none"
            >
              @for (country of countries; track country.code) {
                <option [value]="country.code">
                  {{ country.name }}
                </option>
              }
            </select>
            <div class="absolute left-0 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
              {{ getSelectedCountryFlag() }}
            </div>
            <div class="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-cta-default transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
          <p class="text-[10px] text-text-muted mt-1 px-1">Aceptamos licencias digitales y físicas vigentes.</p>
        </div>
      }

      <!-- Compact Upload Rows -->
      <div class="space-y-3">
        <!-- FRONT ROW -->
        <div 
          class="relative group rounded-2xl border border-border-default bg-surface-base hover:border-cta-default/30 hover:shadow-sm transition-all duration-300 overflow-hidden"
          [class.ring-2]="isDraggingFront()"
          [class.ring-cta-default]="isDraggingFront()"
          (dragover)="onDragOver($event, 'front')"
          (dragleave)="onDragLeave('front')"
          (drop)="onDrop($event, 'license_front')"
        >
          <div class="flex items-center p-3 sm:p-4 gap-4">
            <!-- Icon / Preview Thumbnail -->
            <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-secondary flex items-center justify-center overflow-hidden border border-border-subtle relative">
              @if (frontPreview()) {
                <img [src]="frontPreview()" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/10"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                   <div class="w-5 h-5 bg-success-500 rounded-full text-white flex items-center justify-center shadow-sm">
                     <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                   </div>
                </div>
              } @else {
                <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              }
            </div>

            <!-- Text Content -->
            <div class="flex-grow min-w-0">
              <h4 class="font-semibold text-text-primary text-sm sm:text-base">Frente de la licencia</h4>
              <p class="text-xs text-text-secondary truncate">
                @if (frontUploaded()) {
                  Foto cargada correctamente
                } @else {
                  Datos legibles, sin reflejos
                }
              </p>
            </div>

            <!-- Actions -->
            <div class="flex-shrink-0">
              <input #frontInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event, 'license_front')" />
              @if (uploadingFront()) {
                <div class="w-8 h-8 rounded-full border-2 border-cta-default border-t-transparent animate-spin"></div>
              } @else {
                <button 
                  (click)="frontInput.click()"
                  class="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  [class]="frontPreview() ? 'text-text-primary hover:bg-surface-hover' : 'bg-surface-secondary text-text-primary hover:bg-surface-hover'"
                >
                  {{ frontPreview() ? 'Cambiar' : 'Subir' }}
                </button>
              }
            </div>
          </div>
          
          <!-- Progress Bar -->
          @if (uploadingFront()) {
            <div class="absolute bottom-0 left-0 h-1 bg-cta-default transition-all duration-300" [style.width.%]="frontProgress()"></div>
          }
        </div>

        <!-- BACK ROW -->
        <div 
          class="relative group rounded-2xl border border-border-default bg-surface-base hover:border-cta-default/30 hover:shadow-sm transition-all duration-300 overflow-hidden"
          [class.ring-2]="isDraggingBack()"
          [class.ring-cta-default]="isDraggingBack()"
          (dragover)="onDragOver($event, 'back')"
          (dragleave)="onDragLeave('back')"
          (drop)="onDrop($event, 'license_back')"
        >
          <div class="flex items-center p-3 sm:p-4 gap-4">
            <!-- Icon / Preview -->
            <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-surface-secondary flex items-center justify-center overflow-hidden border border-border-subtle relative">
              @if (backPreview()) {
                <img [src]="backPreview()" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/10"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                   <div class="w-5 h-5 bg-success-500 rounded-full text-white flex items-center justify-center shadow-sm">
                     <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                   </div>
                </div>
              } @else {
                <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              }
            </div>

            <!-- Text Content -->
            <div class="flex-grow min-w-0">
              <h4 class="font-semibold text-text-primary text-sm sm:text-base">Dorso de la licencia</h4>
              <p class="text-xs text-text-secondary truncate">
                @if (backUploaded()) {
                  Foto cargada correctamente
                } @else {
                  Información visible
                }
              </p>
            </div>

            <!-- Actions -->
            <div class="flex-shrink-0">
              <input #backInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event, 'license_back')" />
              @if (uploadingBack()) {
                <div class="w-8 h-8 rounded-full border-2 border-cta-default border-t-transparent animate-spin"></div>
              } @else {
                <button 
                  (click)="backInput.click()"
                  class="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  [class]="backPreview() ? 'text-text-primary hover:bg-surface-hover' : 'bg-surface-secondary text-text-primary hover:bg-surface-hover'"
                >
                  {{ backPreview() ? 'Cambiar' : 'Subir' }}
                </button>
              }
            </div>
          </div>
          
          <!-- Progress Bar -->
          @if (uploadingBack()) {
            <div class="absolute bottom-0 left-0 h-1 bg-cta-default transition-all duration-300" [style.width.%]="backProgress()"></div>
          }
        </div>
      </div>

      <!-- OCR Results (Minimalist) -->
      @if (frontOcrResult() || backOcrResult()) {
        <div class="rounded-2xl bg-surface-secondary/30 border border-border-default overflow-hidden">
          <div class="px-4 py-3 border-b border-border-default/50 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Datos Extraídos</span>
            </div>
            @if (isVerified() && !isExpired()) {
              <span class="text-xs font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded">AUTO VERIFICADO</span>
            }
          </div>

          <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (field of extractedFields(); track field.key) {
              <div>
                <span class="text-[10px] text-text-muted uppercase tracking-wider block mb-0.5">{{ field.label }}</span>
                <p class="mt-1 font-semibold flex items-center gap-1.5"
                   [class]="field.isExpired ? 'text-error-600' : 'text-text-primary'">
                  {{ field.value }}
                  @if (field.isExpired) {
                    <span class="text-[10px] bg-error-100 text-error-700 px-1.5 py-0.5 rounded">VENCIDA</span>
                  } @else if (field.verified) {
                    <svg class="w-3 h-3 text-success-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  }
                </p>
              </div>
            }
          </div>

          @if (hasWarnings()) {
            <div class="px-4 py-2 bg-warning-50 border-t border-warning-100">
              @for (warning of getAllWarnings(); track $index) {
                <p class="text-xs text-warning-700 flex items-center gap-1">
                  <span>⚠️</span> {{ warning }}
                </p>
              }
            </div>
          }
        </div>

        <!-- Expiry Warning -->
        @if (isExpired()) {
          <div class="p-3 rounded-xl bg-error-50 border border-error-200 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-error-100 flex items-center justify-center flex-shrink-0 text-error-600">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            </div>
            <p class="text-sm font-medium text-error-800">Licencia vencida. No podrás reservar.</p>
          </div>
        }

        <!-- Status Message -->
        <div class="p-3 rounded-xl text-sm flex items-center gap-3" [class]="getStatusClass()">
          <div class="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0">
            @if (isVerified() && !isExpired()) {
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
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

  readonly countries = COUNTRIES;

  // Input para ocultar el selector de país si ya se seleccionó en DNI
  hideCountrySelector = input(false);
  initialCountry = input<string>('AR');

  // Country selection
  selectedCountry = signal<string>('AR');

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
  }

  getSelectedCountryFlag(): string {
    return this.countries.find(c => c.code === this.selectedCountry())?.flag || '🌍';
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
        this.selectedCountry(),
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
