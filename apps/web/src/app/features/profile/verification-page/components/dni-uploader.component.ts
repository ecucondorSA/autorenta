import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

import { VerificationService } from '@core/services/verification/verification.service';
import { FormsModule } from '@angular/forms';

const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', docName: 'DNI' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', docName: 'Cédula' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', docName: 'Cédula' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', docName: 'RUT' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', docName: 'CPF' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', docName: 'Cédula' },
  { code: 'MX', name: 'México', flag: '🇲🇽', docName: 'INE/IFE' },
  { code: 'US', name: 'USA', flag: '🇺🇸', docName: 'ID / Passport' },
  { code: 'OTHER', name: 'Otro / Other', flag: '🌍', docName: 'Documento ID' },
];

interface OcrResultDisplay {
  success: boolean;
  confidence: number;
  extractedName?: string;
  extractedNumber?: string;
  errors: string[];
  warnings: string[];
  profileUpdated?: boolean;
}

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  verified: boolean;
}

@Component({
  selector: 'app-dni-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Country Selector (Compact) -->
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
      </div>

      <!-- Compact Upload Rows -->
      <div class="space-y-3">
        <!-- FRONT ROW -->
        <div 
          class="relative group rounded-2xl border border-border-default bg-surface-base hover:border-cta-default/30 hover:shadow-sm transition-all duration-300 overflow-hidden"
          [class.ring-2]="isDraggingFront()"
          [class.ring-cta-default]="isDraggingFront()"
          (dragover)="onDragOver($event, 'front')"
          (dragleave)="onDragLeave('front')"
          (drop)="onDrop($event, 'dni_front')"
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
                <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
              }
            </div>

            <!-- Text Content -->
            <div class="flex-grow min-w-0">
              <h4 class="font-semibold text-text-primary text-sm sm:text-base">Frente del documento</h4>
              <p class="text-xs text-text-secondary truncate">
                @if (frontUploaded()) {
                  Foto cargada correctamente
                } @else {
                  Foto clara y legible
                }
              </p>
            </div>

            <!-- Actions -->
            <div class="flex-shrink-0">
              <input #frontInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event, 'dni_front')" />
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
          
          <!-- Progress Bar (Absolute bottom) -->
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
          (drop)="onDrop($event, 'dni_back')"
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
              <h4 class="font-semibold text-text-primary text-sm sm:text-base">Dorso del documento</h4>
              <p class="text-xs text-text-secondary truncate">
                @if (backUploaded()) {
                  Foto cargada correctamente
                } @else {
                  Código de barras visible
                }
              </p>
            </div>

            <!-- Actions -->
            <div class="flex-shrink-0">
              <input #backInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event, 'dni_back')" />
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
          <!-- Header -->
          <div class="px-4 py-3 border-b border-border-default/50 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Datos Extraídos</span>
            </div>
            @if (isAutoVerified()) {
              <span class="text-xs font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded">AUTO VERIFICADO</span>
            }
          </div>

          <!-- Data Grid -->
          <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (field of extractedFields(); track field.key) {
              <div>
                <span class="text-[10px] text-text-muted uppercase tracking-wider block mb-0.5">{{ field.label }}</span>
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-text-primary text-sm">{{ field.value }}</span>
                  @if (field.verified) {
                    <svg class="w-3 h-3 text-success-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  }
                </div>
              </div>
            }
          </div>
          
          <!-- Warning Footer -->
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
      }
    </div>
  `,
})
export class DniUploaderComponent {
  private verificationService = inject(VerificationService);

  readonly countries = COUNTRIES;

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
  frontOcrResult = signal<OcrResultDisplay | null>(null);
  backOcrResult = signal<OcrResultDisplay | null>(null);

  // Computed: Extracted fields for display
  extractedFields = computed<ExtractedField[]>(() => {
    const fields: ExtractedField[] = [];
    const front = this.frontOcrResult();
    const back = this.backOcrResult();
    const isVerified = this.isAutoVerified();

    if (front?.extractedName) {
      fields.push({
        key: 'name',
        label: 'Nombre',
        value: front.extractedName,
        verified: isVerified,
      });
    }

    const docNumber = front?.extractedNumber || back?.extractedNumber;
    if (docNumber) {
      fields.push({
        key: 'number',
        label: this.getDocumentName(),
        value: docNumber,
        verified: isVerified,
      });
    }

    return fields;
  });

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

  onDrop(event: DragEvent, type: 'dni_front' | 'dni_back'): void {
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

  /**
   * Determina si el documento está verificado automáticamente
   */
  isAutoVerified(): boolean {
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const profileUpdated = this.frontOcrResult()?.profileUpdated;

    return profileUpdated === true || frontConf >= 70 || frontSuccess === true;
  }

  isProfileLocked(): boolean {
    return this.frontOcrResult()?.profileUpdated === true;
  }

  getConfidence(): number {
    return this.frontOcrResult()?.confidence || this.backOcrResult()?.confidence || 0;
  }

  getConfidenceIconClass(): string {
    if (this.isAutoVerified()) {
      return 'bg-success-100 text-success-600';
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
    if (this.isAutoVerified()) {
      return 'bg-success-50 border border-success-200 text-success-700';
    }
    if (this.frontOcrResult() || this.backOcrResult()) {
      return 'bg-warning-50 border border-warning-200 text-warning-700';
    }
    return 'bg-info-50 border border-info-200 text-info-700';
  }

  getStatusMessage(): string {
    const docName = this.getDocumentName();
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const backConf = this.backOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const backSuccess = this.backOcrResult()?.success;
    const profileLocked = this.isProfileLocked();

    if (profileLocked) {
      if (!this.backOcrResult()) {
        return `Identidad verificada. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `Identidad verificada y protegida.`;
      }
      return `Identidad verificada. Dorso requiere mejor foto.`;
    }

    if (frontSuccess === true || frontConf >= 70) {
      if (!this.backOcrResult()) {
        return `${docName} verificado. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `${docName} verificado correctamente.`;
      }
      return `${docName} frente verificado. Mejora la foto del dorso.`;
    }

    if (this.frontOcrResult() && frontConf > 0 && frontConf < 70) {
      return `Baja confianza (${frontConf}%). Intenta con mejor foto.`;
    }

    if (this.backOcrResult() && !this.frontOcrResult()) {
      return `Dorso procesado. Falta subir el frente.`;
    }

    return `Procesando verificación...`;
  }

  getDocumentName(): string {
    const c = this.countries.find(c => c.code === this.selectedCountry());
    return c ? `${c.docName} ${c.name}` : 'Documento';
  }

  getSelectedCountryFlag(): string {
    return this.countries.find(c => c.code === this.selectedCountry())?.flag || '🌍';
  }

  async onFileSelected(event: Event, type: 'dni_front' | 'dni_back'): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    await this.processFile(file, type);

    // Clear input for re-selection of same file
    if (input) input.value = '';
  }

  private async processFile(file: File, type: 'dni_front' | 'dni_back'): Promise<void> {
    const docType = type === 'dni_front' ? 'gov_id_front' : 'gov_id_back';
    const isFront = type === 'dni_front';

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
          const profileUpdated =
            result.ocrResult.warnings?.some((w: string) =>
              w.includes('Identidad verificada automaticamente'),
            ) || false;

          this.frontOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            extractedName: result.ocrResult.extracted_data?.['fullName'] as string,
            extractedNumber: result.ocrResult.extracted_data?.['documentNumber'] as string,
            errors: result.ocrResult.errors,
            warnings:
              result.ocrResult.warnings?.filter(
                (w: string) => !w.includes('Identidad verificada automaticamente'),
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
      clearInterval(progressInterval);
      console.error('Error uploading document:', error);

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
