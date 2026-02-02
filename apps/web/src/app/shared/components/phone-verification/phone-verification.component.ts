import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SUCCESS_MESSAGE_DURATION_MS } from '@core/constants/timing.constants';
import { PhoneVerificationService } from '@core/services/auth/phone-verification.service';
import { OtpInputComponent } from '../otp-input/otp-input.component';

@Component({
  standalone: true,
  selector: 'app-phone-verification',
  imports: [FormsModule, TranslateModule, OtpInputComponent],
  template: `
    <div class="space-y-4">
      <!-- Status Row -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Teléfono</h4>
          <p class="text-sm text-text-secondary">
            {{ status().value || 'No configurado' }}
          </p>
        </div>
        
        @if (status().isVerified) {
          <span class="flex items-center gap-1 text-xs font-medium text-success-600 bg-success-50 px-2 py-1 rounded-full">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Verificado
          </span>
        } @else {
          <span class="flex items-center gap-1 text-xs font-medium text-warning-700 bg-warning-50 px-2 py-1 rounded-full">
            Pendiente
          </span>
        }
      </div>

      <!-- Pending Action -->
      @if (!status().isVerified) {
        <div class="animate-fade-in">
          <!-- Phone Input (if OTP not sent yet) -->
          @if (!status().otpSent) {
            <div class="space-y-4">
              <div class="p-4 bg-surface-secondary/50 rounded-lg text-sm text-text-secondary border border-border-subtle">
                <p>Ingresa tu número para recibir un código SMS.</p>
              </div>
              
              <div>
                <label for="phone" class="sr-only">Número de teléfono</label>
                <div class="flex gap-2">
                  <select
                    [(ngModel)]="countryCode"
                    class="block w-24 rounded-xl border-border-default shadow-sm focus:ring-cta-default focus:border-cta-default text-sm bg-surface-base"
                  >
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+56">🇨🇱 +56</option>
                  </select>
                  <input
                    id="phone"
                    type="tel"
                    [(ngModel)]="phoneNumber"
                    placeholder="11 2345 6789"
                    maxlength="15"
                    class="flex-grow block rounded-xl border-border-default shadow-sm focus:ring-cta-default focus:border-cta-default text-sm bg-surface-base"
                    [disabled]="loading()"
                  />
                </div>
              </div>

              <button
                type="button"
                (click)="sendOTP()"
                [disabled]="!canSendOTP() || loading()"
                class="w-full px-4 py-2.5 bg-cta-default text-white font-medium rounded-xl hover:bg-cta-hover transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none"
              >
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </span>
                } @else {
                  {{ cooldownRemaining() > 0 ? 'Espera ' + cooldownRemaining() + 's' : 'Enviar código' }}
                }
              </button>
            </div>
          }

          <!-- OTP Input (if OTP sent) -->
          @if (status().otpSent) {
            <div class="space-y-4 animate-fade-in-up">
              <div class="text-center">
                <p class="text-sm text-text-secondary">Código enviado a <span class="font-semibold text-text-primary">{{ status().value }}</span></p>
                <button (click)="cancelOTP()" class="text-xs text-cta-default hover:underline mt-1">Cambiar número</button>
              </div>

              <div>
                <app-otp-input
                  [(value)]="otpCode"
                  [disabled]="loading()"
                  [hasError]="!!error()"
                  (complete)="onOtpComplete($event)"
                />
              </div>

              <button
                type="button"
                (click)="verifyOTP()"
                [disabled]="!canVerifyOTP() || loading()"
                class="w-full px-4 py-2.5 bg-cta-default text-white font-medium rounded-xl hover:bg-cta-hover transition-colors shadow-sm disabled:opacity-50 disabled:shadow-none"
              >
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verificando...</span>
                  </span>
                } @else {
                  Verificar
                }
              </button>

              <div class="text-center">
                <button
                  type="button"
                  (click)="resendOTP()"
                  [disabled]="!canResend() || loading()"
                  class="text-sm text-text-secondary hover:text-cta-default disabled:opacity-50 transition-colors"
                >
                  {{ cooldownRemaining() > 0 ? 'Reenviar en ' + cooldownRemaining() + 's' : '¿No llegó? Reenviar' }}
                </button>
              </div>
            </div>
          }

          @if (successMessage()) {
            <div class="mt-3 p-3 bg-success-50 text-success-700 text-sm rounded-lg text-center animate-fade-in">
              {{ successMessage() }}
            </div>
          }
          @if (error()) {
            <div class="mt-3 p-3 bg-error-50 text-error-700 text-sm rounded-lg text-center animate-fade-in">
              {{ error() }}
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneVerificationComponent implements OnInit, OnDestroy {
  private readonly phoneVerificationService = inject(PhoneVerificationService);

  readonly status = this.phoneVerificationService.status;
  readonly loading = this.phoneVerificationService.loading;
  readonly error = this.phoneVerificationService.error;

  readonly phoneNumber = signal('');
  readonly countryCode = signal('+54');
  readonly otpCode = signal('');
  readonly cooldownRemaining = signal(0);
  readonly successMessage = signal<string | null>(null);
  readonly remainingAttempts = signal(3);

  readonly canSendOTP = computed(
    () =>
      this.phoneNumber().length >= 10 &&
      this.remainingAttempts() > 0 &&
      this.cooldownRemaining() === 0,
  );

  readonly canVerifyOTP = computed(() => this.otpCode().length === 6);

  readonly canResend = computed(
    () => this.status().otpSent && this.cooldownRemaining() === 0 && this.remainingAttempts() > 0,
  );

  private unsubscribe?: () => void;
  private stopCooldownTimer?: () => void;

  async ngOnInit(): Promise<void> {
    await this.phoneVerificationService.checkStatus();

    this.unsubscribe = this.phoneVerificationService.subscribeToChanges((verified) => {
      if (verified) {
        this.successMessage.set('¡Teléfono verificado exitosamente!');
        setTimeout(() => this.successMessage.set(null), SUCCESS_MESSAGE_DURATION_MS);
      }
    });

    this.updateRemainingAttempts();

    if (this.status().cooldownSeconds && this.status()!.cooldownSeconds > 0) {
      this.startCooldownTimer();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.stopCooldownTimer?.();
  }

  async sendOTP(): Promise<void> {
    if (!this.canSendOTP()) return;

    this.successMessage.set(null);
    this.phoneVerificationService.clearError();

    try {
      const phone = this.phoneNumber().replace(/\s/g, '');
      await this.phoneVerificationService.sendOTP(phone, this.countryCode());

      this.successMessage.set('Código enviado. Revisa tus mensajes SMS.');
      this.updateRemainingAttempts();
      this.startCooldownTimer();

      setTimeout(() => this.successMessage.set(null), SUCCESS_MESSAGE_DURATION_MS);
    } catch (_error) {
      console.error('Failed to send OTP:', _error);
    }
  }

  async verifyOTP(): Promise<void> {
    if (!this.canVerifyOTP()) return;

    this.successMessage.set(null);
    this.phoneVerificationService.clearError();

    try {
      const phone = this.status().value || '';
      const result = await this.phoneVerificationService.verifyOTP(phone, this.otpCode());

      if (result.verified) {
        this.successMessage.set('¡Teléfono verificado exitosamente!');
        this.otpCode.set('');
      }
    } catch (_error) {
      console.error('Failed to verify OTP:', _error);
    }
  }

  async resendOTP(): Promise<void> {
    if (!this.canResend()) return;

    await this.sendOTP();
  }

  cancelOTP(): void {
    this.phoneVerificationService.resetOTPSentState();
    this.otpCode.set('');
    this.successMessage.set(null);
  }

  onOTPInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    this.otpCode.set(value);
    input.value = value;
  }

  /**
   * Handle OTP input complete - auto-verify when 6 digits entered
   */
  onOtpComplete(code: string): void {
    this.otpCode.set(code);
    // Optionally auto-verify when complete
    // void this.verifyOTP();
  }

  private startCooldownTimer(): void {
    this.stopCooldownTimer?.();

    this.stopCooldownTimer = this.phoneVerificationService.startCooldownTimer((remaining) => {
      this.cooldownRemaining.set(remaining);
    });
  }

  private updateRemainingAttempts(): void {
    const remaining = this.phoneVerificationService.getRemainingAttempts();
    this.remainingAttempts.set(remaining);
  }

  getStatusIcon(): string {
    return this.status().isVerified ? '✓' : '○';
  }

  getStatusBadgeClass(): string {
    return this.status().isVerified
      ? 'bg-success-light/20 text-success-strong'
      : 'bg-warning-bg-hover text-warning-text';
  }

  getStatusLabel(): string {
    return this.status().isVerified ? 'Verificado' : 'Pendiente';
  }

  getStatusLabelClass(): string {
    return this.status().isVerified
      ? 'bg-success-light/20 text-success-strong'
      : 'bg-warning-bg-hover text-warning-strong';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
