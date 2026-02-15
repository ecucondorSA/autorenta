import {
  Component,
  OnInit,
  inject,
  computed,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { VerificationService } from '@core/services/verification/verification.service';
import { ProfileStore } from '@core/stores/profile.store';
import { SelfieCaptureComponent } from '@shared/components/selfie-capture/selfie-capture.component';
import { LicenseCaptureComponent } from '@shared/components/license-capture/license-capture.component';
import { LicenseVerificationService } from '@core/services/verification/license-verification.service';
import { getDocumentsByCategory, DocumentTypeConfig } from '@core/config/document-types.config';
import { UserProfile, UserDocument } from '@core/models';

interface PrefilledFieldHint {
  label: string;
  value: string;
  docIds: string[];
}

interface PrefillFieldConfig {
  key: keyof Pick<
    UserProfile,
    | 'full_name'
    | 'gov_id_number'
    | 'driver_license_number'
    | 'address_line1'
    | 'city'
    | 'country'
    | 'phone'
    | 'whatsapp'
  >;
  label: string;
  docIds: string[];
}

interface DocCategoryBlock {
  id: DocumentTypeConfig['category'];
  title: string;
  description: string;
  docs: DocumentTypeConfig[];
}

const DOC_CATEGORIES: DocCategoryBlock[] = [
  {
    id: 'identity',
    title: 'Identidad',
    description: 'Validamos tu documento nacional, pasaporte o selfie.',
    docs: getDocumentsByCategory('identity'),
  },
  {
    id: 'vehicle',
    title: 'Documentos de tu auto',
    description: 'Solo pedimos los archivos indispensables para publicar.',
    docs: getDocumentsByCategory('vehicle'),
  },
  {
    id: 'other',
    title: 'Soportes complementarios',
    description: 'Comprobantes que nos ayudan a validar domicilio y contacto.',
    docs: getDocumentsByCategory('other'),
  },
];

const TOTAL_DOCS_REQUIRED = DOC_CATEGORIES.reduce((count, block) => count + block.docs.length, 0);

const PREFILL_CONFIG: PrefillFieldConfig[] = [
  {
    key: 'full_name',
    label: 'Nombre completo',
    docIds: ['gov_id_front', 'gov_id_back', 'passport', 'selfie'],
  },
  { key: 'gov_id_number', label: 'Número de documento', docIds: ['gov_id_front', 'gov_id_back'] },
  { key: 'driver_license_number', label: 'Número de licencia', docIds: ['driver_license'] },
  { key: 'address_line1', label: 'Dirección', docIds: ['utility_bill', 'vehicle_registration'] },
  { key: 'city', label: 'Ciudad', docIds: ['utility_bill'] },
  { key: 'country', label: 'País', docIds: ['passport', 'driver_license'] },
  { key: 'phone', label: 'Teléfono', docIds: ['selfie', 'driver_license'] },
  { key: 'whatsapp', label: 'WhatsApp', docIds: ['selfie'] },
];

const FAQ_ITEMS = [
  {
    question: '¿Por qué necesitamos tus datos?',
    answer:
      'La verificación protege tus futuras reservas y publicaciones. Solo pedimos lo mínimo indispensable y está encriptado.',
  },
  {
    question: '¿Cuánto demoramos en revisar?',
    answer:
      'Nuestro equipo tarda entre 24 y 48 h hábiles. Te avisamos por email y notificaciones cuando haya novedades.',
  },
  {
    question: '¿Se reutilizan mis documentos?',
    answer:
      'Sí. Reutilizamos documentos y datos del perfil para evitar que vuelvas a subir archivos o escribir todo de nuevo.',
  },
];

type DocState = 'missing' | 'in_review' | 'approved' | 'rejected';
type VerificationStatus = 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO'; // Using local type derived from service

@Component({
  selector: 'app-verification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SelfieCaptureComponent, LicenseCaptureComponent],
  template: `
    <div class="verification-page bg-surface-base min-h-screen transition-colors duration-300">
      @if (showSelfieCapture()) {
        <app-selfie-capture
          (cancelled)="showSelfieCapture.set(false)"
          (completed)="onSelfieCaptured($event)"
        >
        </app-selfie-capture>
      }

      @if (showLicenseCapture()) {
        <app-license-capture
          (cancelled)="showLicenseCapture.set(false)"
          (completed)="onLicenseCaptured($event)"
        >
        </app-license-capture>
      }

      <!-- Header Section -->
      <section
        class="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white"
      >
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p class="text-xs uppercase tracking-[0.3em] text-white/70 mb-3">Centro de seguridad</p>
          <div class="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div class="space-y-4">
              <h1 class="text-3xl font-bold leading-tight">Tu identidad crea confianza</h1>
              <p class="text-white/90 max-w-2xl">
                Simplificamos la verificación reutilizando datos de tu perfil y documentos ya
                cargados. Avanza en pocos pasos y publica más rápido.
              </p>
              <div class="flex flex-wrap gap-3">
                <a
                  href="#verification-docs"
                  class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-primary-700 shadow hover:bg-primary-50 transition-colors"
                >
                  Continuar verificación →
                </a>
                <button
                  type="button"
                  (click)="toggleFaq()"
                  class="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/90 hover:border-white hover:text-white transition-colors"
                >
                  {{ showFaq() ? 'Ocultar preguntas' : 'Preguntas frecuentes' }}
                </button>
              </div>
            </div>
            <div class="rounded-2xl bg-white/10 backdrop-blur px-6 py-5 min-w-[240px]">
              <p class="text-sm uppercase tracking-widest text-white/70 mb-1">Progreso</p>
              <p class="text-4xl font-bold">{{ completionPercentage() }}%</p>
              <p class="text-white/80 text-sm">
                {{ completedDocs() }} de {{ totalRequiredDocs }} documentos listos
              </p>
            </div>
          </div>
        </div>
      </section>

      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Status Section -->
        @if (currentStatus(); as status) {
          <section class="grid gap-4 md:grid-cols-3 mb-8">
            <!-- Status Card -->
            <div class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm text-text-secondary">Estado actual</p>
                  <p class="text-2xl font-semibold text-text-primary mt-1">
                    {{ getStatusLabel(status.status) }}
                  </p>
                  <p class="text-sm text-text-secondary">
                    Actualizado {{ formatDate(status.updated_at) }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                  [ngClass]="getStatusChipClasses(status.status)"
                >
                  {{ getStatusEmoji(status.status) }} {{ status.status.toLowerCase() }}
                </span>
              </div>
              <p class="mt-4 text-sm text-text-secondary">
                {{ getStatusDescription(status.status) }}
              </p>
              @if (status.notes) {
                <div
                  class="mt-4 rounded-xl border border-error-border/60 bg-error-bg/60 px-4 py-3 text-sm text-error-strong"
                >
                  {{ status.notes }}
                </div>
              }
            </div>

            <!-- Progress Card -->
            <div class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm">
              <h3 class="text-lg font-semibold text-text-primary">Revisión y progreso</h3>
              <ul class="mt-4 space-y-3 text-sm text-text-secondary">
                <li class="flex items-center justify-between gap-4">
                  <span>Documentos listos</span>
                  <span class="font-semibold text-text-primary">{{ completedDocs() }}</span>
                </li>
                <li class="flex items-center justify-between gap-4">
                  <span>Pendientes</span>
                  <span class="font-semibold text-warning-600">{{ missingDocs().length }}</span>
                </li>
                <li class="flex items-center justify-between gap-4">
                  <span>Solicitud creada</span>
                  <span>{{ formatDate(status.created_at || status.updated_at) }}</span>
                </li>
              </ul>
            </div>

            <!-- Action Card -->
            <div
              class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm flex flex-col gap-4"
            >
              <div>
                <h3 class="text-lg font-semibold text-text-primary">Acciones inmediatas</h3>
                <p class="text-sm text-text-secondary">
                  Completa los documentos y solicitaremos revisión automáticamente.
                </p>
              </div>
              <button
                (click)="triggerVerification()"
                [disabled]="isVerifying()"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 font-semibold text-text-inverse transition-colors disabled:bg-gray-400"
              >
                {{ isVerifying() ? 'Revisando...' : 'Solicitar revisión ahora' }}
              </button>
              <p class="text-xs text-text-secondary">
                {{
                  autoTriggered()
                    ? 'Verificación enviada automáticamente.'
                    : 'Envío automático al completar todo.'
                }}
              </p>
            </div>
          </section>
        }

        @if (uploadError(); as errorMsg) {
          <div
            class="mb-6 flex items-start gap-3 rounded-2xl border border-error-border bg-error-bg px-5 py-4 text-sm text-error-strong shadow-sm"
            role="alert"
          >
            <span class="shrink-0 text-lg">⚠</span>
            <div class="flex-1">
              <p class="font-semibold">Ocurrió un problema</p>
              <p class="mt-1">{{ errorMsg }}</p>
            </div>
            <button
              (click)="uploadError.set(null)"
              class="shrink-0 rounded-lg p-1 hover:bg-error-border/30 transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        }

        <section id="verification-docs" class="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div class="space-y-6">
            @for (category of docCategories; track category.id) {
              <div class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 class="text-xl font-semibold text-text-primary">{{ category.title }}</h2>
                    <p class="text-sm text-text-secondary">{{ category.description }}</p>
                  </div>
                  <div
                    class="rounded-full bg-surface-base px-4 py-1 text-sm font-semibold text-text-secondary"
                  >
                    {{ getCategoryStats(category.docs).completed }}/{{
                      category.docs.length
                    }}
                    completado
                  </div>
                </div>

                <div class="mt-5 space-y-4">
                  @for (doc of category.docs; track doc.id) {
                    <div
                      class="rounded-2xl border border-border-default bg-white/70 px-4 py-4 shadow-sm"
                    >
                      <div
                        class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                      >
                        <div>
                          <p class="text-base font-semibold text-text-primary">
                            {{ doc.emoji }} {{ doc.label }}
                          </p>
                          <p class="text-sm text-text-secondary">{{ doc.description }}</p>
                          @if (getDocPrefillLabels(doc.id).length > 0) {
                            <p class="mt-2 text-xs text-primary-600">
                              Autocompletamos: {{ getDocPrefillLabels(doc.id).join(', ') }}
                            </p>
                          }
                          @if (getDocStatusHelperText(doc.id); as helperText) {
                            <p class="mt-2 text-xs" [class]="getDocStatusHelperClasses(doc.id)">
                              {{ helperText }}
                            </p>
                          }
                        </div>
                        <span
                          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                          [ngClass]="getDocStatusClasses(doc.id)"
                        >
                          {{ getDocStatusLabel(doc.id) }}
                        </span>
                      </div>

                      <div class="mt-4 flex flex-wrap gap-3">
                        <!-- CUSTOM LOGIC FOR SELFIE & LICENSE -->
                        @if (doc.id === 'selfie') {
                          <button
                            (click)="openSelfieCapture()"
                            [disabled]="
                              getDocState(doc.id) === 'approved' ||
                              getDocState(doc.id) === 'in_review'
                            "
                            class="inline-flex items-center gap-2 rounded-xl bg-primary-600 text-text-inverse px-3 py-1.5 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                            {{
                              getDocState(doc.id) === 'missing'
                                ? 'Iniciar Validación Facial'
                                : 'Repetir Validación'
                            }}
                          </button>
                        } @else if (doc.id === 'driver_license') {
                          <button
                            (click)="openLicenseCapture()"
                            [disabled]="
                              getDocState(doc.id) === 'approved' ||
                              getDocState(doc.id) === 'in_review'
                            "
                            class="inline-flex items-center gap-2 rounded-xl bg-primary-600 text-text-inverse px-3 py-1.5 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.716 1.6-1.6 1.6H9.6a1.6 1.6 0 100-3.2 1.6 1.6 0 001.6 1.6z"
                              />
                            </svg>
                            {{
                              getDocState(doc.id) === 'missing'
                                ? 'Escanear Licencia'
                                : 'Repetir Escaneo'
                            }}
                          </button>
                        } @else {
                          <!-- STANDARD DOC UPLOAD -->
                          <div class="relative">
                            <input
                              type="file"
                              [id]="doc.id"
                              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              [accept]="doc.acceptedFormats?.join(',')"
                              [disabled]="
                                getDocState(doc.id) === 'approved' ||
                                getDocState(doc.id) === 'in_review' ||
                                isUploading(doc.id)
                              "
                              (change)="onFileSelected($event, doc.id)"
                            />
                            <button
                              class="inline-flex items-center gap-2 rounded-xl bg-surface-elevated border border-border-base px-3 py-1.5 text-sm font-medium hover:bg-surface-highlight transition-colors"
                              [class.opacity-50]="
                                getDocState(doc.id) === 'approved' ||
                                getDocState(doc.id) === 'in_review'
                              "
                            >
                              <svg
                                class="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                />
                              </svg>
                              {{
                                getDocState(doc.id) === 'missing' ? 'Subir documento' : 'Reemplazar'
                              }}
                            </button>
                          </div>
                        }

                        @if (getDocPrefillLabels(doc.id).length > 0 && doc.id !== 'selfie') {
                          <button
                            type="button"
                            (click)="prefillDoc(doc.id)"
                            class="inline-flex items-center gap-2 rounded-xl bg-surface-base/60 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            ✨ Autocompletar
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <aside class="space-y-6">
            <div class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm">
              <h3 class="text-lg font-semibold text-text-primary">Datos importados del perfil</h3>
              <p class="text-sm text-text-secondary">
                Reutilizamos la información que ya completaste.
              </p>
              <ul class="mt-4 space-y-2 text-sm">
                @if (prefilledFields().length > 0) {
                  @for (hint of prefilledFields(); track hint.label) {
                    <li class="flex items-start gap-2">
                      <span class="text-primary-500">•</span>
                      <span>
                        <span class="font-medium text-text-primary">{{ hint.label }}</span>
                        <span class="ml-1 text-text-secondary">{{ hint.value }}</span>
                      </span>
                    </li>
                  }
                } @else {
                  <li class="text-text-secondary">
                    Completa tu perfil para habilitar el autollenado.
                  </li>
                }
              </ul>
              <a
                routerLink="/profile"
                class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Actualizar perfil →
              </a>
            </div>

            <div class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm">
              <h3 class="text-lg font-semibold text-text-primary">¿Necesitas ayuda?</h3>
              <p class="text-sm text-text-secondary">¿Hubo problemas? Escribinos.</p>
              <a
                href="mailto:soporte@autorentar.com"
                class="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-default px-3 py-1.5 text-sm font-medium text-text-primary hover:border-primary-500 hover:text-primary-600 transition-colors"
              >
                Escribir a soporte
              </a>
            </div>
          </aside>
        </section>

        @if (showFaq()) {
          <section class="mt-10">
            <div class="rounded-2xl border border-border-default bg-surface-raised p-6 shadow-sm">
              <h2 class="text-xl font-semibold text-text-primary mb-4">Preguntas frecuentes</h2>
              <div class="divide-y divide-border-default">
                @for (faq of faqItems; track faq.question) {
                  <details class="group py-3">
                    <summary
                      class="flex cursor-pointer items-center justify-between text-base font-semibold text-text-primary"
                    >
                      {{ faq.question }}
                      <span class="text-lg transition-transform group-open:rotate-180">⌄</span>
                    </summary>
                    <p class="mt-2 text-sm text-text-secondary">{{ faq.answer }}</p>
                  </details>
                }
              </div>
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .verification-page {
        min-height: 100vh;
      }
    `,
  ],
})
export class VerificationPage implements OnInit {
  private readonly verificationService = inject(VerificationService);
  private readonly licenseVerificationService = inject(LicenseVerificationService);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  readonly docCategories = DOC_CATEGORIES;
  readonly faqItems = FAQ_ITEMS;
  readonly totalRequiredDocs = TOTAL_DOCS_REQUIRED;
  readonly profile = this.profileStore.profile;
  readonly verificationStatus = this.verificationService.statuses;
  readonly documents = this.verificationService.documents;
  readonly currentStatus = computed(() => {
    const statuses = this.verificationStatus();
    return statuses && statuses.length > 0 ? statuses[0] : null;
  });
  readonly isVerifying = signal(false);
  readonly autoTriggered = signal(false);
  readonly showFaq = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly showSelfieCapture = signal(false);
  readonly showLicenseCapture = signal(false);

