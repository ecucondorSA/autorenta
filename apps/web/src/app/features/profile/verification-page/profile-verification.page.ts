import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';

import { RouterModule, ActivatedRoute } from '@angular/router';

import { ProfileStore } from '@core/stores/profile.store';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { VerificationService } from '@core/services/verification/verification.service';
import { EmailVerificationComponent } from '../../../shared/components/email-verification/email-verification.component';
import { PhoneVerificationComponent } from '../../../shared/components/phone-verification/phone-verification.component';
import { SelfieCaptureComponent } from '../../../shared/components/selfie-capture/selfie-capture.component';
import { LicenseUploaderComponent } from './components/license-uploader.component';
import { DniUploaderComponent } from './components/dni-uploader.component';

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
    <div class="min-h-screen bg-surface-base pb-20">
      <!-- Minimal Header -->
      <nav
        class="fixed top-0 left-0 w-full z-[60] bg-surface-base border-b border-border-subtle h-16"
      >
        <div class="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
          <a
            [routerLink]="returnUrl() || '/profile'"
            class="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <span class="text-sm font-semibold text-text-primary">Verificación de Cuenta</span>
          <div class="w-9"></div>
        </div>
      </nav>

      <main class="max-w-md mx-auto px-4 pt-24 pb-20">

        <!-- Loading State -->
        @if (dataLoading()) {
          <div class="space-y-6 animate-pulse">
            <div class="flex items-center justify-between">
              <div>
                <div class="h-6 w-32 bg-slate-200 rounded"></div>
                <div class="h-3 w-20 bg-slate-100 rounded mt-2"></div>
              </div>
              <div class="w-12 h-12 bg-slate-200 rounded-full"></div>
            </div>
            <div class="h-24 bg-slate-100 rounded-2xl"></div>
            <div class="h-24 bg-slate-100 rounded-2xl"></div>
          </div>
        }

        @if (!dataLoading()) {
          <!-- Progress Header -->
          <div class="flex items-center justify-between mb-8">
            <div class="flex flex-col">
              <h1 class="text-xl font-bold text-text-primary">{{ currentStepTitle() }}</h1>
              <p class="text-xs text-text-secondary">Paso {{ currentStepNumber() }} de 3</p>
            </div>
            <div class="w-12 h-12 relative flex items-center justify-center">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  class="text-border-default"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" stroke-width="3"
                />
                <path
                  class="text-cta-default transition-all duration-1000 ease-out"
                  [attr.stroke-dasharray]="progressPercentage() + ', 100'"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                />
              </svg>
              <span class="absolute text-[10px] font-bold text-text-primary">{{ progressPercentage() }}%</span>
            </div>
          </div>

          <!-- STEP 1: Contact -->
          @if (!isLevelComplete(1)) {
            <!-- Step 1 Active: Show email + phone -->
            <div class="animate-fade-in">
              <app-email-verification></app-email-verification>
              <div class="mt-4"></div>
              <app-phone-verification></app-phone-verification>
            </div>
          } @else {
            <!-- Step 1 Complete: Green summary -->
            <div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-emerald-900">Contacto verificado</p>
                    <p class="text-xs text-emerald-700">{{ userEmail() }}</p>
                  </div>
                </div>
                <span class="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Listo</span>
              </div>
            </div>

            <!-- STEP 2: Documents -->
            @if (canAccessLevel(2) && !isLevelComplete(2)) {
              <div class="animate-fade-in space-y-6">
                @if (!isDniVerified()) {
                  <div>
                    <h2 class="text-lg font-semibold text-text-primary mb-1">Documento de Identidad</h2>
                    <p class="text-sm text-text-secondary mb-4">Sube una foto clara de tu DNI.</p>
                    <app-dni-uploader></app-dni-uploader>
                  </div>
                } @else {
                  <div>
                    <h2 class="text-lg font-semibold text-text-primary mb-1">Licencia de Conducir</h2>
                    <p class="text-sm text-text-secondary mb-4">Requerido para poder conducir.</p>
                    <app-license-uploader
                      [hideCountrySelector]="false"
                      (verificationCompleted)="onLicenseVerificationComplete()"
                    ></app-license-uploader>
                  </div>
                }
              </div>
            }

            <!-- STEP 2 Complete -->
            @if (isLevelComplete(2)) {
              <div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-emerald-900">Documentos verificados</p>
                    <p class="text-xs text-emerald-700">DNI y licencia confirmados</p>
                  </div>
                </div>
              </div>

              <!-- STEP 3: Selfie -->
              @if (canAccessLevel(3) && !isLevelComplete(3)) {
                <div class="animate-fade-in">
                  <h2 class="text-lg font-semibold text-text-primary mb-1">Prueba de Vida</h2>
                  <p class="text-sm text-text-secondary mb-4">Validaremos que eres tú en tiempo real.</p>
                  <app-selfie-capture></app-selfie-capture>
                </div>
              }
            }
          }

          <!-- Success State -->
          @if (progressPercentage() === 100) {
            <div class="fixed inset-0 z-[60] bg-surface-base flex flex-col items-center justify-center p-6 animate-scale-up">
              <div class="w-24 h-24 rounded-full bg-success-100 flex items-center justify-center text-success-600 mb-6 shadow-lg animate-bounce">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 class="text-3xl font-bold text-text-primary mb-2 text-center">¡Estás Verificado!</h2>
              <p class="text-text-secondary text-center max-w-xs mb-10">Ya puedes disfrutar de la experiencia completa de AutoRenta.</p>
              <a
                [routerLink]="returnUrl() || '/cars'"
                class="w-full max-w-sm py-4 bg-cta-default text-white font-bold rounded-2xl shadow-xl hover:bg-cta-hover transition-transform active:scale-95 text-center flex items-center justify-center gap-2"
              >
                Continuar
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          }
        }
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Custom focus ring */
      button:focus-visible {
        outline: none;
        box-shadow:
          0 0 0 2px var(--surface-base),
          0 0 0 4px var(--cta-default);
      }

      /* Respect reduced motion */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `,
  ],
})
export class ProfileVerificationPage implements OnInit, OnDestroy {
  private readonly profileStore = inject(ProfileStore);
  private readonly identityService = inject(IdentityLevelService);
  private readonly verificationService = inject(VerificationService);
  private readonly route = inject(ActivatedRoute);

  readonly profile = this.profileStore.profile;
  readonly userEmail = this.profileStore.userEmail;
  readonly dataLoading = signal(true);

  // Return URL from query params (to navigate back after verification)
  readonly returnUrl = signal<string | null>(null);

  // Get verification progress data
  readonly verificationProgress = this.identityService.verificationProgress;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);

  // Progress percentage from service
  readonly progressPercentage = computed(() => {
    return this.verificationProgress()?.progress_percentage ?? 0;
  });

  // Current step title based on progress
  readonly currentStepTitle = computed(() => {
    if (this.isLevelComplete(2)) return 'Prueba de Vida';
    if (this.isLevelComplete(1)) return 'Documentos';
    return 'Contacto';
  });

  // Current step number (first incomplete step)
  readonly currentStepNumber = computed(() => {
    if (!this.isLevelComplete(1)) return 1;
    if (!this.isLevelComplete(2)) return 2;
    return 3;
  });

  async ngOnInit(): Promise<void> {
    // Extract query params
    const returnUrlParam = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrlParam) {
      this.returnUrl.set(returnUrlParam);
    }

    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }

    void this.verificationService.loadDocuments();

    // Load verification progress
    try {
      await this.identityService.getVerificationProgress();
      await this.identityService.subscribeToRealtimeUpdates();
    } catch (e) {
      console.error('Failed to load verification progress:', e);
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

    switch (level) {
      case 1:
        return req.level_1?.completed ?? false;
      case 2:
        return req.level_2?.completed ?? false;
      case 3:
        return req.level_3?.completed ?? false;
      default:
        return false;
    }
  }

  canAccessLevel(level: number): boolean {
    if (level === 1) return true;
    if (level === 2) return this.verificationProgress()?.can_access_level_2 ?? false;
    if (level === 3) return this.verificationProgress()?.can_access_level_3 ?? false;
    return false;
  }

  isDniVerified(): boolean {
    return this.requirements()?.level_2?.document_verified ?? false;
  }

  onLicenseVerificationComplete(): void {
    // Refresh progress after license verification
    void this.identityService.getVerificationProgress();
  }
}
