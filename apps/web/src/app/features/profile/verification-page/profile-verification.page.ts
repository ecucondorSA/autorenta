import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProfileStore } from '@core/stores/profile.store';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { VerificationService } from '@core/services/verification/verification.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { EmailVerificationComponent } from '../../../shared/components/email-verification/email-verification.component';
import { PhoneVerificationComponent } from '../../../shared/components/phone-verification/phone-verification.component';
import { SelfieCaptureComponent } from '../../../shared/components/selfie-capture/selfie-capture.component';
import { LicenseUploaderComponent } from './components/license-uploader.component';
import { DniUploaderComponent } from './components/dni-uploader.component';

type StepState = 'completed' | 'active' | 'locked';

interface StepIndicator {
  id: number;
  title: string;
  detail: string;
  state: StepState;
}

@Component({
  selector: 'app-profile-verification',
  standalone: true,
  imports: [
    RouterModule,
    EmailVerificationComponent,
    PhoneVerificationComponent,
    SelfieCaptureComponent,
    LicenseUploaderComponent,
    DniUploaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[#f4f7fb] pb-20">
      <nav class="fixed left-0 top-0 z-50 h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div class="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            [routerLink]="returnUrl() || '/profile'"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Volver"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <span class="text-sm font-semibold text-slate-900">Verificación de Cuenta</span>
          <div class="w-10"></div>
        </div>
      </nav>

      <main class="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        @if (dataLoading()) {
          <div class="space-y-6 animate-pulse">
            <div class="h-40 rounded-3xl bg-slate-200"></div>
            <div class="grid gap-4 md:grid-cols-3">
              <div class="h-24 rounded-2xl bg-slate-200"></div>
              <div class="h-24 rounded-2xl bg-slate-200"></div>
              <div class="h-24 rounded-2xl bg-slate-200"></div>
            </div>
            <div class="h-72 rounded-3xl bg-slate-200"></div>
          </div>
        } @else {
          <section
            class="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl"
          >
            <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"></div>

            <div class="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div class="max-w-2xl space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Proceso KYC
                </p>
                <h1 class="text-2xl font-semibold leading-tight md:text-3xl">
                  Verificación bancaria de identidad
                </h1>
                <p class="text-sm text-slate-200 md:text-base">
                  Protegemos tus reservas y pagos validando identidad, licencia y prueba de vida con
                  trazabilidad completa.
                </p>
              </div>

              <div class="inline-flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
                <div class="relative h-14 w-14 shrink-0">
                  <svg class="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      stroke-width="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgb(52 211 153)"
                      stroke-width="3"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="progressPercentage() + ', 100'"
                    />
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                    {{ progressPercentage() }}%
                  </span>
                </div>
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-slate-300">Estado actual</p>
                  <p class="text-sm font-semibold text-white">Paso {{ currentStepNumber() }} de 3</p>
                </div>
              </div>
            </div>
          </section>

          <section class="mt-6 grid gap-3 md:grid-cols-3">
            @for (step of stepIndicators(); track step.id) {
              <article
                class="rounded-2xl border p-4 transition-all"
                [class]="stepCardClass(step.state)"
                [attr.aria-current]="step.state === 'active' ? 'step' : null"
              >
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold">{{ step.title }}</h2>
                  <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    [class]="stepBadgeClass(step.state)"
                  >
                    {{ step.id }}
                  </span>
                </div>
                <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ step.detail }}</p>
              </article>
            }
          </section>

          <section class="mt-8 space-y-6">
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">1. Contacto</h3>
                  <p class="text-sm text-slate-500">Confirmamos email y teléfono para alertas de seguridad.</p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="statusPillClass(isLevelComplete(1))">
                  {{ isLevelComplete(1) ? 'Completado' : 'Pendiente' }}
                </span>
              </div>

              @if (!isLevelComplete(1)) {
                <div class="space-y-4">
                  <app-email-verification></app-email-verification>
                  <app-phone-verification></app-phone-verification>
                </div>
              } @else {
                <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Contacto verificado para <strong>{{ userEmail() }}</strong>.
                </div>
              }
            </article>

            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">2. Identidad y licencia</h3>
                  <p class="text-sm text-slate-500">
                    Recolección documental con revisión automática y respaldo para validación manual.
                  </p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="statusPillClass(isLevelComplete(2))">
                  {{ isLevelComplete(2) ? 'Completado' : 'En proceso' }}
                </span>
              </div>

              @if (!isLevelComplete(1)) {
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Completa primero el paso 1 para continuar.
                </div>
              } @else {
                <div class="mb-5 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border p-3" [class]="documentCardClass(dniState())">
                    <p class="text-xs uppercase tracking-wide text-slate-500">Documento de identidad</p>
                    <p class="mt-1 text-sm font-semibold text-slate-900">{{ dniLabel() }}</p>
                    <p class="mt-1 text-xs text-slate-600">{{ dniHint() }}</p>
                  </div>
                  <div class="rounded-2xl border p-3" [class]="documentCardClass(licenseState())">
                    <p class="text-xs uppercase tracking-wide text-slate-500">Licencia de conducir</p>
                    <p class="mt-1 text-sm font-semibold text-slate-900">{{ licenseLabel() }}</p>
                    <p class="mt-1 text-xs text-slate-600">{{ licenseHint() }}</p>
                  </div>
                </div>

                @if (!canStartLicenseUpload()) {
                  <app-dni-uploader (documentsUpdated)="onDocumentsUpdated()"></app-dni-uploader>
                } @else if (!isLevelComplete(2)) {
                  <div class="space-y-4">
                    <div
                      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700"
                    >
                      Puedes reemplazar fotos en cualquier momento mientras la revisión siga en proceso.
                    </div>
                    <app-dni-uploader (documentsUpdated)="onDocumentsUpdated()"></app-dni-uploader>
                    <app-license-uploader
                      [hideCountrySelector]="false"
                      (verificationCompleted)="onLicenseVerificationComplete()"
                    ></app-license-uploader>
                  </div>
                }

                @if (showLevel2ManualReview()) {
                  <div
                    class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  >
                    Documentos cargados correctamente. Estamos terminando la revisión automática; si no
                    alcanza confianza alta, pasará a validación manual sin que pierdas el avance.
                  </div>
                }

                @if (isLevelComplete(2)) {
                  <div
                    class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                  >
                    Identidad y licencia verificadas. Puedes avanzar a prueba de vida.
                  </div>
                }
              }
            </article>

            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900">3. Prueba de vida</h3>
                  <p class="text-sm text-slate-500">Confirmamos que el titular está presente en tiempo real.</p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="statusPillClass(isLevelComplete(3))">
                  {{ isLevelComplete(3) ? 'Completado' : 'Pendiente' }}
                </span>
              </div>

              @if (!canAccessLevel(3)) {
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Este paso se habilita al completar la verificación documental.
                </div>
              } @else if (!isLevelComplete(3)) {
                <app-selfie-capture></app-selfie-capture>
              } @else {
                <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Biometría validada exitosamente.
                </div>
              }
            </article>
          </section>

          @if (progressPercentage() === 100) {
            <section class="mt-8 rounded-3xl border border-emerald-300 bg-white p-6 shadow-lg">
              <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                    Cuenta verificada
                  </p>
                  <h3 class="mt-1 text-2xl font-semibold text-slate-900">KYC completado con éxito</h3>
                  <p class="mt-2 text-sm text-slate-600">
                    Tu perfil ya cumple el nivel de seguridad requerido para publicar y reservar.
                  </p>
                </div>
                <a
                  [routerLink]="returnUrl() || '/cars'"
                  class="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Continuar
                </a>
              </div>
            </section>
          }
        }
      </main>
    </div>
  `,
})
export class ProfileVerificationPage implements OnInit, OnDestroy {
  private readonly profileStore = inject(ProfileStore);
  private readonly identityService = inject(IdentityLevelService);
  private readonly verificationService = inject(VerificationService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly route = inject(ActivatedRoute);

  readonly profile = this.profileStore.profile;
  readonly userEmail = this.profileStore.userEmail;
  readonly dataLoading = signal(true);
  readonly returnUrl = signal<string | null>(null);

  readonly verificationProgress = this.identityService.verificationProgress;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);
  readonly documents = this.verificationService.documents;

  readonly progressPercentage = computed(() => this.verificationProgress()?.progress_percentage ?? 0);

  readonly currentStepNumber = computed(() => {
    if (!this.isLevelComplete(1)) return 1;
    if (!this.isLevelComplete(2)) return 2;
    return 3;
  });

  readonly hasDniFront = computed(() => this.hasDocument('gov_id_front'));
  readonly hasDniBack = computed(() => this.hasDocument('gov_id_back'));
  readonly hasLicenseFront = computed(() => this.hasDocument('license_front'));
  readonly hasLicenseBack = computed(() => this.hasDocument('license_back'));

  readonly hasDniPair = computed(() => this.hasDniFront() && this.hasDniBack());
  readonly hasLicensePair = computed(() => this.hasLicenseFront() && this.hasLicenseBack());

  readonly isDniVerified = computed(() => this.requirements()?.level_2?.document_verified ?? false);
  readonly isLicenseVerified = computed(() => this.requirements()?.level_2?.driver_license_verified ?? false);

  readonly canStartLicenseUpload = computed(() => this.isDniVerified() || this.hasDniPair());
  readonly showLevel2ManualReview = computed(
    () => this.hasDniPair() && this.hasLicensePair() && !this.isLevelComplete(2),
  );

  readonly stepIndicators = computed<StepIndicator[]>(() => [
    {
      id: 1,
      title: 'Contacto',
      detail: 'Email y teléfono para alertas de seguridad.',
      state: this.getStepState(1),
    },
    {
      id: 2,
      title: 'Documentación',
      detail: 'DNI + licencia con motor OCR y revisión bancaria.',
      state: this.getStepState(2),
    },
    {
      id: 3,
      title: 'Biometría',
      detail: 'Prueba de vida para cerrar tu verificación.',
      state: this.getStepState(3),
    },
  ]);

  readonly dniState = computed<StepState>(() => {
    if (this.isDniVerified()) return 'completed';
    if (this.hasDniPair() || this.hasDniFront() || this.hasDniBack()) return 'active';
    return 'locked';
  });

  readonly licenseState = computed<StepState>(() => {
    if (this.isLicenseVerified()) return 'completed';
    if (this.hasLicensePair() || this.hasLicenseFront() || this.hasLicenseBack()) return 'active';
    return 'locked';
  });

  readonly dniLabel = computed(() => {
    if (this.isDniVerified()) return 'Verificado';
    if (this.hasDniPair()) return 'Cargado (en revisión)';
    if (this.hasDniFront() || this.hasDniBack()) return 'Carga parcial';
    return 'Pendiente';
  });

  readonly licenseLabel = computed(() => {
    if (this.isLicenseVerified()) return 'Verificada';
    if (this.hasLicensePair()) return 'Cargada (en revisión)';
    if (this.hasLicenseFront() || this.hasLicenseBack()) return 'Carga parcial';
    return 'Pendiente';
  });

  readonly dniHint = computed(() => {
    if (this.isDniVerified()) return 'Documento aprobado por el motor de validación.';
    if (this.hasDniPair()) return 'Frente y dorso cargados. Puedes continuar con licencia.';
    return 'Sube frente y dorso del documento nacional.';
  });

  readonly licenseHint = computed(() => {
    if (this.isLicenseVerified()) return 'Licencia apta para habilitar reserva y conducción.';
    if (this.hasLicensePair()) return 'Recibida. Se evaluará vigencia y consistencia de datos.';
    return 'Sube frente y dorso para completar el nivel documental.';
  });

  async ngOnInit(): Promise<void> {
    const returnUrlParam = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrlParam) {
      this.returnUrl.set(returnUrlParam);
    }

    try {
      await this.refreshVerificationContext();
      this.trackKycView('kyc_verification_viewed');
      await this.identityService.subscribeToRealtimeUpdates();
    } catch {
      // The view keeps rendering with the last known state.
    } finally {
      this.dataLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.identityService.unsubscribeFromRealtime();
  }

  isLevelComplete(level: number): boolean {
    const req = this.requirements();
    if (!req) return false;

    if (level === 1) return req.level_1?.completed ?? false;
    if (level === 2) return req.level_2?.completed ?? false;
    if (level === 3) return req.level_3?.completed ?? false;
    return false;
  }

  canAccessLevel(level: number): boolean {
    if (level === 1) return true;
    if (level === 2) return this.verificationProgress()?.can_access_level_2 ?? false;
    if (level === 3) return this.verificationProgress()?.can_access_level_3 ?? false;
    return false;
  }

  stepCardClass(state: StepState): string {
    if (state === 'completed') {
      return 'border-emerald-200 bg-emerald-50';
    }

    if (state === 'active') {
      return 'border-slate-900 bg-slate-900 text-white';
    }

    return 'border-slate-200 bg-white';
  }

  stepBadgeClass(state: StepState): string {
    if (state === 'completed') {
      return 'bg-emerald-600 text-white';
    }

    if (state === 'active') {
      return 'bg-white text-slate-900';
    }

    return 'bg-slate-100 text-slate-500';
  }

  statusPillClass(completed: boolean): string {
    return completed
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-700';
  }

  documentCardClass(state: StepState): string {
    if (state === 'completed') {
      return 'border-emerald-200 bg-emerald-50';
    }

    if (state === 'active') {
      return 'border-amber-200 bg-amber-50';
    }

    return 'border-slate-200 bg-slate-50';
  }

  async onDocumentsUpdated(): Promise<void> {
    await this.refreshVerificationContext();
    this.trackKycView('kyc_documents_updated');
  }

  async onLicenseVerificationComplete(): Promise<void> {
    await this.refreshVerificationContext();
    this.trackKycView('kyc_license_upload_completed');
  }

  private getStepState(level: number): StepState {
    if (this.isLevelComplete(level)) {
      return 'completed';
    }

    if (this.currentStepNumber() === level) {
      return 'active';
    }

    return 'locked';
  }

  private hasDocument(kind: string): boolean {
    return this.documents().some(
      (doc) => doc.kind === kind && Boolean(doc.storage_path) && String(doc.status) !== 'rejected',
    );
  }

  private async refreshVerificationContext(): Promise<void> {
    await Promise.allSettled([
      this.profile() ? Promise.resolve() : this.profileStore.loadProfile(),
      this.verificationService.loadDocuments(),
      this.identityService.getVerificationProgress(),
    ]);
  }

  private trackKycView(eventType: string): void {
    this.analyticsService.trackEvent(eventType, {
      source: 'profile_verification_page',
      progress_percentage: this.progressPercentage(),
      level_1_completed: this.isLevelComplete(1),
      level_2_completed: this.isLevelComplete(2),
      level_3_completed: this.isLevelComplete(3),
      has_dni_pair: this.hasDniPair(),
      has_license_pair: this.hasLicensePair(),
    });
  }
}
