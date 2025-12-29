import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';

import { RouterModule, ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { VerificationProgressComponent } from '../../../shared/components/verification-progress/verification-progress.component';
import { EmailVerificationComponent } from '../../../shared/components/email-verification/email-verification.component';
import { PhoneVerificationComponent } from '../../../shared/components/phone-verification/phone-verification.component';
import { SelfieCaptureComponent } from '../../../shared/components/selfie-capture/selfie-capture.component';
import { ProfileStore } from '@core/stores/profile.store';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { LicenseUploaderComponent } from './components/license-uploader.component';
import { DniUploaderComponent } from './components/dni-uploader.component';

@Component({
  selector: 'app-profile-verification',
  standalone: true,
  imports: [
    RouterModule,
    IonicModule,
    VerificationProgressComponent,
    EmailVerificationComponent,
    PhoneVerificationComponent,
    SelfieCaptureComponent,
    LicenseUploaderComponent,
    DniUploaderComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-surface-base">
      <div class="py-4 px-4 max-w-3xl mx-auto pb-24">
        <!-- Compact Header -->
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-text-primary">Verificación</h1>
            <p class="text-xs text-text-secondary">Completa los pasos para desbloquear funciones</p>
          </div>
          <a routerLink="/profile" class="text-sm text-cta-default hover:underline">← Volver</a>
        </div>

        <!-- Contextual Message -->
        @if (verificationReason()) {
          <div class="mb-4 p-4 rounded-lg bg-warning-bg border border-warning-border">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-warning-strong flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p class="text-sm text-warning-strong font-medium">{{ verificationReason() }}</p>
            </div>
          </div>
        }
    
        <!-- Progress Component -->
        <div class="mb-4">
          <app-verification-progress></app-verification-progress>
        </div>
    
        <!-- Verification Steps -->
        <div class="space-y-3">
          <!-- LEVEL 1: Contact -->
          <div
            class="rounded-xl border overflow-hidden transition-all duration-300"
            [class]="getStepContainerClass(1)"
            >
            <!-- Header - Clickable -->
            <button
              (click)="toggleSection(1)"
              class="w-full p-4 flex items-center justify-between text-left transition-colors"
              [class]="getStepHeaderClass(1)"
              >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  [class]="getStepBadgeClass(1)"
                  >
                  @if (isLevelComplete(1)) {
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                        />
                    </svg>
                  }
                  @if (!isLevelComplete(1)) {
                    <span>1</span>
                  }
                </div>
                <div>
                  <h3 class="font-semibold text-text-primary">Contacto Básico</h3>
                  <p class="text-xs text-text-secondary">Email y teléfono</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-1 rounded-full" [class]="getStatusBadgeClass(1)">
                  {{ getStatusLabel(1) }}
                </span>
                <svg
                  class="w-5 h-5 text-text-muted transition-transform duration-200"
                  [class.rotate-180]="expandedSections().has(1)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                    />
                </svg>
              </div>
            </button>
    
            <!-- Content - Collapsible -->
            <div
              class="overflow-hidden transition-all duration-300"
              [class]="
                expandedSections().has(1) ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              "
              >
              <div class="p-4 pt-0 space-y-4 border-t border-border-default/50">
                <app-email-verification></app-email-verification>
                <app-phone-verification></app-phone-verification>
              </div>
            </div>
          </div>
    
          <!-- Connector Line -->
          <div class="flex justify-center">
            <div
              class="w-0.5 h-4 rounded-full"
              [class]="isLevelComplete(1) ? 'bg-success-light' : 'bg-border-default'"
            ></div>
          </div>
    
          <!-- LEVEL 2: Documents -->
          <div
            class="rounded-xl border overflow-hidden transition-all duration-300"
            [class]="getStepContainerClass(2)"
            >
            <!-- Header -->
            <button
              (click)="toggleSection(2)"
              [disabled]="!canAccessLevel(2)"
              class="w-full p-4 flex items-center justify-between text-left transition-colors disabled:cursor-not-allowed"
              [class]="getStepHeaderClass(2)"
              >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  [class]="getStepBadgeClass(2)"
                  >
                  @if (isLevelComplete(2)) {
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                        />
                    </svg>
                  }
                  @if (!isLevelComplete(2) && !canAccessLevel(2)) {
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                  }
                  @if (!isLevelComplete(2) && canAccessLevel(2)) {
                    <span>2</span>
                  }
                </div>
                <div>
                  <h3
                    class="font-semibold"
                    [class]="canAccessLevel(2) ? 'text-text-primary' : 'text-text-muted'"
                    >
                    Documentación
                  </h3>
                  <p
                    class="text-xs"
                    [class]="canAccessLevel(2) ? 'text-text-secondary' : 'text-text-muted'"
                    >
                    DNI y licencia de conducir
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-1 rounded-full" [class]="getStatusBadgeClass(2)">
                  {{ getStatusLabel(2) }}
                </span>
                @if (canAccessLevel(2)) {
                  <svg
                    class="w-5 h-5 text-text-muted transition-transform duration-200"
                    [class.rotate-180]="expandedSections().has(2)"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                      />
                  </svg>
                }
              </div>
            </button>
    
            <!-- Content -->
            <div
              class="overflow-hidden transition-all duration-300"
              [class]="
                expandedSections().has(2) && canAccessLevel(2)
                  ? 'max-h-[1200px] opacity-100'
                  : 'max-h-0 opacity-0'
              "
              >
              <div class="p-4 pt-0 space-y-4 border-t border-border-default/50">
                <!-- DNI Section -->
                <div class="p-4 rounded-lg bg-surface-secondary/50">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">🪪</span>
                      <div>
                        <h4 class="text-sm font-semibold text-text-primary">DNI</h4>
                        <p class="text-xs text-text-secondary">Frente y dorso</p>
                      </div>
                    </div>
                    <span
                      class="text-xs px-2 py-1 rounded-full"
                      [class]="
                        isDniVerified()
                          ? 'bg-success-light/20 text-success-strong'
                          : 'bg-surface-hover text-text-muted'
                      "
                      >
                      {{ isDniVerified() ? '✓ Verificado' : 'Pendiente' }}
                    </span>
                  </div>
    
                  @if (!isDniVerified()) {
                    <div>
                      @if (!showDniUpload()) {
                        <button
                          (click)="showDniUpload.set(true)"
                          class="w-full py-3 rounded-lg bg-cta-default hover:bg-cta-hover text-cta-text text-sm font-semibold transition-all flex items-center justify-center gap-2"
                          >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                          </svg>
                          Subir DNI
                        </button>
                      }
                      @if (showDniUpload()) {
                        <div class="animate-fadeIn">
                          <app-dni-uploader></app-dni-uploader>
                          <button
                            (click)="showDniUpload.set(false)"
                            class="mt-3 w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                            >
                            Cancelar
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
    
                <!-- License Section -->
                <div class="p-4 rounded-lg bg-surface-secondary/50">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="text-lg">🚗</span>
                      <div>
                        <h4 class="text-sm font-semibold text-text-primary">
                          Licencia de Conducir
                        </h4>
                        <p class="text-xs text-text-secondary">Frente y dorso</p>
                      </div>
                    </div>
                    <span
                      class="text-xs px-2 py-1 rounded-full"
                      [class]="
                        isLicenseVerified()
                          ? 'bg-success-light/20 text-success-strong'
                          : 'bg-surface-hover text-text-muted'
                      "
                      >
                      {{ isLicenseVerified() ? '✓ Verificado' : 'Pendiente' }}
                    </span>
                  </div>
    
                  @if (!isLicenseVerified()) {
                    <div>
                      @if (!showLicenseUpload()) {
                        <button
                          (click)="showLicenseUpload.set(true)"
                          class="w-full py-3 rounded-lg bg-cta-default hover:bg-cta-hover text-cta-text text-sm font-semibold transition-all flex items-center justify-center gap-2"
                          >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                          </svg>
                          Subir Licencia
                        </button>
                      }
                      @if (showLicenseUpload()) {
                        <div class="animate-fadeIn">
                          <app-license-uploader></app-license-uploader>
                          <button
                            (click)="showLicenseUpload.set(false)"
                            class="mt-3 w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                            >
                            Cancelar
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
    
          <!-- Connector Line -->
          <div class="flex justify-center">
            <div
              class="w-0.5 h-4 rounded-full"
              [class]="isLevelComplete(2) ? 'bg-success-light' : 'bg-border-default'"
            ></div>
          </div>
    
          <!-- LEVEL 3: Selfie -->
          <div
            class="rounded-xl border overflow-hidden transition-all duration-300"
            [class]="getStepContainerClass(3)"
            >
            <!-- Header -->
            <button
              (click)="toggleSection(3)"
              [disabled]="!canAccessLevel(3)"
              class="w-full p-4 flex items-center justify-between text-left transition-colors disabled:cursor-not-allowed"
              [class]="getStepHeaderClass(3)"
              >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  [class]="getStepBadgeClass(3)"
                  >
                  @if (isLevelComplete(3)) {
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                        />
                    </svg>
                  }
                  @if (!isLevelComplete(3) && !canAccessLevel(3)) {
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                  }
                  @if (!isLevelComplete(3) && canAccessLevel(3)) {
                    <span>3</span>
                  }
                </div>
                <div>
                  <h3
                    class="font-semibold"
                    [class]="canAccessLevel(3) ? 'text-text-primary' : 'text-text-muted'"
                    >
                    Verificación Facial
                  </h3>
                  <p
                    class="text-xs"
                    [class]="canAccessLevel(3) ? 'text-text-secondary' : 'text-text-muted'"
                    >
                    Selfie para confirmar identidad
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-1 rounded-full" [class]="getStatusBadgeClass(3)">
                  {{ getStatusLabel(3) }}
                </span>
                @if (canAccessLevel(3)) {
                  <svg
                    class="w-5 h-5 text-text-muted transition-transform duration-200"
                    [class.rotate-180]="expandedSections().has(3)"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                      />
                  </svg>
                }
              </div>
            </button>
    
            <!-- Content -->
            <div
              class="overflow-hidden transition-all duration-300"
              [class]="
                expandedSections().has(3) && canAccessLevel(3)
                  ? 'max-h-[600px] opacity-100'
                  : 'max-h-0 opacity-0'
              "
              >
              <div class="p-4 pt-0 border-t border-border-default/50">
                <app-selfie-capture></app-selfie-capture>
              </div>
            </div>
          </div>
        </div>
    
        <!-- Help Section - Compact -->
        <details class="mt-4 group">
          <summary
            class="p-3 rounded-lg bg-info-bg/50 border border-info-border/30 cursor-pointer list-none flex items-center justify-between text-sm text-info-text hover:bg-info-bg transition-colors"
            >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
              </svg>
              ¿Por qué verificamos tu identidad?
            </span>
            <svg
              class="w-4 h-4 transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
                />
            </svg>
          </summary>
          <div class="mt-2 p-3 rounded-lg bg-info-bg/30 text-xs text-info-text space-y-1">
            <p><strong>Seguridad:</strong> Protegemos a todos los usuarios</p>
            <p><strong>Confianza:</strong> Usuarios verificados generan más confianza</p>
            <p><strong>Acceso:</strong> Desbloquea rentar y publicar autos</p>
            <p><strong>Legal:</strong> Cumplimos regulaciones anti-fraude</p>
          </div>
        </details>
      </div>
    </div>
    `,
  styles: [
    `
      :host {
        display: block;
      }

      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ProfileVerificationPage implements OnInit {
  private readonly profileStore = inject(ProfileStore);
  private readonly identityService = inject(IdentityLevelService);
  private readonly route = inject(ActivatedRoute);

  readonly profile = this.profileStore.profile;
  readonly loading = this.profileStore.loading;
  readonly showLicenseUpload = signal(false);
  readonly showDniUpload = signal(false);

  // Contextual message based on reason query param
  readonly verificationReason = signal<string | null>(null);

  // Track expanded sections
  readonly expandedSections = signal<Set<number>>(new Set([1])); // Level 1 expanded by default

  // Get verification progress data
  readonly verificationProgress = this.identityService.verificationProgress;
  readonly requirements = computed(() => this.verificationProgress()?.requirements);

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
    } catch (e) {
      console.error('Failed to load verification progress:', e);
    }
  }

  private setContextualMessage(reason: string): void {
    const messages: Record<string, string> = {
      booking_verification_required:
        'Para poder alquilar un auto, necesitás completar la verificación de tu identidad.',
      email_verification_required:
        'Verificá tu email para acceder a todas las funciones de la plataforma.',
      verification_check_failed:
        'Hubo un problema verificando tu cuenta. Por favor, completá los pasos pendientes.',
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

  isDniVerified(): boolean {
    return this.requirements()?.level_2?.document_verified ?? false;
  }

  isLicenseVerified(): boolean {
    return this.requirements()?.level_2?.driver_license_verified ?? false;
  }

  getStatusLabel(level: number): string {
    if (this.isLevelComplete(level)) return 'Completado';
    if (!this.canAccessLevel(level)) return 'Bloqueado';
    return 'En progreso';
  }

  getStepContainerClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'border-success-light/40 bg-success-light/5';
    }
    if (!this.canAccessLevel(level)) {
      return 'border-border-default bg-surface-base opacity-60';
    }
    // Active level
    return 'border-cta-default/40 bg-cta-default/5 shadow-sm';
  }

  getStepHeaderClass(level: number): string {
    if (!this.canAccessLevel(level)) {
      return 'bg-transparent';
    }
    return 'hover:bg-surface-hover/50';
  }

  getStepBadgeClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'bg-success-light text-white';
    }
    if (!this.canAccessLevel(level)) {
      return 'bg-surface-hover text-text-muted';
    }
    return 'bg-cta-default text-cta-text';
  }

  getStatusBadgeClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'bg-success-light/20 text-success-strong';
    }
    if (!this.canAccessLevel(level)) {
      return 'bg-surface-hover text-text-muted';
    }
    return 'bg-cta-default/20 text-cta-default';
  }
}
