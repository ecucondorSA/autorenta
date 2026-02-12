import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DEFAULT_IMAGE_MIME_TYPES, validateFile } from '@core/utils/file-validation.util';
import { VerificationService } from '@core/services/verification/verification.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import type { UserDocument } from '@core/models';

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

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Component({
  selector: 'app-dni-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="status-announcements">
      {{ getStatusMessage() }}
    </div>
    <div aria-live="assertive" aria-atomic="true" class="sr-only" id="paste-announcements"></div>

    <div class="space-y-5">
      <section class="rounded-3xl border border-black/10 bg-black/[0.03] p-4">
        <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-black">Documento de identidad</h4>
            <p class="text-xs text-black/60">
              Sube frente y dorso completos, sin reflejos y con texto legible.
            </p>
          </div>

          <div class="relative">
            <select
              [ngModel]="selectedCountry()"
              (ngModelChange)="selectCountry($event)"
              aria-label="Seleccionar país de emisión"
              class="appearance-none rounded-xl border border-black/20 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-black focus:border-[#b8ff20] focus:outline-none focus:ring-2 focus:ring-[#b8ff20]/25"
            >
              @for (country of countries; track country.code) {
                <option [value]="country.code">{{ country.name }}</option>
              }
            </select>
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">
              {{ getSelectedCountryFlag() }}
            </span>
            <svg
              class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </header>

        <div class="space-y-3">
          <article
            class="relative overflow-hidden rounded-2xl border border-black/10 bg-white"
            [class.ring-2]="isDraggingFront()"
            [class.ring-[#b8ff20]]="isDraggingFront()"
            (dragover)="onDragOver($event, 'front')"
            (dragleave)="onDragLeave('front')"
            (drop)="onDrop($event, 'dni_front')"
          >
            <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div
                class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/[0.04]"
              >
                @if (frontPreview()) {
                  <img
                    [src]="frontPreview()"
                    alt="Frente del documento"
                    class="h-full w-full object-cover"
                  />
                  <div class="absolute inset-0 bg-black/10"></div>
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-black/45">
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
                <p class="text-sm font-semibold text-black">Frente del documento</p>
                <p class="text-xs text-black/60">
                  @if (frontUploaded()) {
                    Cargado correctamente
                  } @else {
                    Foto clara del lado con datos personales.
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
                  (change)="onFileSelected($event, 'dni_front')"
                />
                @if (uploadingFront()) {
                  <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#b8ff20] border-t-transparent"></div>
                } @else {
                  <button
                    (click)="frontInput.click()"
                    class="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-[#b8ff20] transition hover:bg-black/85"
                  >
                    {{ frontPreview() ? 'Cambiar' : 'Subir' }}
                  </button>
                }
              </div>
            </div>

            @if (uploadingFront()) {
              <div class="h-1 bg-[#b8ff20] transition-all" [style.width.%]="frontProgress()"></div>
            }
          </article>

          <article
            class="relative overflow-hidden rounded-2xl border border-black/10 bg-white"
            [class.ring-2]="isDraggingBack()"
            [class.ring-[#b8ff20]]="isDraggingBack()"
            (dragover)="onDragOver($event, 'back')"
            (dragleave)="onDragLeave('back')"
            (drop)="onDrop($event, 'dni_back')"
          >
            <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div
                class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/[0.04]"
              >
                @if (backPreview()) {
                  <img
                    [src]="backPreview()"
                    alt="Dorso del documento"
                    class="h-full w-full object-cover"
                  />
                  <div class="absolute inset-0 bg-black/10"></div>
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-black/45">
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
                <p class="text-sm font-semibold text-black">Dorso del documento</p>
                <p class="text-xs text-black/60">
                  @if (backUploaded()) {
                    Cargado correctamente
                  } @else {
                    Foto completa donde se vea código o información secundaria.
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
                  (change)="onFileSelected($event, 'dni_back')"
                />
                @if (uploadingBack()) {
                  <div class="h-8 w-8 animate-spin rounded-full border-2 border-[#b8ff20] border-t-transparent"></div>
                } @else {
                  <button
                    (click)="backInput.click()"
                    class="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-[#b8ff20] transition hover:bg-black/85"
                  >
                    {{ backPreview() ? 'Cambiar' : 'Subir' }}
                  </button>
                }
              </div>
            </div>

            @if (uploadingBack()) {
              <div class="h-1 bg-[#b8ff20] transition-all" [style.width.%]="backProgress()"></div>
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
        <section class="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <header class="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Extracción de datos</p>
            <span class="rounded-full px-2 py-1 text-xs font-semibold" [class]="statusToneClass()">
              {{ isAutoVerified() ? 'Auto validado' : 'Revisión asistida' }}
            </span>
          </header>

          <div class="grid gap-4 px-4 py-4 sm:grid-cols-2">
            @for (field of extractedFields(); track field.key) {
              <article>
                <p class="text-[11px] uppercase tracking-wide text-black/55">{{ field.label }}</p>
                <p class="mt-1 text-sm font-semibold text-black">{{ field.value }}</p>
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
        <div class="rounded-2xl border border-[#9be500] bg-[#f7ffd8] px-4 py-3 text-sm text-black">
          Documentos recibidos. Si la validación automática no alcanza confianza alta, tu caso pasa
          a revisión manual sin perder el avance.
        </div>
      }
    </div>
  `,
})
export class DniUploaderComponent {
  private readonly verificationService = inject(VerificationService);
  private readonly analyticsService = inject(AnalyticsService);

  readonly documentsUpdated = output<void>();
  readonly countries = COUNTRIES;

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

  frontOcrResult = signal<OcrResultDisplay | null>(null);
  backOcrResult = signal<OcrResultDisplay | null>(null);
  uploadError = signal<string | null>(null);
  uploadWarning = signal<string | null>(null);

  readonly allSidesUploaded = computed(() => this.frontUploaded() && this.backUploaded());

  constructor() {
    effect(() => {
      const docs = this.verificationService.documents();
      const hasFront = this.hasUploadedDocument(docs, 'gov_id_front');
      const hasBack = this.hasUploadedDocument(docs, 'gov_id_back');

      if (!this.uploadingFront() && !this.frontPreview() && this.frontUploaded() !== hasFront) {
        this.frontUploaded.set(hasFront);
      }

      if (!this.uploadingBack() && !this.backPreview() && this.backUploaded() !== hasBack) {
        this.backUploaded.set(hasBack);
      }
    });
  }

  readonly extractedFields = computed<ExtractedField[]>(() => {
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
    this.frontPreview.set(null);
    this.backPreview.set(null);
    this.frontUploaded.set(false);
    this.backUploaded.set(false);
    this.frontOcrResult.set(null);
    this.backOcrResult.set(null);
    this.frontProgress.set(0);
    this.backProgress.set(0);
    this.uploadError.set(null);
    this.uploadWarning.set(null);
    this.analyticsService.trackEvent('kyc_dni_country_selected', {
      source: 'dni_uploader',
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

      if (file.size > MAX_UPLOAD_BYTES) {
        this.setUploadError(
          `Imagen demasiado grande. Máximo ${this.maxUploadMegabytes()}MB por archivo.`,
        );
        event.preventDefault();
        break;
      }

      if (!this.validateSelectedFile(file)) {
        event.preventDefault();
        break;
      }

      let targetType: 'dni_front' | 'dni_back' | null = null;
      if (!this.frontUploaded() && !this.frontPreview()) {
        targetType = 'dni_front';
      } else if (!this.backUploaded() && !this.backPreview()) {
        targetType = 'dni_back';
      }

      if (targetType) {
        void this.processFile(file, targetType);
        const side = targetType === 'dni_front' ? 'frente' : 'dorso';
        this.announcePaste(`Imagen pegada para el ${side} del documento`);
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

  onDrop(event: DragEvent, type: 'dni_front' | 'dni_back'): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDraggingFront.set(false);
    this.isDraggingBack.set(false);

    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/') && this.validateSelectedFile(file)) {
      void this.processFile(file, type);
    }
  }

  isAutoVerified(): boolean {
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const profileUpdated = this.frontOcrResult()?.profileUpdated;

    return profileUpdated === true || frontConf >= 70 || frontSuccess === true;
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

  getStatusMessage(): string {
    const docName = this.getDocumentName();
    const frontConf = this.frontOcrResult()?.confidence || 0;
    const backConf = this.backOcrResult()?.confidence || 0;
    const frontSuccess = this.frontOcrResult()?.success;
    const backSuccess = this.backOcrResult()?.success;
    const profileLocked = this.frontOcrResult()?.profileUpdated === true;

    if (profileLocked) {
      if (!this.backOcrResult()) {
        return 'Identidad validada. Falta cargar el dorso del documento.';
      }
      if (backSuccess === true || backConf >= 70) {
        return 'Identidad validada y protegida.';
      }
      return 'Identidad validada. El dorso requiere mejor calidad.';
    }

    if (frontSuccess === true || frontConf >= 70) {
      if (!this.backOcrResult()) {
        return `${docName} validado. Falta subir el dorso.`;
      }
      if (backSuccess === true || backConf >= 70) {
        return `${docName} validado correctamente.`;
      }
      return `${docName} frente validado. Mejora la foto del dorso.`;
    }

    if (this.frontOcrResult() && frontConf > 0 && frontConf < 70) {
      return `Baja confianza (${frontConf}%). Intenta con mejor foto.`;
    }

    if (this.backOcrResult() && !this.frontOcrResult()) {
      return 'Dorso procesado. Falta subir el frente.';
    }

    return 'Esperando imágenes del documento.';
  }

  getDocumentName(): string {
    const country = this.countries.find((c) => c.code === this.selectedCountry());
    return country ? `${country.docName} ${country.name}` : 'Documento';
  }

  getSelectedCountryFlag(): string {
    return this.countries.find((c) => c.code === this.selectedCountry())?.flag || '🌍';
  }

  statusToneClass(): string {
    return this.isAutoVerified()
      ? 'border border-[#b8ff20] bg-[#f3ffd0] text-black'
      : 'bg-amber-100 text-amber-700';
  }

  async onFileSelected(event: Event, type: 'dni_front' | 'dni_back'): Promise<void> {
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

  private async processFile(file: File, type: 'dni_front' | 'dni_back'): Promise<void> {
    const docType = type === 'dni_front' ? 'gov_id_front' : 'gov_id_back';
    const isFront = type === 'dni_front';
    this.analyticsService.trackEvent('kyc_document_upload_started', {
      source: 'dni_uploader',
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
        const newProgress = Math.min(current + increment, 85);
        if (isFront) {
          this.frontProgress.set(Math.round(newProgress));
        } else {
          this.backProgress.set(Math.round(newProgress));
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
        this.uploadError.set(null);
        this.analyticsService.trackEvent('kyc_document_ocr_warning', {
          source: 'dni_uploader',
          doc_type: docType,
          side: isFront ? 'front' : 'back',
          country: this.selectedCountry(),
          warning_message: result.ocrWarning,
        });
      } else {
        this.uploadError.set(null);
        this.uploadWarning.set(null);
      }

      if (isFront) {
        this.frontUploaded.set(true);
        if (result.ocrResult) {
          const profileUpdated =
            result.ocrResult.warnings?.some((warning: string) =>
              warning.includes('Identidad verificada automaticamente'),
            ) || false;

          this.frontOcrResult.set({
            success: result.ocrResult.success,
            confidence: result.ocrResult.ocr_confidence,
            extractedName: result.ocrResult.extracted_data?.['fullName'] as string,
            extractedNumber: result.ocrResult.extracted_data?.['documentNumber'] as string,
            errors: result.ocrResult.errors,
            warnings:
              result.ocrResult.warnings?.filter(
                (warning: string) => !warning.includes('Identidad verificada automaticamente'),
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

      this.analyticsService.trackEvent('kyc_document_upload_completed', {
        source: 'dni_uploader',
        doc_type: docType,
        side: isFront ? 'front' : 'back',
        country: this.selectedCountry(),
        ocr_success: result.ocrResult?.success ?? null,
        ocr_confidence: result.ocrResult?.ocr_confidence ?? null,
      });
      this.documentsUpdated.emit();
    } catch (error) {
      clearInterval(progressInterval);
      const message =
        error instanceof Error
          ? error.message
          : 'No pudimos subir la foto. Intenta nuevamente con mejor luz.';
      this.uploadWarning.set(null);
      this.setUploadError(message);
      this.analyticsService.trackEvent('kyc_document_upload_failed', {
        source: 'dni_uploader',
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

  private maxUploadMegabytes(): number {
    return Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
  }

  private setUploadError(message: string): void {
    this.uploadWarning.set(null);
    this.uploadError.set(message);
    this.announcePaste(message);
  }

  private hasUploadedDocument(
    documents: UserDocument[],
    kind: 'gov_id_front' | 'gov_id_back',
  ): boolean {
    return documents.some(
      (document) =>
        document.kind === kind && !!document.storage_path && String(document.status) !== 'rejected',
    );
  }

  private announcePaste(message: string): void {
    const announcementDiv = document.getElementById('paste-announcements');
    if (!announcementDiv) return;

    announcementDiv.textContent = message;
    setTimeout(() => {
      announcementDiv.textContent = '';
    }, 1000);
  }
}
