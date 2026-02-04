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
import { IonicModule } from '@ionic/angular';

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
    IonicModule,
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
            routerLink="/profile"
            class="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </a>
          <span class="text-sm font-semibold text-text-primary">Verificación de Cuenta</span>
          <div class="w-9"></div>
          <!-- Spacer for balance -->
        </div>
      </nav>

      <main class="max-w-md mx-auto px-4 pt-24 pb-20">
        <!-- Progress Header (Compact) -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex flex-col">
            <h1 class="text-xl font-bold text-text-primary">
              @if (isLevelComplete(2)) {
                Prueba de Vida
              } @else if (isLevelComplete(1)) {
                Documentos
              } @else {
                Contacto
              }
            </h1>
            <p class="text-xs text-text-secondary">Paso {{ completedSteps() + 1 }} de 3</p>
          </div>
          <div class="w-12 h-12 relative flex items-center justify-center">
            <svg class="w-full h-full -rotate-90 text-surface-raised" viewBox="0 0 36 36">
              <!-- Background Circle -->
              <path
                class="text-border-default"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              />
              <!-- Progress Circle -->
              <path
                class="text-cta-default transition-all duration-1000 ease-out"
                [attr.stroke-dasharray]="progressPercentage() + ', 100'"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
              />
            </svg>
            <span class="absolute text-[10px] font-bold text-text-primary"
              >{{ progressPercentage() }}%</span
            >
          </div>
        </div>

        <!-- STEP 1: Contact (Edit Mode or Hidden) -->
        @if (!isLevelComplete(1) || expandedSections().has(1)) {
          <div class="animate-fade-in">
            <app-email-verification></app-email-verification>
            <div class="mt-4"></div>
            <app-phone-verification></app-phone-verification>
          </div>
        }

        <!-- STEP 2: Documents (Focus Mode) -->
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

        <!-- STEP 3: Selfie (Focus Mode) -->
        @if (canAccessLevel(3) && !isLevelComplete(3)) {
          <div class="animate-fade-in">
            <h2 class="text-lg font-semibold text-text-primary mb-1">Prueba de Vida</h2>
            <p class="text-sm text-text-secondary mb-4">Validaremos que eres tú en tiempo real.</p>
            <app-selfie-capture></app-selfie-capture>
          </div>
        }

        <!-- Success State -->
        @if (progressPercentage() === 100) {
          <div
            class="fixed inset-0 z-[60] bg-surface-base flex flex-col items-center justify-center p-6 animate-scale-up"
          >
            <div
              class="w-24 h-24 rounded-full bg-success-100 flex items-center justify-center text-success-600 mb-6 shadow-lg animate-bounce"
            >
              <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 class="text-3xl font-bold text-text-primary mb-2 text-center">
              ¡Estás Verificado!
            </h2>
            <p class="text-text-secondary text-center max-w-xs mb-10">
              Ya puedes disfrutar de la experiencia completa de AutoRenta.
            </p>

            <a
              routerLink="/cars"
              class="w-full max-w-sm py-4 bg-cta-default text-white font-bold rounded-2xl shadow-xl hover:bg-cta-hover transition-transform active:scale-95 text-center flex items-center justify-center gap-2"
            >
              Explorar Autos
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        }
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Smooth grid animation for collapsible sections */
      .grid-rows-\\[0fr\\] > * {
        min-height: 0;
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
  readonly loading = this.profileStore.loading;

  // Contextual message based on reason query param
  readonly verificationReason = signal<string | null>(null);

  // Track expanded sections
  readonly expandedSections = signal<Set<number>>(new Set([1]));

  // Get verification progress data
  readonly verificationProgress = this.identityService.verificationProgress;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);
  readonly userDocuments = this.verificationService.documents;

  // Progress percentage from service
  readonly progressPercentage = computed(() => {
    return this.verificationProgress()?.progress_percentage ?? 0;
  });

  // Count completed steps
  readonly completedSteps = computed(() => {
    let count = 0;
    if (this.isLevelComplete(1)) count++;
    if (this.isLevelComplete(2)) count++;
    if (this.isLevelComplete(3)) count++;
    return count;
  });

  async ngOnInit(): Promise<void> {
    // Check for contextual message based on reason
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason) {
      this.setContextualMessage(reason);
    }

    if (!this.profile()) {
      void this.profileStore.loadProfile();
    }

    void this.verificationService.loadDocuments();

    // Load verification progress
    try {
      await this.identityService.getVerificationProgress();
      this.autoExpandCurrentLevel();

      // Subscribe to realtime updates for automatic UI refresh
      await this.identityService.subscribeToRealtimeUpdates();
    } catch (e) {
      console.error('Failed to load verification progress:', e);
    }
  }

  ngOnDestroy(): void {
    // Cleanup realtime subscription
    this.identityService.unsubscribeFromRealtime();
  }

  private setContextualMessage(reason: string): void {
    const messages: Record<string, string> = {
      booking_verification_required:
        'Para poder alquilar un auto, necesitas completar la verificación de tu identidad.',
      email_verification_required:
        'Verifica tu email para acceder a todas las funciones de la plataforma.',
      verification_check_failed:
        'Hubo un problema verificando tu cuenta. Por favor, completa los pasos pendientes.',
    };

    this.verificationReason.set(messages[reason] || null);
  }

  private autoExpandCurrentLevel(): void {
    const sections = new Set<number>();

    // Always show the current active level
    if (!this.isLevelComplete(1)) {
      sections.add(1);
    } else if (!this.isLevelComplete(2) && this.canAccessLevel(2)) {
      sections.add(2);
    } else if (!this.isLevelComplete(3) && this.canAccessLevel(3)) {
      sections.add(3);
    }

    this.expandedSections.set(sections);
  }

  toggleSection(level: number): void {
    if (!this.canAccessLevel(level)) return;

    const sections = new Set(this.expandedSections());
    if (sections.has(level)) {
      sections.delete(level);
    } else {
      sections.add(level);
    }
    this.expandedSections.set(sections);
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

  isEmailVerified(): boolean {
    return this.requirements()?.level_1?.email_verified ?? false;
  }

  isPhoneVerified(): boolean {
    return this.requirements()?.level_1?.phone_verified ?? false;
  }

  isDniVerified(): boolean {
    return this.requirements()?.level_2?.document_verified ?? false;
  }

  isDniInReview(): boolean {
    // Documento subido pero no verificado
    const verified = this.isDniVerified();
    if (verified) return false;
    return this.userDocuments().some((doc) => ['gov_id_front', 'gov_id_back'].includes(doc.kind));
  }

  isLicenseVerified(): boolean {
    return this.requirements()?.level_2?.driver_license_verified ?? false;
  }

  isLicenseInReview(): boolean {
    // Licencia subida pero no verificada
    const verified = this.isLicenseVerified();
    if (verified) return false;
    return this.userDocuments().some((doc) =>
      ['driver_license', 'license_front', 'license_back'].includes(doc.kind),
    );
  }

  getProgressLabel(): string {
    const progress = this.progressPercentage();
    if (progress === 100) return 'Verificación completa';
    if (progress >= 80) return 'Casi terminado';
    if (progress >= 50) return 'Buen progreso';
    if (progress > 0) return 'En progreso';
    return 'Sin verificar';
  }

  getProgressLineWidth(): string {
    const completed = this.completedSteps();
    if (completed === 0) return '0%';
    if (completed === 1) return '33%';
    if (completed === 2) return '66%';
    return '100%';
  }

  getStatusLabel(level: number): string {
    if (this.isLevelComplete(level)) return 'Completado';
    if (!this.canAccessLevel(level)) return 'Bloqueado';
    return 'En progreso';
  }

  getStatusBadgeClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'bg-success-100 text-success-700';
    }
    if (!this.canAccessLevel(level)) {
      return 'bg-surface-hover text-text-muted';
    }
    return 'bg-cta-default/10 text-cta-default';
  }

  getCardClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'border-success-200 bg-success-50/30';
    }
    if (!this.canAccessLevel(level)) {
      return 'border-border-subtle';
    }
    // Active level - subtle highlight
    return 'border-cta-default/30 shadow-sm';
  }

  getIconContainerClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'bg-success-100 text-success-600';
    }
    if (!this.canAccessLevel(level)) {
      return 'bg-surface-hover text-text-muted';
    }
    return 'bg-cta-default/10 text-cta-default';
  }

  getStepCircleClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'bg-success-500 text-white focus:ring-success-500';
    }
    if (!this.canAccessLevel(level)) {
      return 'bg-surface-hover text-text-muted border-2 border-border-subtle';
    }
    // Current active step
    if (this.isCurrentStep(level)) {
      return 'bg-cta-default text-cta-text focus:ring-cta-default';
    }
    return 'bg-surface-raised text-text-secondary border-2 border-border-default focus:ring-cta-default';
  }

  private isCurrentStep(level: number): boolean {
    // Current step is the first incomplete step that is accessible
    if (level === 1 && !this.isLevelComplete(1)) return true;
    if (
      level === 2 &&
      this.isLevelComplete(1) &&
      !this.isLevelComplete(2) &&
      this.canAccessLevel(2)
    )
      return true;
    if (
      level === 3 &&
      this.isLevelComplete(2) &&
      !this.isLevelComplete(3) &&
      this.canAccessLevel(3)
    )
      return true;
    return false;
  }
  onLicenseVerificationComplete(): void {
    // Auto-advance to next step (Level 3 - Selfie)
    // We add a small delay to allow the store to update via realtime/optimistic updates
    setTimeout(() => {
      if (this.canAccessLevel(3)) {
        const sections = new Set(this.expandedSections());
        sections.add(3); // Open Selfie
        sections.delete(2); // Close Documents (optional, reduces clutter)
        this.expandedSections.set(sections);
      }
    }, 1500);
  }
}
