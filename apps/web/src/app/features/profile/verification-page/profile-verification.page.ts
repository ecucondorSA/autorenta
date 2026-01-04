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
    DniUploaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-surface-base">
      <!-- Hero Header - Airbnb/Uber Style -->
      <header class="bg-surface-raised border-b border-border-subtle">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <!-- Back Navigation -->
          <a
            routerLink="/profile"
            class="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6 group"
          >
            <svg class="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>Volver al perfil</span>
          </a>

          <!-- Title Section -->
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Verifica tu identidad
              </h1>
              <p class="mt-2 text-text-secondary text-sm sm:text-base max-w-md">
                Completa estos pasos para acceder a todas las funciones de la plataforma
              </p>
            </div>

            <!-- Progress Circle - Desktop -->
            <div class="hidden sm:flex items-center gap-3">
              <div class="relative">
                <svg class="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32" cy="32" r="28"
                    stroke-width="4"
                    class="fill-none stroke-surface-hover"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke-width="4"
                    stroke-linecap="round"
                    class="fill-none transition-all duration-1000 ease-out"
                    [class]="progressPercentage() === 100 ? 'stroke-success-500' : 'stroke-cta-default'"
                    [attr.stroke-dasharray]="176"
                    [attr.stroke-dashoffset]="176 - (176 * progressPercentage() / 100)"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span
                    class="text-lg font-bold"
                    [class]="progressPercentage() === 100 ? 'text-success-600' : 'text-cta-default'"
                  >
                    {{ progressPercentage() }}%
                  </span>
                </div>
              </div>
              <div class="text-sm">
                <p class="font-medium text-text-primary">{{ getProgressLabel() }}</p>
                <p class="text-text-secondary">{{ completedSteps() }}/3 pasos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        <!-- Mobile Progress Bar -->
        <div class="sm:hidden mb-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-text-primary">{{ getProgressLabel() }}</span>
            <span class="text-sm text-text-secondary">{{ progressPercentage() }}%</span>
          </div>
          <div class="h-2 bg-surface-hover rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              [class]="progressPercentage() === 100 ? 'bg-success-500' : 'bg-cta-default'"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
        </div>

        <!-- Contextual Alert -->
        @if (verificationReason()) {
          <div class="mb-6 p-4 rounded-2xl bg-warning-50 border border-warning-200 animate-fade-in">
            <div class="flex gap-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-warning-800">Accion requerida</h3>
                <p class="mt-1 text-sm text-warning-700">{{ verificationReason() }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Horizontal Progress Steps - Desktop -->
        <div class="hidden sm:block mb-8">
          <div class="flex items-center justify-between relative">
            <!-- Progress Line Background -->
            <div class="absolute top-5 left-0 right-0 h-0.5 bg-surface-hover"></div>
            <!-- Progress Line Fill -->
            <div
              class="absolute top-5 left-0 h-0.5 transition-all duration-700 ease-out"
              [class]="progressPercentage() === 100 ? 'bg-success-500' : 'bg-cta-default'"
              [style.width]="getProgressLineWidth()"
            ></div>

            <!-- Step 1 -->
            <div class="relative z-10 flex flex-col items-center">
              <button
                (click)="toggleSection(1)"
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
                [class]="getStepCircleClass(1)"
              >
                @if (isLevelComplete(1)) {
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  <span class="text-sm font-semibold">1</span>
                }
              </button>
              <span class="mt-2 text-xs font-medium" [class]="getStepLabelClass(1)">Contacto</span>
            </div>

            <!-- Step 2 -->
            <div class="relative z-10 flex flex-col items-center">
              <button
                (click)="canAccessLevel(2) && toggleSection(2)"
                [disabled]="!canAccessLevel(2)"
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed"
                [class]="getStepCircleClass(2)"
              >
                @if (isLevelComplete(2)) {
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else if (!canAccessLevel(2)) {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                } @else {
                  <span class="text-sm font-semibold">2</span>
                }
              </button>
              <span class="mt-2 text-xs font-medium" [class]="getStepLabelClass(2)">Documentos</span>
            </div>

            <!-- Step 3 -->
            <div class="relative z-10 flex flex-col items-center">
              <button
                (click)="canAccessLevel(3) && toggleSection(3)"
                [disabled]="!canAccessLevel(3)"
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed"
                [class]="getStepCircleClass(3)"
              >
                @if (isLevelComplete(3)) {
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else if (!canAccessLevel(3)) {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                } @else {
                  <span class="text-sm font-semibold">3</span>
                }
              </button>
              <span class="mt-2 text-xs font-medium" [class]="getStepLabelClass(3)">Identidad</span>
            </div>
          </div>
        </div>

        <!-- Verification Cards -->
        <div class="space-y-4">
          <!-- LEVEL 1: Contact -->
          <article
            class="bg-surface-raised rounded-2xl border overflow-hidden transition-all duration-300"
            [class]="getCardClass(1)"
          >
            <button
              (click)="toggleSection(1)"
              class="w-full p-5 sm:p-6 flex items-center gap-4 text-left transition-colors hover:bg-surface-hover/30 focus:outline-none focus:bg-surface-hover/30"
              [attr.aria-expanded]="expandedSections().has(1)"
              aria-controls="level1-content"
            >
              <!-- Icon -->
              <div
                class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                [class]="getIconContainerClass(1)"
              >
                @if (isLevelComplete(1)) {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                }
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base sm:text-lg font-semibold text-text-primary">
                    Informacion de contacto
                  </h2>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [class]="getStatusBadgeClass(1)"
                  >
                    {{ getStatusLabel(1) }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-text-secondary">
                  Verifica tu email y numero de telefono
                </p>
                <!-- Mini progress -->
                <div class="mt-3 flex items-center gap-3">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                      [class]="isEmailVerified() ? 'bg-success-100 text-success-600' : 'bg-surface-hover text-text-muted'"
                    >
                      @if (isEmailVerified()) {
                        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                      }
                    </span>
                    <span class="text-xs" [class]="isEmailVerified() ? 'text-success-600' : 'text-text-muted'">Email</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                      [class]="isPhoneVerified() ? 'bg-success-100 text-success-600' : 'bg-surface-hover text-text-muted'"
                    >
                      @if (isPhoneVerified()) {
                        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                      }
                    </span>
                    <span class="text-xs" [class]="isPhoneVerified() ? 'text-success-600' : 'text-text-muted'">Telefono</span>
                  </div>
                </div>
              </div>

              <!-- Chevron -->
              <svg
                class="flex-shrink-0 w-5 h-5 text-text-muted transition-transform duration-300"
                [class.rotate-180]="expandedSections().has(1)"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Expandable Content -->
            <div
              id="level1-content"
              class="grid transition-all duration-300 ease-out"
              [class]="expandedSections().has(1) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
            >
              <div class="overflow-hidden">
                <div class="px-5 sm:px-6 pb-6 pt-2 space-y-4 border-t border-border-subtle">
                  <app-email-verification></app-email-verification>
                  <app-phone-verification></app-phone-verification>
                </div>
              </div>
            </div>
          </article>

          <!-- LEVEL 2: Documents -->
          <article
            class="bg-surface-raised rounded-2xl border overflow-hidden transition-all duration-300"
            [class]="getCardClass(2)"
          >
            <button
              (click)="canAccessLevel(2) && toggleSection(2)"
              [disabled]="!canAccessLevel(2)"
              class="w-full p-5 sm:p-6 flex items-center gap-4 text-left transition-colors focus:outline-none disabled:cursor-not-allowed"
              [class]="canAccessLevel(2) ? 'hover:bg-surface-hover/30 focus:bg-surface-hover/30' : 'opacity-60'"
              [attr.aria-expanded]="expandedSections().has(2)"
              aria-controls="level2-content"
            >
              <!-- Icon -->
              <div
                class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                [class]="getIconContainerClass(2)"
              >
                @if (isLevelComplete(2)) {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else if (!canAccessLevel(2)) {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                } @else {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                }
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base sm:text-lg font-semibold" [class]="canAccessLevel(2) ? 'text-text-primary' : 'text-text-muted'">
                    Documentos oficiales
                  </h2>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [class]="getStatusBadgeClass(2)"
                  >
                    {{ getStatusLabel(2) }}
                  </span>
                </div>
                <p class="mt-1 text-sm" [class]="canAccessLevel(2) ? 'text-text-secondary' : 'text-text-muted'">
                  @if (!canAccessLevel(2)) {
                    Completa el paso anterior para desbloquear
                  } @else {
                    DNI/Cedula y licencia de conducir
                  }
                </p>
                <!-- Mini progress -->
                @if (canAccessLevel(2)) {
                  <div class="mt-3 flex items-center gap-3">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                        [class]="isDniVerified() ? 'bg-success-100 text-success-600' : 'bg-surface-hover text-text-muted'"
                      >
                        @if (isDniVerified()) {
                          <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                          </svg>
                        }
                      </span>
                      <span class="text-xs" [class]="isDniVerified() ? 'text-success-600' : 'text-text-muted'">DNI</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span
                        class="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                        [class]="isLicenseVerified() ? 'bg-success-100 text-success-600' : 'bg-surface-hover text-text-muted'"
                      >
                        @if (isLicenseVerified()) {
                          <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                          </svg>
                        }
                      </span>
                      <span class="text-xs" [class]="isLicenseVerified() ? 'text-success-600' : 'text-text-muted'">Licencia</span>
                    </div>
                  </div>
                }
              </div>

              <!-- Chevron or Lock -->
              @if (canAccessLevel(2)) {
                <svg
                  class="flex-shrink-0 w-5 h-5 text-text-muted transition-transform duration-300"
                  [class.rotate-180]="expandedSections().has(2)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              }
            </button>

            <!-- Expandable Content -->
            <div
              id="level2-content"
              class="grid transition-all duration-300 ease-out"
              [class]="expandedSections().has(2) && canAccessLevel(2) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
            >
              <div class="overflow-hidden">
                <div class="px-5 sm:px-6 pb-6 pt-2 space-y-6 border-t border-border-subtle">
                  <!-- DNI Section -->
                  <section>
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 rounded-xl flex items-center justify-center"
                          [class]="isDniVerified() ? 'bg-success-100 text-success-600' : 'bg-surface-hover text-text-muted'"
                        >
                          @if (isDniVerified()) {
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                          } @else {
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>
                            </svg>
                          }
                        </div>
                        <div>
                          <h3 class="font-semibold text-text-primary">DNI / Cedula</h3>
                          <p class="text-xs text-text-secondary">Documento de identidad oficial</p>
                        </div>
                      </div>
                      @if (isDniVerified()) {
                        <span class="px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                          Verificado
                        </span>
                      }
                    </div>
                    @if (!isDniVerified()) {
                      <app-dni-uploader></app-dni-uploader>
                    }
                  </section>

                  <!-- Divider -->
                  <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                      <div class="w-full border-t border-border-subtle"></div>
                    </div>
                    <div class="relative flex justify-center">
                      <span class="px-3 bg-surface-raised text-xs text-text-muted">y tambien</span>
                    </div>
                  </div>

                  <!-- License Section -->
                  <section>
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-3">
                        <div
                          class="w-10 h-10 rounded-xl flex items-center justify-center"
                          [class]="isLicenseVerified() ? 'bg-success-100 text-success-600' : 'bg-surface-hover text-text-muted'"
                        >
                          @if (isLicenseVerified()) {
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                          } @else {
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                            </svg>
                          }
                        </div>
                        <div>
                          <h3 class="font-semibold text-text-primary">Licencia de conducir</h3>
                          <p class="text-xs text-text-secondary">Habilitacion vigente</p>
                        </div>
                      </div>
                      @if (isLicenseVerified()) {
                        <span class="px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                          Verificado
                        </span>
                      }
                    </div>
                    @if (!isLicenseVerified()) {
                      <app-license-uploader [hideCountrySelector]="true"></app-license-uploader>
                    }
                  </section>
                </div>
              </div>
            </div>
          </article>

          <!-- LEVEL 3: Identity -->
          <article
            class="bg-surface-raised rounded-2xl border overflow-hidden transition-all duration-300"
            [class]="getCardClass(3)"
          >
            <button
              (click)="canAccessLevel(3) && toggleSection(3)"
              [disabled]="!canAccessLevel(3)"
              class="w-full p-5 sm:p-6 flex items-center gap-4 text-left transition-colors focus:outline-none disabled:cursor-not-allowed"
              [class]="canAccessLevel(3) ? 'hover:bg-surface-hover/30 focus:bg-surface-hover/30' : 'opacity-60'"
              [attr.aria-expanded]="expandedSections().has(3)"
              aria-controls="level3-content"
            >
              <!-- Icon -->
              <div
                class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                [class]="getIconContainerClass(3)"
              >
                @if (isLevelComplete(3)) {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else if (!canAccessLevel(3)) {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                } @else {
                  <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                }
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base sm:text-lg font-semibold" [class]="canAccessLevel(3) ? 'text-text-primary' : 'text-text-muted'">
                    Verificacion facial
                  </h2>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [class]="getStatusBadgeClass(3)"
                  >
                    {{ getStatusLabel(3) }}
                  </span>
                </div>
                <p class="mt-1 text-sm" [class]="canAccessLevel(3) ? 'text-text-secondary' : 'text-text-muted'">
                  @if (!canAccessLevel(3)) {
                    Completa los pasos anteriores para desbloquear
                  } @else {
                    Selfie en video para confirmar tu identidad
                  }
                </p>
              </div>

              <!-- Chevron or Lock -->
              @if (canAccessLevel(3)) {
                <svg
                  class="flex-shrink-0 w-5 h-5 text-text-muted transition-transform duration-300"
                  [class.rotate-180]="expandedSections().has(3)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              }
            </button>

            <!-- Expandable Content -->
            <div
              id="level3-content"
              class="grid transition-all duration-300 ease-out"
              [class]="expandedSections().has(3) && canAccessLevel(3) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
            >
              <div class="overflow-hidden">
                <div class="px-5 sm:px-6 pb-6 pt-2 border-t border-border-subtle">
                  <app-selfie-capture></app-selfie-capture>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Success Banner -->
        @if (progressPercentage() === 100) {
          <div class="mt-6 p-6 rounded-2xl bg-gradient-to-r from-success-50 to-success-100 border border-success-200 animate-fade-in-up">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-full bg-success-500 text-white flex items-center justify-center">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-success-800">Verificacion completada</h3>
                <p class="mt-1 text-sm text-success-700">
                  Tu cuenta esta completamente verificada. Ahora puedes acceder a todas las funciones de la plataforma.
                </p>
                <a
                  routerLink="/cars"
                  class="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-success-600 text-white rounded-xl text-sm font-medium hover:bg-success-700 transition-colors"
                >
                  Explorar autos
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        }

        <!-- Help Section -->
        <details class="mt-6 group">
          <summary class="p-4 rounded-2xl bg-surface-raised border border-border-subtle cursor-pointer list-none flex items-center justify-between hover:bg-surface-hover/50 transition-colors">
            <span class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-info-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span class="font-medium text-text-primary">Por que verificamos tu identidad?</span>
            </span>
            <svg class="w-5 h-5 text-text-muted transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <div class="mt-3 p-5 rounded-2xl bg-surface-secondary/50 space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-info-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-text-primary">Seguridad</h4>
                <p class="text-sm text-text-secondary">Protegemos a todos los usuarios de la comunidad</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-info-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-text-primary">Confianza</h4>
                <p class="text-sm text-text-secondary">Los usuarios verificados generan mas confianza</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-info-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-text-primary">Acceso</h4>
                <p class="text-sm text-text-secondary">Desbloquea la capacidad de rentar y publicar autos</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-info-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                </svg>
              </div>
              <div>
                <h4 class="font-medium text-text-primary">Cumplimiento legal</h4>
                <p class="text-sm text-text-secondary">Cumplimos con regulaciones anti-fraude</p>
              </div>
            </div>
          </div>
        </details>
      </main>
    </div>
  `,
  styles: [`
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
      box-shadow: 0 0 0 2px var(--surface-base), 0 0 0 4px var(--cta-default);
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
  `],
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

  isLicenseVerified(): boolean {
    return this.requirements()?.level_2?.driver_license_verified ?? false;
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

  getStepLabelClass(level: number): string {
    if (this.isLevelComplete(level)) {
      return 'text-success-600';
    }
    if (!this.canAccessLevel(level)) {
      return 'text-text-muted';
    }
    if (this.isCurrentStep(level)) {
      return 'text-cta-default';
    }
    return 'text-text-secondary';
  }

  private isCurrentStep(level: number): boolean {
    // Current step is the first incomplete step that is accessible
    if (level === 1 && !this.isLevelComplete(1)) return true;
    if (level === 2 && this.isLevelComplete(1) && !this.isLevelComplete(2) && this.canAccessLevel(2)) return true;
    if (level === 3 && this.isLevelComplete(2) && !this.isLevelComplete(3) && this.canAccessLevel(3)) return true;
    return false;
  }
}
