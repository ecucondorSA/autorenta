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
      <nav class="sticky top-0 z-20 bg-surface-base/80 backdrop-blur-md border-b border-border-subtle">
        <div class="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <a routerLink="/profile" class="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <span class="text-sm font-semibold text-text-primary">Verificación de Cuenta</span>
          <div class="w-9"></div> <!-- Spacer for balance -->
        </div>
      </nav>

      <main class="max-w-2xl mx-auto px-4 pt-8">
        <!-- Hero Section -->
        <div class="mb-10 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cta-default/10 text-cta-default mb-4 relative">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            @if (progressPercentage() === 100) {
              <div class="absolute -right-1 -bottom-1 bg-success-500 text-white rounded-full p-1 border-2 border-surface-base">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
              </div>
            }
          </div>
          <h1 class="text-2xl font-bold text-text-primary mb-2">Construyamos confianza</h1>
          <p class="text-text-secondary max-w-sm mx-auto">
            Completa estos 3 pasos para verificar tu identidad y acceder a todas las funciones.
          </p>
        </div>

        <!-- Vertical Stepper -->
        <div class="relative space-y-0">
          <!-- Vertical Line -->
          <div class="absolute left-[19px] top-8 bottom-8 w-px bg-border-subtle -z-10"></div>

          <!-- STEP 1: Contact -->
          <div class="relative pb-6 group">
            <div class="flex gap-4">
              <!-- Indicator -->
              <div class="flex-shrink-0 mt-1">
                <div class="w-10 h-10 rounded-full border-2 border-surface-base flex items-center justify-center transition-all duration-300 shadow-sm"
                  [class]="getStepCircleClass(1)">
                  @if (isLevelComplete(1)) {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  } @else {
                    <span class="text-sm font-bold">1</span>
                  }
                </div>
              </div>

              <!-- Content Card -->
              <div class="flex-1 transition-all duration-300">
                <div 
                  class="rounded-2xl overflow-hidden transition-all duration-300"
                  [class.bg-surface-raised]="expandedSections().has(1)"
                  [class.border]="expandedSections().has(1)"
                  [class.border-border-subtle]="expandedSections().has(1)"
                  [class.shadow-sm]="expandedSections().has(1)"
                >
                  <button (click)="toggleSection(1)" class="w-full px-4 py-3 flex items-center justify-between text-left group-hover:bg-surface-hover/30 rounded-xl transition-colors">
                    <div>
                      <h3 class="font-semibold text-text-primary text-base">Datos de Contacto</h3>
                      @if (!expandedSections().has(1)) {
                        <p class="text-xs text-text-secondary mt-0.5">Email y teléfono celular</p>
                      }
                    </div>
                    @if (isLevelComplete(1)) {
                      <div class="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </div>
                    } @else {
                      <svg class="w-5 h-5 text-text-muted transition-transform duration-300" [class.rotate-180]="expandedSections().has(1)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    }
                  </button>

                  <div class="transition-all duration-300 ease-out overflow-hidden"
                    [class]="expandedSections().has(1) ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'">
                    <div class="px-4 pb-6 pt-2 space-y-4">
                      <app-email-verification></app-email-verification>
                      <app-phone-verification></app-phone-verification>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 2: Documents -->
          <div class="relative pb-6 group" [class.opacity-50]="!canAccessLevel(2)">
            <div class="flex gap-4">
              <!-- Indicator -->
              <div class="flex-shrink-0 mt-1">
                <div class="w-10 h-10 rounded-full border-2 border-surface-base flex items-center justify-center transition-colors duration-300 shadow-sm"
                  [class]="getStepCircleClass(2)">
                  @if (isLevelComplete(2)) {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  } @else if (!canAccessLevel(2)) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  } @else {
                    <span class="text-sm font-bold">2</span>
                  }
                </div>
              </div>

              <!-- Content Card -->
              <div class="flex-1 transition-all duration-300">
                <div 
                  class="rounded-2xl overflow-hidden transition-all duration-300"
                  [class.bg-surface-raised]="expandedSections().has(2) && canAccessLevel(2)"
                  [class.border]="expandedSections().has(2) && canAccessLevel(2)"
                  [class.border-border-subtle]="expandedSections().has(2) && canAccessLevel(2)"
                  [class.shadow-sm]="expandedSections().has(2) && canAccessLevel(2)"
                >
                  <button (click)="canAccessLevel(2) && toggleSection(2)" 
                    [disabled]="!canAccessLevel(2)"
                    class="w-full px-4 py-3 flex items-center justify-between text-left group-hover:bg-surface-hover/30 rounded-xl transition-colors disabled:cursor-not-allowed">
                    <div>
                      <h3 class="font-semibold text-text-primary text-base">Documentos Oficiales</h3>
                      @if (!expandedSections().has(2)) {
                        <p class="text-xs text-text-secondary mt-0.5">DNI y Licencia de Conducir</p>
                      }
                    </div>
                    @if (isLevelComplete(2)) {
                      <div class="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </div>
                    } @else if (canAccessLevel(2)) {
                      <svg class="w-5 h-5 text-text-muted transition-transform duration-300" [class.rotate-180]="expandedSections().has(2)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    }
                  </button>

                  <div class="transition-all duration-300 ease-out overflow-hidden"
                    [class]="expandedSections().has(2) && canAccessLevel(2) ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'">
                    <div class="px-4 pb-6 pt-2 space-y-8">
                      
                      <!-- DNI Block -->
                      <div class="space-y-3">
                        <div class="flex items-center justify-between gap-2">
                          <h4 class="text-xs font-bold text-text-muted uppercase tracking-wider truncate">Documento de Identidad</h4>
                          @if (isDniVerified()) {
                            <span class="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style="background-color: #22c55e; color: white;">
                              ✓ VERIFICADO
                            </span>
                          } @else if (isDniInReview()) {
                            <span class="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style="background-color: #eab308; color: black;">
                              ⏳ EN REVISIÓN
                            </span>
                          } @else {
                            <span class="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style="background-color: #ef4444; color: white;">
                              ⚠ PENDIENTE
                            </span>
                          }
                        </div>
                        @if (!isDniVerified()) {
                          <app-dni-uploader></app-dni-uploader>
                        }
                      </div>

                      <div class="h-px bg-border-subtle w-full"></div>

                      <!-- License Block -->
                      <div class="space-y-3">
                        <div class="flex items-center justify-between gap-2">
                          <h4 class="text-xs font-bold text-text-muted uppercase tracking-wider truncate">Licencia de Conducir</h4>
                          @if (isLicenseVerified()) {
                            <span class="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style="background-color: #22c55e; color: white;">
                              ✓ VERIFICADO
                            </span>
                          } @else if (isLicenseInReview()) {
                            <span class="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style="background-color: #eab308; color: black;">
                              ⏳ EN REVISIÓN
                            </span>
                          } @else {
                            <span class="flex-shrink-0 whitespace-nowrap flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full" style="background-color: #ef4444; color: white;">
                              ⚠ PENDIENTE
                            </span>
                          }
                        </div>
                        @if (!isLicenseVerified()) {
                          <app-license-uploader [hideCountrySelector]="false"></app-license-uploader>
                        }
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 3: Identity -->
          <div class="relative pb-6 group" [class.opacity-50]="!canAccessLevel(3)">
            <div class="flex gap-4">
              <!-- Indicator -->
              <div class="flex-shrink-0 mt-1">
                <div class="w-10 h-10 rounded-full border-2 border-surface-base flex items-center justify-center transition-colors duration-300 shadow-sm"
                  [class]="getStepCircleClass(3)">
                  @if (isLevelComplete(3)) {
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  } @else if (!canAccessLevel(3)) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  } @else {
                    <span class="text-sm font-bold">3</span>
                  }
                </div>
              </div>

              <!-- Content Card -->
              <div class="flex-1 transition-all duration-300">
                <div 
                  class="rounded-2xl overflow-hidden transition-all duration-300"
                  [class.bg-surface-raised]="expandedSections().has(3) && canAccessLevel(3)"
                  [class.border]="expandedSections().has(3) && canAccessLevel(3)"
                  [class.border-border-subtle]="expandedSections().has(3) && canAccessLevel(3)"
                  [class.shadow-sm]="expandedSections().has(3) && canAccessLevel(3)"
                >
                  <button (click)="canAccessLevel(3) && toggleSection(3)" 
                    [disabled]="!canAccessLevel(3)"
                    class="w-full px-4 py-3 flex items-center justify-between text-left group-hover:bg-surface-hover/30 rounded-xl transition-colors disabled:cursor-not-allowed">
                    <div>
                      <h3 class="font-semibold text-text-primary text-base">Prueba de Vida</h3>
                      @if (!expandedSections().has(3)) {
                        <p class="text-xs text-text-secondary mt-0.5">Video selfie para validar identidad</p>
                      }
                    </div>
                    @if (isLevelComplete(3)) {
                      <div class="w-6 h-6 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </div>
                    } @else if (canAccessLevel(3)) {
                      <svg class="w-5 h-5 text-text-muted transition-transform duration-300" [class.rotate-180]="expandedSections().has(3)" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    }
                  </button>

                  <div class="transition-all duration-300 ease-out overflow-hidden"
                    [class]="expandedSections().has(3) && canAccessLevel(3) ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'">
                    <div class="px-4 pb-6 pt-2">
                      <app-selfie-capture></app-selfie-capture>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Success Message -->
        @if (progressPercentage() === 100) {
          <div class="fixed bottom-0 left-0 right-0 p-4 bg-surface-base border-t border-border-subtle z-30 animate-slide-up">
            <div class="max-w-2xl mx-auto flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center text-success-600">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <p class="font-semibold text-text-primary">¡Verificación Completa!</p>
                  <p class="text-xs text-text-secondary">Ya puedes alquilar y publicar autos.</p>
                </div>
              </div>
              <a routerLink="/cars" class="px-6 py-2.5 bg-cta-default text-white font-medium rounded-xl hover:bg-cta-hover transition-colors shadow-lg">
                Comenzar
              </a>
            </div>
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
  private readonly route = inject(ActivatedRoute);

  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;

  // Contextual message based on reason query param
  readonly verificationReason = signal<string | null>(null);

  // Track expanded sections
  readonly expandedSections = signal<Set<number>>(new Set([1]));

  // Get verification progress data
  readonly verificationProgress = this.identityService.verificationProgress;
  readonly identityLevel = this.identityService.identityLevel;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);

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
        'Para poder alquilar un auto, necesitas completar la verificacion de tu identidad.',
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
    const identity = this.identityLevel();
    const verified = this.isDniVerified();
    if (verified) return false;
    return !!(identity?.document_front_url || identity?.document_back_url);
  }

  isLicenseVerified(): boolean {
    return this.requirements()?.level_2?.driver_license_verified ?? false;
  }

  isLicenseInReview(): boolean {
    // Licencia subida pero no verificada
    const identity = this.identityLevel();
    const verified = this.isLicenseVerified();
    if (verified) return false;
    return !!identity?.driver_license_url;
  }

  getProgressLabel(): string {
    const progress = this.progressPercentage();
    if (progress === 100) return 'Verificacion completa';
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
}
