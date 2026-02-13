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
import { FaceVerificationService } from '@core/services/verification/face-verification.service';
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

interface VerificationVisualSlot {
  id: string;
  title: string;
  hint: string;
  imageUrl: string | null;
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
    <div class="min-h-screen bg-[#f4f6ef] pb-20">
      <nav class="fixed left-0 top-0 z-50 h-16 w-full border-b border-black/10 bg-[#0f0f0f] text-white shadow-sm backdrop-blur">
        <div class="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            [routerLink]="returnUrl() || '/profile'"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-[#b8ff20]"
            aria-label="Volver"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <span class="text-sm font-semibold tracking-wide text-[#b8ff20]">Verificación de Cuenta</span>
          <div class="w-10"></div>
        </div>
      </nav>

      <main class="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        @if (dataLoading()) {
          <div class="animate-pulse space-y-6">
            <div class="h-44 rounded-3xl bg-black/10"></div>
            <div class="grid gap-4 md:grid-cols-3">
              <div class="h-24 rounded-2xl bg-black/10"></div>
              <div class="h-24 rounded-2xl bg-black/10"></div>
              <div class="h-24 rounded-2xl bg-black/10"></div>
            </div>
            <div class="h-72 rounded-3xl bg-black/10"></div>
          </div>
        } @else {
          <section
            class="relative overflow-hidden rounded-3xl border border-black bg-[#0f0f0f] p-6 text-white shadow-2xl"
          >
            <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#b8ff20]/30 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#b8ff20]/18 blur-3xl"></div>

            <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div class="max-w-2xl space-y-3">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#b8ff20]">
                  Avance de verificación
                </p>
                <h1 class="text-2xl font-black leading-tight md:text-3xl">
                  {{ momentumTitle() }}
                </h1>
                <p class="text-sm text-white/80 md:text-base">
                  {{ momentumHint() }}
                </p>
                <p class="text-xs font-semibold uppercase tracking-wide text-[#b8ff20]/90">
                  {{ nextStepHeadline() }}
                </p>
              </div>

              <div class="inline-flex items-center gap-4 rounded-2xl border border-[#b8ff20]/40 bg-black/30 px-4 py-3">
                <div class="relative h-14 w-14 shrink-0">
                  <svg class="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      stroke-width="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#b8ff20"
                      stroke-width="3"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="progressPercentage() + ', 100'"
                    />
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-xs font-black text-[#b8ff20]">
                    {{ progressPercentage() }}%
                  </span>
                </div>
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-white/60">Estado actual</p>
                  <p class="text-sm font-black text-white">Paso {{ currentStepNumber() }} de 3</p>
                  <p class="text-xs text-[#b8ff20]">{{ completedSteps() }} de 3 completos</p>
                </div>
              </div>
            </div>
          </section>

          <section class="mt-6 grid gap-4 md:grid-cols-3">
            @for (slot of visualSlots; track slot.id) {
              <article
                class="group overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                @if (slot.imageUrl) {
                  <img [src]="slot.imageUrl" [alt]="slot.title" class="h-28 w-full rounded-xl object-cover" />
                } @else {
                  <div
                    class="relative h-28 overflow-hidden rounded-xl border border-dashed border-black/20 bg-[linear-gradient(180deg,#f9ffe8_0%,#eef6d8_100%)]"
                  >
                    <div
                      class="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#b8ff20]/30 blur-2xl"
                    ></div>
                    <div
                      class="absolute bottom-2 left-3 h-1.5 w-20 rounded-full bg-black/20"
                    ></div>
                    <div
                      class="absolute bottom-6 left-3 h-1.5 w-14 rounded-full bg-black/15"
                    ></div>
                    <p class="absolute right-3 top-3 text-[10px] font-semibold uppercase tracking-wide text-black/50">
                      Espacio visual
                    </p>
                  </div>
                }
                <div class="px-1 pb-1 pt-2">
                  <p class="text-xs font-semibold text-black">{{ slot.title }}</p>
                  <p class="text-[11px] text-black/60">{{ slot.hint }}</p>
                </div>
              </article>
            }
          </section>

          <section class="mt-6 grid gap-3 md:grid-cols-3">
            @for (step of stepIndicators(); track step.id) {
              <article
                class="rounded-2xl border p-4 transition-all duration-200"
                [class]="stepCardClass(step.state)"
                [attr.aria-current]="step.state === 'active' ? 'step' : null"
              >
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold">{{ step.title }}</h2>
                  <span
                    class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    [class]="stepBadgeClass(step.state)"
                  >
                    {{ step.id }}
                  </span>
                </div>
                <p class="mt-2 text-xs leading-relaxed">{{ step.detail }}</p>
                <p class="mt-2 text-[11px] font-semibold uppercase tracking-wide">
                  {{ stepStateLabel(step.state) }}
                </p>
              </article>
            }
          </section>

          <section class="mt-8 space-y-6">
            <article class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-black">1. Contacto</h3>
                  <p class="text-sm text-black/60">Confirmamos email y teléfono para alertas de seguridad.</p>
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
                <div class="rounded-2xl border border-[#b8ff20] bg-[#f3ffd0] px-4 py-3 text-sm text-black">
                  Contacto verificado para <strong>{{ userEmail() }}</strong>.
                </div>
              }
            </article>

            <article class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-black">2. Identidad y licencia</h3>
                  <p class="text-sm text-black/60">
                    Recolección documental con revisión automática y respaldo para validación manual.
                  </p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="statusPillClass(isLevelComplete(2))">
                  {{ isLevelComplete(2) ? 'Completado' : 'En proceso' }}
                </span>
              </div>

              @if (!isLevelComplete(1)) {
                <div class="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/70">
                  Completa primero el paso 1 para continuar.
                </div>
              } @else {
                <div class="mb-5 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border p-3" [class]="documentCardClass(dniState())">
                    <p class="text-xs uppercase tracking-wide text-black/55">Documento de identidad</p>
                    <p class="mt-1 text-sm font-semibold text-black">{{ dniLabel() }}</p>
                    <p class="mt-1 text-xs text-black/70">{{ dniHint() }}</p>
                  </div>
                  <div class="rounded-2xl border p-3" [class]="documentCardClass(licenseState())">
                    <p class="text-xs uppercase tracking-wide text-black/55">Licencia de conducir</p>
                    <p class="mt-1 text-sm font-semibold text-black">{{ licenseLabel() }}</p>
                    <p class="mt-1 text-xs text-black/70">{{ licenseHint() }}</p>
                  </div>
                </div>

                @if (!canStartLicenseUpload()) {
                  <app-dni-uploader (documentsUpdated)="onDocumentsUpdated()"></app-dni-uploader>
                } @else if (!isLevelComplete(2)) {
                  <div class="space-y-4">
                    <div
                      class="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-xs text-black/70"
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
                    class="mt-5 rounded-2xl border border-[#9be500] bg-[#f7ffd8] px-4 py-3 text-sm text-black"
                  >
                    Documentos cargados correctamente. Estamos terminando la revisión automática; si no
                    alcanza confianza alta, pasará a validación manual sin que pierdas el avance.
                  </div>
                }

                @if (isLevelComplete(2)) {
                  <div
                    class="mt-5 rounded-2xl border border-[#b8ff20] bg-[#f3ffd0] px-4 py-3 text-sm text-black"
                  >
                    Identidad y licencia verificadas. Puedes avanzar a prueba de vida.
                  </div>
                }
              }
            </article>

            <article class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-black">3. Prueba de vida</h3>
                  <p class="text-sm text-black/60">Confirmamos que el titular está presente en tiempo real.</p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="statusPillClass(isLevelComplete(3))">
                  {{ isLevelComplete(3) ? 'Completado' : 'Pendiente' }}
                </span>
              </div>

              @if (!canAccessLevel(3)) {
                <div class="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/70">
                  Este paso se habilita al completar la verificación documental.
                </div>
              } @else if (!isLevelComplete(3)) {
                @if (selfieProcessing()) {
                  <div class="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#f7fce9] px-4 py-4 text-sm text-black">
                    <svg class="h-5 w-5 animate-spin text-black/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Analizando prueba de vida... Esto puede tardar unos segundos.
                  </div>
                } @else if (showSelfieCapture()) {
                  <app-selfie-capture
                    (cancelled)="showSelfieCapture.set(false)"
                    (completed)="onSelfieCaptured($event)"
                  ></app-selfie-capture>
                } @else {
                  @if (selfieError()) {
                    <div class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      {{ selfieError() }}
                    </div>
                  }
                  <div class="space-y-3">
                    <p class="text-sm text-black/70">
                      Grabaremos un video corto de 3 segundos para confirmar tu identidad.
                      Asegurate de tener buena iluminación.
                    </p>
                    <button
                      (click)="showSelfieCapture.set(true)"
                      class="inline-flex items-center gap-2 rounded-2xl bg-[#0f0f0f] px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Iniciar prueba de vida
                    </button>
                  </div>
                }
              } @else {
                <div class="rounded-2xl border border-[#b8ff20] bg-[#f3ffd0] px-4 py-3 text-sm text-black">
                  Biometría validada exitosamente.
                </div>
              }
            </article>
          </section>

          @if (progressPercentage() === 100) {
            <section class="mt-8 rounded-3xl border border-[#b8ff20] bg-[#0f0f0f] p-6 text-white shadow-2xl">
              <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8ff20]">
                    Cuenta verificada
                  </p>
                  <h3 class="mt-1 text-2xl font-black text-white">Verificación completada</h3>
                  <p class="mt-2 text-sm text-white/80">
                    Tu perfil ya cumple el nivel de seguridad requerido para publicar y reservar.
                  </p>
                </div>
                <a
                  [routerLink]="returnUrl() || '/cars'"
                  class="inline-flex items-center justify-center rounded-2xl bg-[#b8ff20] px-5 py-3 text-sm font-black text-black transition hover:bg-[#cbff57]"
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
  private readonly faceService = inject(FaceVerificationService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly route = inject(ActivatedRoute);

  readonly profile = this.profileStore.profile;
  readonly userEmail = this.profileStore.userEmail;
  readonly dataLoading = signal(true);
  readonly returnUrl = signal<string | null>(null);
  readonly selfieProcessing = signal(false);
  readonly selfieError = signal<string | null>(null);
  readonly showSelfieCapture = signal(false);

  readonly verificationProgress = this.identityService.verificationProgress;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);
  readonly documents = this.verificationService.documents;

  readonly progressPercentage = computed(() => this.verificationProgress()?.progress_percentage ?? 0);
  readonly completedSteps = computed(() => {
    let total = 0;
    if (this.isLevelComplete(1)) total += 1;
    if (this.isLevelComplete(2)) total += 1;
    if (this.isLevelComplete(3)) total += 1;
    return total;
  });

  readonly currentStepNumber = computed(() => {
    if (!this.isLevelComplete(1)) return 1;
    if (!this.isLevelComplete(2)) return 2;
    return 3;
  });

  readonly momentumTitle = computed(() => {
    if (this.progressPercentage() >= 100) {
      return 'Cuenta lista para publicar y reservar';
    }
    if (!this.isLevelComplete(1)) {
      return 'Arranca fuerte: valida tu contacto';
    }
    if (!this.isLevelComplete(2) && (this.hasDniPair() || this.hasLicensePair())) {
      return 'Buen avance: tus documentos están en revisión';
    }
    if (!this.isLevelComplete(2)) {
      return 'Siguiente objetivo: identidad y licencia';
    }
    if (!this.isLevelComplete(3)) {
      return 'Último sprint: completa la prueba de vida';
    }
    return 'Tu verificación está progresando';
  });

  readonly momentumHint = computed(() => {
    if (this.progressPercentage() >= 100) {
      return 'Completaste el proceso de seguridad. Ya puedes operar sin bloqueos en AutoRentar.';
    }
    if (!this.isLevelComplete(1)) {
      return 'Con email y teléfono verificados activas notificaciones críticas y proteges tu cuenta.';
    }
    if (!this.isLevelComplete(2)) {
      return 'Sube DNI y licencia con buena luz. Si la IA no alcanza confianza alta, pasa a revisión manual.';
    }
    if (!this.isLevelComplete(3)) {
      return 'La selfie final confirma presencia real del titular y cierra el proceso.';
    }
    return 'Sigue así, estás cerca de completar todo.';
  });

  readonly nextStepHeadline = computed(() => {
    if (this.progressPercentage() >= 100) {
      return 'Objetivo cumplido';
    }
    if (!this.isLevelComplete(1)) {
      return 'Próximo paso: confirmar contacto';
    }
    if (!this.isLevelComplete(2)) {
      return 'Próximo paso: cargar documentación';
    }
    return 'Próximo paso: prueba de vida';
  });

  readonly visualSlots: VerificationVisualSlot[] = [
    {
      id: 'security',
      title: 'Identidad protegida',
      hint: 'Tus datos se validan y protegen durante todo el proceso.',
      imageUrl: '/assets/verification/identity-protected.jpg',
    },
    {
      id: 'documents',
      title: 'Validación documental',
      hint: 'Frente y dorso pasan control automático con respaldo manual.',
      imageUrl: '/assets/verification/document-validation.jpg',
    },
    {
      id: 'trust',
      title: 'Confianza activa',
      hint: 'Al completar pasos, tu cuenta queda lista para operar.',
      imageUrl: '/assets/verification/trust-active.jpg',
    },
  ];

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
      return 'border-[#b8ff20] bg-[#f3ffd0] text-black';
    }

    if (state === 'active') {
      return 'border-black bg-black text-white shadow-lg';
    }

    return 'border-black/10 bg-white text-black/70';
  }

  stepBadgeClass(state: StepState): string {
    if (state === 'completed') {
      return 'bg-[#b8ff20] text-black';
    }

    if (state === 'active') {
      return 'bg-[#b8ff20] text-black';
    }

    return 'bg-black/10 text-black/60';
  }

  statusPillClass(completed: boolean): string {
    return completed
      ? 'bg-[#cfff69] text-black'
      : 'bg-black/10 text-black/70';
  }

  documentCardClass(state: StepState): string {
    if (state === 'completed') {
      return 'border-[#b8ff20] bg-[#f3ffd0]';
    }

    if (state === 'active') {
      return 'border-black/30 bg-[#f7fce9]';
    }

    return 'border-black/10 bg-black/[0.03]';
  }

  stepStateLabel(state: StepState): string {
    if (state === 'completed') {
      return 'Completado';
    }
    if (state === 'active') {
      return 'En curso';
    }
    return 'Bloqueado';
  }

  async onDocumentsUpdated(): Promise<void> {
    await this.refreshVerificationContext();
    this.trackKycView('kyc_documents_updated');
  }

  async onLicenseVerificationComplete(): Promise<void> {
    await this.refreshVerificationContext();
    this.trackKycView('kyc_license_upload_completed');
  }

  async onSelfieCaptured(videoPath: string): Promise<void> {
    this.showSelfieCapture.set(false);
    this.selfieProcessing.set(true);
    this.selfieError.set(null);

    try {
      // Find document front URL from loaded documents
      const docFront = this.documents().find(
        (d) => d.kind === 'gov_id_front' && d.storage_path,
      );

      if (!docFront?.storage_path) {
        throw new Error('No se encontró la foto del documento de identidad. Verifica que hayas subido el DNI.');
      }

      await this.faceService.verifyFace(videoPath, docFront.storage_path);

      // Success — refresh progress to show Level 3 complete
      await this.refreshVerificationContext();
      this.trackKycView('kyc_selfie_verified');
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No pudimos verificar tu identidad facial. Intenta de nuevo.';
      this.selfieError.set(message);
    } finally {
      this.selfieProcessing.set(false);
    }
  }

  clearSelfieError(): void {
    this.selfieError.set(null);
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
