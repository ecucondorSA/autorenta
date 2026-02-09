import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { EmailVerificationService } from '@core/services/auth/email-verification.service';
import { PhoneVerificationService } from '@core/services/auth/phone-verification.service';
import { ProfileStore } from '@core/stores/profile.store';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
  { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1' },
];

@Component({
  selector: 'app-contact-verification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, NgOptimizedImage],
  template: `
    <!-- Minimal Header -->
    <header
      class="sticky top-0 z-50 bg-white border-b border-gray-100 pt-[env(safe-area-inset-top)]"
    >
      <div class="flex items-center justify-center h-14 px-4 relative">
        <!-- Back Button -->
        <button
          type="button"
          (click)="goBack()"
          class="absolute left-4 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <!-- Centered Logo -->
        <a routerLink="/" class="flex items-center">
          <img
            ngSrc="/assets/images/autorentar-logo.svg"
            alt="AutoRentar"
            width="140"
            height="36"
            priority
            class="h-8 w-auto"
          />
        </a>
      </div>
    </header>

    <!-- Main Content -->
    <main class="min-h-[calc(100dvh-56px)] bg-gray-50 pb-safe">
      <div class="max-w-lg mx-auto px-4 py-6">
        <!-- Step Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-2">
            <h1 class="text-2xl font-bold text-gray-900">Contacto</h1>
            <span class="text-sm text-gray-500">Paso {{ currentStep() }} de {{ totalSteps }}</span>
          </div>

          <!-- Progress Bar -->
          <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-600 transition-all duration-500 ease-out rounded-full"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
          <p class="text-xs text-gray-500 mt-1 text-right">
            {{ progressPercentage() }}% completado
          </p>
        </div>

        <!-- Email Verification Section -->
        <section class="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
          <div class="p-5">
            <div class="flex items-start gap-4">
              <!-- Email Icon -->
              <div
                class="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-lg font-semibold text-gray-900">Correo electrónico</h2>
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    [ngClass]="getEmailStatusClasses()"
                  >
                    @if (isEmailVerified()) {
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    }
                    {{ getEmailStatusLabel() }}
                  </span>
                </div>

                <p class="text-sm text-gray-600 mt-1 truncate">
                  {{ userEmail() || 'No registrado' }}
                </p>

                @if (!isEmailVerified()) {
                  <p class="text-sm text-gray-500 mt-2">
                    Te enviamos un correo de verificación. Revisá tu bandeja de entrada.
                  </p>
                  <button
                    type="button"
                    (click)="resendEmailVerification()"
                    [disabled]="
                      emailVerificationService.loading() ||
                      !emailVerificationService.status().canResend
                    "
                    class="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    @if (emailVerificationService.loading()) {
                      Enviando...
                    } @else if (!emailVerificationService.status().canResend) {
                      Reenviar en {{ emailVerificationService.status().cooldownSeconds }}s
                    } @else {
                      Reenviar correo de verificación
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        </section>

        <!-- Phone Verification Section -->
        <section class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5">
            <div class="flex items-start gap-4">
              <!-- Phone Icon -->
              <div
                class="flex-shrink-0 w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-lg font-semibold text-gray-900">Teléfono</h2>
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    [ngClass]="getPhoneStatusClasses()"
                  >
                    @if (isPhoneVerified()) {
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    }
                    {{ getPhoneStatusLabel() }}
                  </span>
                </div>

                @if (!isPhoneVerified()) {
                  <!-- Phone Input -->
                  <div class="mt-4 space-y-3">
                    <div class="flex gap-2">
                      <!-- Country Selector -->
                      <div class="relative">
                        <button
                          type="button"
                          (click)="toggleCountryDropdown()"
                          class="flex items-center gap-2 h-12 px-3 bg-gray-50 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors min-w-[100px]"
                          [disabled]="phoneOtpSent()"
                        >
                          <span class="text-xl">{{ selectedCountry().flag }}</span>
                          <span class="text-sm font-medium text-gray-700">{{
                            selectedCountry().dialCode
                          }}</span>
                          <svg
                            class="w-4 h-4 text-gray-500"
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
                        </button>

                        @if (showCountryDropdown()) {
                          <div
                            class="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
                          >
                            @for (country of countries; track country.code) {
                              <button
                                type="button"
                                (click)="selectCountry(country)"
                                class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                [class.bg-primary-50]="country.code === selectedCountry().code"
                              >
                                <span class="text-xl">{{ country.flag }}</span>
                                <span class="flex-1 text-left text-sm text-gray-700">{{
                                  country.name
                                }}</span>
                                <span class="text-sm text-gray-500">{{ country.dialCode }}</span>
                              </button>
                            }
                          </div>
                        }
                      </div>

                      <!-- Phone Number Input -->
                      <input
                        type="tel"
                        [(ngModel)]="phoneNumber"
                        placeholder="11 1234-5678"
                        class="flex-1 h-12 px-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        [disabled]="phoneOtpSent()"
                      />
                    </div>

                    @if (phoneOtpSent()) {
                      <!-- OTP Code Input -->
                      <div class="space-y-2">
                        <p class="text-sm text-gray-600">
                          Ingresá el código de 6 dígitos que enviamos a tu teléfono
                        </p>
                        <div class="flex gap-2 justify-center">
                          @for (i of [0, 1, 2, 3, 4, 5]; track i) {
                            <input
                              type="text"
                              maxlength="1"
                              inputmode="numeric"
                              pattern="[0-9]"
                              class="w-12 h-14 text-center text-xl font-bold bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                              (input)="onOtpInput($event, i)"
                              (keydown)="onOtpKeydown($event, i)"
                              [attr.data-otp-index]="i"
                            />
                          }
                        </div>
                        <div class="flex items-center justify-between">
                          <button
                            type="button"
                            (click)="resetPhoneInput()"
                            class="text-sm font-medium text-gray-600 hover:text-gray-800"
                          >
                            Cambiar número
                          </button>
                          <button
                            type="button"
                            (click)="resendPhoneCode()"
                            [disabled]="
                              !phoneVerificationService.status().canResend ||
                              phoneVerificationService.loading()
                            "
                            class="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            @if (!phoneVerificationService.status().canResend) {
                              Reenviar en {{ phoneVerificationService.status().cooldownSeconds }}s
                            } @else {
                              Reenviar código
                            }
                          </button>
                        </div>
                      </div>
                    } @else {
                      <!-- Send Code Button -->
                      <button
                        type="button"
                        (click)="sendPhoneVerificationCode()"
                        [disabled]="!isPhoneInputValid() || phoneVerificationService.loading()"
                        class="w-full h-12 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {{ phoneVerificationService.loading() ? 'Enviando...' : 'Enviar código' }}
                      </button>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-gray-600 mt-2">
                    {{ phoneVerificationService.status().value || userPhone() }}
                  </p>
                }
              </div>
            </div>
          </div>
        </section>

        <!-- Error Display -->
        @if (emailVerificationService.error() || phoneVerificationService.error()) {
          <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p class="text-sm text-red-700">
              {{ emailVerificationService.error() || phoneVerificationService.error() }}
            </p>
          </div>
        }

        <!-- Continue Button -->
        @if (canContinue()) {
          <button
            type="button"
            (click)="continueToNextStep()"
            class="w-full mt-6 h-14 bg-primary-600 text-white font-semibold text-lg rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            Continuar
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        }

        <!-- Help Text -->
        <p class="text-center text-sm text-gray-500 mt-6">
          ¿Tenés problemas?
          <a routerLink="/help" class="text-primary-600 font-medium hover:text-primary-700">
            Contactá a soporte
          </a>
        </p>
      </div>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background: #f9fafb;
      }

      .pb-safe {
        padding-bottom: max(24px, env(safe-area-inset-bottom));
      }
    `,
  ],
})
export class ContactVerificationPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly emailVerificationService = inject(EmailVerificationService);
  readonly phoneVerificationService = inject(PhoneVerificationService);
  private readonly profileStore = inject(ProfileStore);

  readonly countries = COUNTRY_CODES;
  readonly totalSteps = 3;
  readonly currentStep = signal(1);

  readonly userEmail = this.authService.userEmail;
  readonly userPhone = computed(() => this.profileStore.profile()?.phone || '');

  readonly phoneNumber = signal('');
  readonly selectedCountry = signal<CountryCode>(COUNTRY_CODES[0]);
  readonly showCountryDropdown = signal(false);
  readonly otpCode = signal('');

  private unsubscribeEmail?: () => void;
  private unsubscribePhone?: () => void;

  readonly isEmailVerified = computed(() => this.emailVerificationService.status().isVerified);

  readonly isPhoneVerified = computed(() => this.phoneVerificationService.status().isVerified);

  readonly phoneOtpSent = computed(() => this.phoneVerificationService.status().otpSent);

  readonly progressPercentage = computed(() => {
    let progress = 0;
    if (this.isEmailVerified()) progress += 50;
    if (this.isPhoneVerified()) progress += 50;
    return progress;
  });

  readonly canContinue = computed(
    () => this.isEmailVerified(), // Permite continuar si el email está verificado, aunque falte el teléfono (SMS issues)
  );

  ngOnInit(): void {
    void this.profileStore.loadProfile();
    void this.emailVerificationService.checkStatus();
    void this.phoneVerificationService.checkStatus();

    // Subscribe to verification status changes
    this.unsubscribeEmail = this.emailVerificationService.subscribeToChanges(() => {
      // Status updated automatically
    });

    this.unsubscribePhone = this.phoneVerificationService.subscribeToChanges(() => {
      // Status updated automatically
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeEmail?.();
    this.unsubscribePhone?.();
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  getEmailStatusClasses(): string {
    if (this.isEmailVerified()) {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-amber-100 text-amber-700';
  }

  getEmailStatusLabel(): string {
    if (this.isEmailVerified()) {
      return 'Verificado';
    }
    return 'Pendiente';
  }

  getPhoneStatusClasses(): string {
    if (this.isPhoneVerified()) {
      return 'bg-green-100 text-green-700';
    }
    if (this.phoneOtpSent()) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-amber-100 text-amber-700';
  }

  getPhoneStatusLabel(): string {
    if (this.isPhoneVerified()) {
      return 'Verificado';
    }
    if (this.phoneOtpSent()) {
      return 'Código enviado';
    }
    return 'Pendiente';
  }

  async resendEmailVerification(): Promise<void> {
    try {
      await this.emailVerificationService.sendVerification();
    } catch {
      // Error is handled by the service
    }
  }

  toggleCountryDropdown(): void {
    this.showCountryDropdown.update((v) => !v);
  }

  selectCountry(country: CountryCode): void {
    this.selectedCountry.set(country);
    this.showCountryDropdown.set(false);
  }

  isPhoneInputValid(): boolean {
    const phone = this.phoneNumber();
    return phone.length >= 8 && /^[0-9\s-]+$/.test(phone);
  }

  async sendPhoneVerificationCode(): Promise<void> {
    if (!this.isPhoneInputValid()) return;

    try {
      await this.phoneVerificationService.sendVerification(
        this.phoneNumber(),
        this.selectedCountry().dialCode,
      );
    } catch {
      // Error is handled by the service
    }
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) {
      input.value = '';
      return;
    }

    if (value.length === 1 && index < 5) {
      const nextInput = document.querySelector(
        `[data-otp-index="${index + 1}"]`,
      ) as HTMLInputElement;
      nextInput?.focus();
    }

    this.updateOtpCode();
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (!input.value && index > 0) {
        const prevInput = document.querySelector(
          `[data-otp-index="${index - 1}"]`,
        ) as HTMLInputElement;
        prevInput?.focus();
      }
    }
  }

  private updateOtpCode(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-otp-index]');
    let code = '';
    inputs.forEach((input) => {
      code += input.value;
    });
    this.otpCode.set(code);

    if (code.length === 6) {
      this.verifyPhoneCode(code);
    }
  }

  private async verifyPhoneCode(code: string): Promise<void> {
    const fullPhone = `${this.selectedCountry().dialCode}${this.phoneNumber().replace(/\D/g, '')}`;
    const result = await this.phoneVerificationService.verifyOTP(fullPhone, code);

    if (!result.success) {
      this.clearOtpInputs();
    }
  }

  private clearOtpInputs(): void {
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-otp-index]');
    inputs.forEach((input) => {
      input.value = '';
    });
    this.otpCode.set('');
    (document.querySelector('[data-otp-index="0"]') as HTMLInputElement)?.focus();
  }

  async resendPhoneCode(): Promise<void> {
    try {
      await this.phoneVerificationService.sendVerification(
        this.phoneNumber(),
        this.selectedCountry().dialCode,
      );
    } catch {
      // Error is handled by the service
    }
  }

  resetPhoneInput(): void {
    this.phoneVerificationService.resetOTPSentState();
    this.clearOtpInputs();
  }

  continueToNextStep(): void {
    this.router.navigate(['/verification']);
  }
}
