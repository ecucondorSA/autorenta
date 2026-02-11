import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type { UserDocument } from '@core/models';
import { VerificationService } from '@core/services/verification/verification.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
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
  state: 'verified' | 'warning' | 'expired';
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Component({
  selector: 'app-license-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="license-status-announcements">
      {{ getStatusMessage() }}
    </div>
    <div aria-live="assertive" aria-atomic="true" class="sr-only" id="license-paste-announcements"></div>

    <div class="space-y-5">
      <section class="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
        <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-slate-900">Licencia de conducir</h4>
            <p class="text-xs text-slate-500">
              Sube frente y dorso completos, con fecha de vencimiento legible.
            </p>
          </div>

          @if (!hideCountrySelector()) {
            <div class="relative">
              <select
                [ngModel]="selectedCountry()"
                (ngModelChange)="selectCountry($event)"
                aria-label="Seleccionar país de emisión"
                class="appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                @for (country of countries; track country.code) {
                  <option [value]="country.code">{{ country.name }}</option>
                }
              </select>
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">
                {{ getSelectedCountryFlag() }}
              </span>
              <svg
                class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          }
        </header>

        <div class="space-y-3">
          <article
            class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
            [class.ring-2]="isDraggingFront()"
            [class.ring-emerald-400]="isDraggingFront()"
            (dragover)="onDragOver($event, 'front')"
            (dragleave)="onDragLeave('front')"
            (drop)="onDrop($event, 'license_front')"
          >
            <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                @if (frontPreview()) {
                  <img [src]="frontPreview()" alt="Frente de la licencia" class="h-full w-full object-cover" />
                  <div class="absolute inset-0 bg-black/10"></div>
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-slate-500">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.8"
                        d="M4 7h16M4 17h16M7 4v16M17 4v16"
                      />
                    </svg>
                  </div>
                }
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-slate-900">Frente de la licencia</p>
                <p class="text-xs text-slate-500">
                  @if (frontUploaded()) {
                    Cargado correctamente
                  } @else {
                    Debe verse el número, nombre y categoría.
                  }
                </p>
              </div>

              <div class="shrink-0">
                <input
                  #frontInput
                  type="file"
                  accept="image/*"
                  capture="environment"
                  class="hidden"
                  (change)="onFileSelected($event, 'license_front')"
                />
                @if (uploadingFront()) {
                  <div class="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                } @else {
                  <button
                    (click)="frontInput.click()"
                    class="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
                  >
                    {{ frontPreview() ? 'Cambiar' : 'Subir' }}
                  </button>
                }
              </div>
            </div>

            @if (uploadingFront()) {
              <div class="h-1 bg-emerald-500 transition-all" [style.width.%]="frontProgress()"></div>
            }
          </article>

          <article
            class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
            [class.ring-2]="isDraggingBack()"
            [class.ring-emerald-400]="isDraggingBack()"
            (dragover)="onDragOver($event, 'back')"
            (dragleave)="onDragLeave('back')"
            (drop)="onDrop($event, 'license_back')"
          >
            <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                @if (backPreview()) {
                  <img [src]="backPreview()" alt="Dorso de la licencia" class="h-full w-full object-cover" />
                  <div class="absolute inset-0 bg-black/10"></div>
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-slate-500">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.8"
                        d="M4 12h16M8 8l-4 4 4 4"
                      />
                    </svg>
                  </div>
                }
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-slate-900">Dorso de la licencia</p>
                <p class="text-xs text-slate-500">
                  @if (backUploaded()) {
                    Cargado correctamente
                  } @else {
                    Incluye el código de barras/QR completo y sin recortes.
                  }
                </p>
              </div>

              <div class="shrink-0">
                <input
                  #backInput
                  type="file"
                  accept="image/*"
                  capture="environment"
                  class="hidden"
                  (change)="onFileSelected($event, 'license_back')"
                />
                @if (uploadingBack()) {
                  <div class="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                } @else {
                  <button
                    (click)="backInput.click()"
                    class="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
                  >
                    {{ backPreview() ? 'Cambiar' : 'Subir' }}
                  </button>
                }
              </div>
            </div>

            @if (uploadingBack()) {
              <div class="h-1 bg-emerald-500 transition-all" [style.width.%]="backProgress()"></div>
            }
          </article>
        </div>
      </section>

      @if (uploadError()) {
        <div class="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {{ uploadError() }}
        </div>
      }

      @if (uploadWarning()) {
        <div class="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {{ uploadWarning() }}
        </div>
      }

      @if (frontOcrResult() || backOcrResult()) {
        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Extracción de datos</p>
            <span class="rounded-full px-2 py-1 text-xs font-semibold" [class]="statusToneClass()">
              {{ isAutoVerified() ? 'Auto validada' : 'Revisión asistida' }}
            </span>
          </header>

          <div class="grid gap-4 px-4 py-4 sm:grid-cols-2">
            @for (field of extractedFields(); track field.key) {
              <article>
                <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ field.label }}</p>
                <p class="mt-1 text-sm font-semibold" [class]="fieldTextClass(field.state)">
                  {{ field.value }}
                </p>
              </article>
            }
          </div>

          @if (hasWarnings()) {
            <div class="border-t border-amber-200 bg-amber-50 px-4 py-3">
              @for (warning of getAllWarnings(); track $index) {
                <p class="text-xs text-amber-800">{{ warning }}</p>
              }
            </div>
          }
        </section>
      }

      @if (allSidesUploaded() && !isAutoVerified()) {
        <div class="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Licencia recibida. Si la IA no alcanza confianza alta, pasará a revisión manual sin perder avance.
        </div>
      }

      @if (allSidesUploaded() && isAutoVerified() && !isExpired()) {
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Licencia validada automáticamente. Estamos actualizando tu nivel de verificación.
        </div>
      }
    </div>
  `,
})
export class LicenseUploaderComponent {
  private readonly verificationService = inject(VerificationService);
  private readonly analyticsService = inject(AnalyticsService);

  readonly countries = COUNTRIES;

  readonly hideCountrySelector = input(false);
  readonly initialCountry = input<string>('AR');
  readonly verificationCompleted = output<void>();

  private readonly manualCountrySelection = signal(false);

  selectedCountry = signal<string>('AR');

  uploadingFront = signal(false);
  uploadingBack = signal(false);

  frontPreview = signal<string | null>(null);
  backPreview = signal<string | null>(null);

  frontUploaded = signal(false);
  backUploaded = signal(false);

  frontProgress = signal(0);
  backProgress = signal(0);

  isDraggingFront = signal(false);
  isDraggingBack = signal(false);

  frontOcrResult = signal<LicenseOcrResultDisplay | null>(null);
  backOcrResult = signal<LicenseOcrResultDisplay | null>(null);

  uploadError = signal<string | null>(null);
  uploadWarning = signal<string | null>(null);

  readonly allSidesUploaded = computed(() => this.frontUploaded() && this.backUploaded());

  readonly extractedFields = computed<ExtractedField[]>(() => {
    const fields: ExtractedField[] = [];
    const front = this.frontOcrResult();
    const back = this.backOcrResult();

    const holderName = front?.holderName || back?.holderName;
    if (holderName) {
      fields.push({
        key: 'holderName',
        label: 'Titular',
        value: holderName,
        state: this.isAutoVerified() ? 'verified' : 'warning',
      });
    }

    const licenseNumber = front?.licenseNumber || back?.licenseNumber;
    if (licenseNumber) {
      fields.push({
        key: 'licenseNumber',
        label: 'Nro. licencia',
        value: licenseNumber,
        state: this.isAutoVerified() ? 'verified' : 'warning',
      });
    }

    const category = front?.category || back?.category;
    if (category) {
      fields.push({
        key: 'category',
        label: 'Categoría',
        value: category,
        state: this.isAutoVerified() ? 'verified' : 'warning',
      });
    }

    const expiryDate = front?.expiryDate || back?.expiryDate;
    if (expiryDate) {
      fields.push({
        key: 'expiryDate',
        label: 'Vencimiento',
        value: expiryDate,
        state: this.isExpired() ? 'expired' : this.isAutoVerified() ? 'verified' : 'warning',
      });
    }

    return fields;
  });

  constructor() {
    effect(() => {
      const initial = this.initialCountry();
      if (!this.manualCountrySelection() && initial) {
        this.selectedCountry.set(initial);
      }
    });

    effect(() => {
      const docs = this.verificationService.documents();
      const hasFront = this.hasUploadedDocument(docs, 'license_front');
      const hasBack = this.hasUploadedDocument(docs, 'license_back');

      if (!this.uploadingFront() && !this.frontPreview() && this.frontUploaded() !== hasFront) {
        this.frontUploaded.set(hasFront);
      }

      if (!this.uploadingBack() && !this.backPreview() && this.backUploaded() !== hasBack) {
        this.backUploaded.set(hasBack);
      }
    });
  }

  selectCountry(country: string): void {
    this.manualCountrySelection.set(true);
    this.selectedCountry.set(country);

    this.frontPreview.set(null);
    this.backPreview.set(null);
    this.frontUploaded.set(false);
    this.backUploaded.set(false);
    this.frontProgress.set(0);
    this.backProgress.set(0);
    this.frontOcrResult.set(null);
    this.backOcrResult.set(null);
    this.uploadError.set(null);
    this.uploadWarning.set(null);
    this.analyticsService.trackEvent('kyc_license_country_selected', {
      source: 'license_uploader',
      country,
    });
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (!items[i].type.includes('image')) continue;

      const file = items[i].getAsFile();
      if (!file) continue;

      if (!this.validateSelectedFile(file)) {
        event.preventDefault();
        break;
      }

      let targetType: 'license_front' | 'license_back' | null = null;
      if (!this.frontUploaded() && !this.frontPreview()) {
        targetType = 'license_front';
      } else if (!this.backUploaded() && !this.backPreview()) {
        targetType = 'license_back';
      }

      if (targetType) {
        void this.processFile(file, targetType);
        const side = targetType === 'license_front' ? 'frente' : 'dorso';
        this.announcePaste(`Imagen pegada para el ${side} de la licencia`);
      }

      event.preventDefault();
      break;
    }
  }

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
      void this.processFile(file, type);
    }
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
    if (input) input.value = '';
  }

  isAutoVerified(): boolean {
    const front = this.frontOcrResult();
    if (!front) return false;
    return front.success === true || (front.confidence ?? 0) >= 70;
  }

  isExpired(): boolean {
    const expiryStr = this.frontOcrResult()?.expiryDate || this.backOcrResult()?.expiryDate;
    if (!expiryStr) return false;

    const normalized = expiryStr.trim();
    const dmy = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

    let expiryDate: Date;

    if (dmy) {
      expiryDate = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    } else {
      expiryDate = new Date(normalized);
    }

    if (Number.isNaN(expiryDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiryDate < today;
  }

  hasWarnings(): boolean {
    return this.getAllWarnings().length > 0;
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

  getStatusMessage(): string {
    if (this.isExpired()) {
      return 'Licencia vencida. Debes renovarla para continuar.';
    }

    if (this.allSidesUploaded() && this.isAutoVerified()) {
      return 'Licencia cargada y verificada automáticamente.';
    }

    if (this.allSidesUploaded()) {
      return 'Licencia cargada. Puede requerir revisión manual.';
    }

    if (this.frontUploaded() && !this.backUploaded()) {
      return 'Frente cargado. Falta subir el dorso de la licencia.';
    }

    if (!this.frontUploaded() && this.backUploaded()) {
      return 'Dorso cargado. Falta subir el frente de la licencia.';
    }

    return 'Esperando imágenes de la licencia.';
  }

  getSelectedCountryFlag(): string {
    return this.countries.find((c) => c.code === this.selectedCountry())?.flag || '🌍';
  }

  statusToneClass(): string {
    if (this.isExpired()) {
      return 'bg-rose-100 text-rose-700';
    }

    return this.isAutoVerified()
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';
  }

  fieldTextClass(state: ExtractedField['state']): string {
    if (state === 'expired') return 'text-rose-700';
    if (state === 'verified') return 'text-slate-900';
    return 'text-amber-700';
  }

  private async processFile(file: File, type: 'license_front' | 'license_back'): Promise<void> {
    const docType = type === 'license_front' ? 'license_front' : 'license_back';
    const isFront = type === 'license_front';
    this.analyticsService.trackEvent('kyc_document_upload_started', {
      source: 'license_uploader',
      doc_type: docType,
      side: isFront ? 'front' : 'back',
      country: this.selectedCountry(),
      file_size_bytes: file.size,
    });

    this.uploadError.set(null);
    this.uploadWarning.set(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') return;

      if (isFront) {
        this.frontPreview.set(result);
      } else {
        this.backPreview.set(result);
      }
    };
    reader.readAsDataURL(file);

    if (isFront) {
      this.uploadingFront.set(true);
      this.frontProgress.set(0);
    } else {
      this.uploadingBack.set(true);
      this.backProgress.set(0);
    }

    const progressInterval = setInterval(() => {
      const current = isFront ? this.frontProgress() : this.backProgress();
      if (current < 80) {
        const increment = Math.random() * 25 + 10;
        const next = Math.min(current + increment, 85);
        if (isFront) {
          this.frontProgress.set(Math.round(next));
        } else {
          this.backProgress.set(Math.round(next));
        }
      }
    }, 150);

    try {
      const result = await this.verificationService.uploadAndVerifyDocument(
        file,
        docType,
        this.selectedCountry(),
      );

      clearInterval(progressInterval);
      if (isFront) {
        this.frontProgress.set(100);
      } else {
        this.backProgress.set(100);
      }

      if (result.ocrWarning) {
        this.uploadWarning.set(result.ocrWarning);
        this.analyticsService.trackEvent('kyc_document_ocr_warning', {
          source: 'license_uploader',
          doc_type: docType,
          side: isFront ? 'front' : 'back',
          country: this.selectedCountry(),
          warning_message: result.ocrWarning,
        });
      } else {
        this.uploadWarning.set(null);
      }

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
            errors: result.ocrResult.errors || [],
            warnings: result.ocrResult.warnings || [],
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
            errors: result.ocrResult.errors || [],
            warnings: result.ocrResult.warnings || [],
          });
        }
      }

      this.analyticsService.trackEvent('kyc_document_upload_completed', {
        source: 'license_uploader',
        doc_type: docType,
        side: isFront ? 'front' : 'back',
        country: this.selectedCountry(),
        ocr_success: result.ocrResult?.success ?? null,
        ocr_confidence: result.ocrResult?.ocr_confidence ?? null,
      });
      if (this.frontUploaded() && this.backUploaded()) {
        this.verificationCompleted.emit();
      }
    } catch (error) {
      clearInterval(progressInterval);

      const message =
        error instanceof Error
          ? error.message
          : 'No pudimos subir la imagen. Intenta nuevamente con mejor luz.';

      this.uploadError.set(message);
      this.analyticsService.trackEvent('kyc_document_upload_failed', {
        source: 'license_uploader',
        doc_type: docType,
        side: isFront ? 'front' : 'back',
        country: this.selectedCountry(),
        error_message: message,
      });

      if (isFront) {
        this.frontPreview.set(null);
        this.frontProgress.set(0);
      } else {
        this.backPreview.set(null);
        this.backProgress.set(0);
      }
    } finally {
      if (isFront) {
        this.uploadingFront.set(false);
      } else {
        this.uploadingBack.set(false);
      }
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
    this.uploadWarning.set(null);
    return true;
  }

  private setUploadError(message: string): void {
    this.uploadWarning.set(null);
    this.uploadError.set(message);
    this.announcePaste(message);
  }

  private hasUploadedDocument(
    documents: UserDocument[],
    kind: 'license_front' | 'license_back',
  ): boolean {
    return documents.some(
      (document) =>
        document.kind === kind && !!document.storage_path && String(document.status) !== 'rejected',
    );
  }

  private announcePaste(message: string): void {
    const announcementDiv = document.getElementById('license-paste-announcements');
    if (!announcementDiv) return;

    announcementDiv.textContent = message;
    setTimeout(() => {
      announcementDiv.textContent = '';
    }, 1000);
  }
}