  readonly missingDocs = computed(() => this.currentStatus()?.missing_docs || []);
  readonly completedDocs = computed(() => {
    const completed = this.totalRequiredDocs - this.missingDocs().length;
    return Math.max(0, Math.min(this.totalRequiredDocs, completed));
  });
  readonly completionPercentage = computed(() => {
    if (this.totalRequiredDocs === 0) return 0;
    return Math.min(100, Math.round((this.completedDocs() / this.totalRequiredDocs) * 100));
  });
  readonly prefilledFields = computed<PrefilledFieldHint[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const hints: PrefilledFieldHint[] = [];
    for (const config of PREFILL_CONFIG) {
      const value = profile[config.key];
      if (!value) continue;
      hints.push({ label: config.label, value: String(value), docIds: config.docIds });
    }
    return hints;
  });

  readonly docPrefillHints = computed<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const field of this.prefilledFields()) {
      for (const docId of field.docIds) {
        if (!map[docId]) map[docId] = [];
        map[docId].push(field.label);
      }
    }
    return map;
  });

  readonly docStatusMap = computed<Record<string, UserDocument>>(() => {
    const map: Record<string, UserDocument> = {};
    for (const doc of this.documents()) {
      if (!map[doc.kind]) map[doc.kind] = doc;
    }

    if (!map['driver_license']) {
      const licenseDocs = [map['license_front'], map['license_back']].filter(
        Boolean,
      ) as UserDocument[];
      if (licenseDocs.length > 0) {
        const hasRejected = licenseDocs.some((d) => d.status === 'rejected');
        const hasPending = licenseDocs.some((d) => d.status === 'pending');
        const hasVerified = licenseDocs.some((d) => d.status === 'verified');
        const status = hasRejected
          ? 'rejected'
          : hasPending
            ? 'pending'
            : hasVerified
              ? 'verified'
              : licenseDocs[0].status;
        map['driver_license'] = { ...licenseDocs[0], kind: 'driver_license', status };
      }
    }
    return map;
  });

  private readonly autoTriggerWatcher = effect(() => {
    const status = this.currentStatus();
    if (!status || status.status === 'VERIFICADO') {
      this.autoTriggered.set(false);
      return;
    }
    const pending = this.missingDocs().length;
    if (pending === 0 && !this.autoTriggered() && !this.isVerifying()) {
      this.autoTriggered.set(true);
      this.triggerVerification(true);
    } else if (pending > 0 && this.autoTriggered()) {
      this.autoTriggered.set(false);
    }
  });

  ngOnInit(): void {
    void this.verificationService.loadStatuses().catch(() => null);
    void this.verificationService.loadDocuments().catch(() => null);
    void this.profileStore.loadProfile();
  }

  toggleFaq(): void {
    this.showFaq.update((value) => !value);
  }

  openSelfieCapture() {
    this.showSelfieCapture.set(true);
  }

  onSelfieCaptured(_path: string) {
    this.showSelfieCapture.set(false);
    void this.verificationService.loadDocuments();
  }

  openLicenseCapture() {
    this.showLicenseCapture.set(true);
  }

  onLicenseCaptured(blob: Blob) {
    this.showLicenseCapture.set(false);
    this.licenseVerificationService
      .processLicense(blob)
      .then(() => void this.verificationService.loadDocuments()) // reload docs
      .catch((err) => console.error('License analysis failed', err));
  }

  triggerVerification(auto = false): void {
    if (this.isVerifying()) return;
    this.isVerifying.set(true);
    this.uploadError.set(null);
    this.verificationService
      .triggerVerification()
      .then(() => {
        this.isVerifying.set(false);
        if (!auto) this.autoTriggered.set(false);
      })
      .catch((err) => {
        this.isVerifying.set(false);
        if (auto) this.autoTriggered.set(false);
        const message =
          err instanceof Error ? err.message : 'Error en la verificación. Intenta de nuevo.';
        this.uploadError.set(message);
      });
  }

  prefillDoc(docId: string): void {
    void this.router.navigate(['/profile'], {
      queryParams: { doc: docId, intent: 'prefill' },
    });
  }

  getCategoryStats(docs: DocumentTypeConfig[]): { completed: number; total: number } {
    const completed = docs.filter((doc) => this.isDocCompleted(doc.id)).length;
    return { completed, total: docs.length };
  }

  isDocCompleted(docId: string): boolean {
    return this.getDocState(docId) !== 'missing';
  }

  getDocPrefillLabels(docId: string): string[] {
    return this.docPrefillHints()[docId] ?? [];
  }

  protected getDocState(docId: string): DocState {
    const docRecord = this.docStatusMap()[docId];
    if (docRecord?.status === 'rejected') return 'rejected';
    if (docRecord?.status === 'verified') return 'approved';
    if (docRecord?.status === 'pending') return 'in_review';
    if (docRecord?.status === 'not_started')
      return this.missingDocs().includes(docId) ? 'missing' : 'in_review';
    // If not in map and missing from missingDocs, default to missing or handle edge case
    if (!docRecord && this.missingDocs().includes(docId)) return 'missing';
    if (!docRecord) return 'missing';
    return 'in_review';
  }

  getDocStatusLabel(docId: string): string {
    switch (this.getDocState(docId)) {
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Observado';
      case 'in_review':
        return 'En revisión';
      default:
        return 'Pendiente';
    }
  }

  getDocStatusClasses(docId: string): string {
    switch (this.getDocState(docId)) {
      case 'approved':
        return 'border-success-light text-success-strong bg-success-light/10';
      case 'rejected':
        return 'border-error-border text-error-strong bg-error-bg';
      case 'in_review':
        return 'border-primary-400 text-primary-600 bg-primary-50';
      default:
        return 'border-warning-border text-warning-600 bg-warning-bg';
    }
  }

  getDocStatusHelperText(docId: string): string | null {
    switch (this.getDocState(docId)) {
      case 'approved':
        return 'Documento aprobado. Solo actualizalo si cambió algo.';
      case 'rejected':
        return 'Hubo observaciones. Revisá las notas en el resumen.';
      case 'in_review':
        return 'Ya lo recibimos y lo estamos revisando.';
      default:
        return null;
    }
  }

  getDocStatusHelperClasses(docId: string): string {
    switch (this.getDocState(docId)) {
      case 'approved':
        return 'text-success-strong';
      case 'rejected':
        return 'text-error-strong';
      case 'in_review':
        return 'text-primary-600';
      default:
        return 'text-text-secondary';
    }
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      );
    } catch {
      return value;
    }
  }

  getStatusLabel(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return 'Verificado';
      case 'RECHAZADO':
        return 'Rechazado';
      default:
        return 'En revisión';
    }
  }

  getStatusDescription(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return 'Ya podés publicar y recibir reservas sin demoras.';
      case 'RECHAZADO':
        return 'Revisá las notas para corregir los documentos observados.';
      default:
        return 'Estamos revisando tu documentación. Te avisaremos apenas tengamos novedades.';
    }
  }

  getStatusEmoji(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return '✅';
      case 'RECHAZADO':
        return '❌';
      default:
        return '⏳';
    }
  }

  getStatusChipClasses(status: VerificationStatus): string {
    switch (status) {
      case 'VERIFICADO':
        return 'border-success-light text-success-strong bg-success-light/10';
      case 'RECHAZADO':
        return 'border-error-border text-error-strong bg-error-bg';
      default:
        return 'border-warning-border text-warning-600 bg-warning-bg';
    }
  }

  // Method missing in previous snippets but present in template, I'll add assuming it's part of Component class usage
  onFileSelected(event: Event, docId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.uploadError.set(null);
      this.verificationService
        .uploadDocument(file, docId)
        .then(() => this.verificationService.loadDocuments())
        .catch((err) => {
          const message =
            err instanceof Error ? err.message : 'Error al subir documento. Intenta de nuevo.';
          this.uploadError.set(message);
        });
    }
  }

  // Helper to check if uploading
  isUploading(_docId: string): boolean {
    // Simplification: not tracking upload state per doc currently
    return false;
  }
}
