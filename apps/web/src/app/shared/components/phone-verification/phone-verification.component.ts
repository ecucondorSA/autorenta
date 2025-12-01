import { CommonModule } from '@angular/common';
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
import { SUCCESS_MESSAGE_DURATION_MS } from '../../../core/constants/timing.constants';
import { PhoneVerificationService } from '../../../core/services/phone-verification.service';

@Component({
  standalone: true,
  selector: 'app-phone-verification',
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="bg-surface-raised rounded-lg border border-border-default p-6">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            [class]="getStatusBadgeClass()"
          >
            {{ getStatusIcon() }}
          </div>
          <div>
            <h4 class="font-semibold text-text-primary">Verificación de Teléfono</h4>
            <p class="text-sm text-text-secondary dark:text-text-secondary">
              {{ status().value || 'No configurado' }}
            </p>
          </div>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full" [class]="getStatusLabelClass()">
          {{ getStatusLabel() }}
        </span>
      </div>

      <!-- Verified State -->
      <div
        *ngIf="status().isVerified"
        class="p-4 bg-success-light/10 border border-success-light/40 rounded-lg"
      >
        <div class="flex items-center gap-2 text-success-light">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-medium">Teléfono verificado exitosamente</span>
        </div>
        <p class="text-xs text-success-light mt-2">
          Verificado el {{ formatDate(status().verifiedAt) }}
        </p>
      </div>

      <!-- Pending State -->
      <div *ngIf="!status().isVerified" class="space-y-4">
        <!-- Debug Panel (temporal) -->
        <div class="p-3 bg-warning-bg-hover border-2 border-warning-border rounded text-xs">
          <p class="font-bold mb-2">🐛 DEBUG - Estado del componente:</p>
          <p>
            isVerified: <strong>{{ status().isVerified }}</strong>
          </p>
          <p>
            phone: <strong>{{ status().value || 'null' }}</strong>
          </p>
          <p>
            otpSent: <strong>{{ status().otpSent }}</strong>
          </p>
          <p>
            verifiedAt: <strong>{{ status().verifiedAt || 'null' }}</strong>
          </p>
          <p>
            canResend: <strong>{{ status().canResend }}</strong>
          </p>
          <p>
            cooldownSeconds: <strong>{{ status().cooldownSeconds }}</strong>
          </p>
        </div>

        <!-- Phone Input (if OTP not sent yet) -->
        <div *ngIf="!status().otpSent" class="space-y-4">
          <div class="p-4 bg-cta-default/10 border border-cta-default/40 rounded-lg">
            <p class="text-sm text-cta-default">
              Ingresa tu número de teléfono para recibir un código de verificación por SMS.
            </p>
          </div>

          <div>
            <label for="phone" class="block text-sm font-medium text-text-primary mb-2">
              Número de teléfono
            </label>
            <div class="flex gap-2">
              <select
                [(ngModel)]="countryCode"
                class="block w-24 rounded-lg border-border-muted shadow-sm focus:ring-cta-default focus:border-cta-default text-sm"
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
                class="flex-grow block rounded-lg border-border-muted shadow-sm focus:ring-cta-default focus:border-cta-default text-sm"
                [disabled]="loading()"
              />
            </div>
            <p class="text-xs text-text-secondary dark:text-text-secondary mt-1">
              Formato: sin el 0 inicial. Ej: 11 2345 6789
            </p>
          </div>

          <button
            type="button"
            (click)="sendOTP()"
            [disabled]="!canSendOTP() || loading()"
            class="w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            [class]="
              canSendOTP()
                ? 'bg-cta-default text-cta-text hover:bg-cta-default focus:ring-2 focus:ring-cta-default focus:ring-offset-2'
                : 'bg-surface-hover text-text-secondary dark:text-text-secondary cursor-not-allowed'
            "
          >
            <span *ngIf="!loading()" class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span>{{
                cooldownRemaining() > 0 ? 'Espera ' + cooldownRemaining() + 's' : 'Enviar código'
              }}</span>
            </span>
            <span *ngIf="loading()" class="flex items-center justify-center gap-2">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Enviando...</span>
            </span>
          </button>

          <!-- Rate Limit Warning -->
          <div
            *ngIf="remainingAttempts() < 3"
            class="p-3 bg-warning-light/10 border border-warning-light/40 rounded-lg text-sm text-warning-light"
          >
            ⚠️ Te quedan {{ remainingAttempts() }} intentos en esta hora
          </div>
        </div>

        <!-- OTP Input (if OTP sent) -->
        <div *ngIf="status().otpSent" class="space-y-4">
          <div class="p-4 bg-cta-default/10 border border-cta-default/40 rounded-lg">
            <p class="text-sm text-cta-default font-medium">
              Código enviado a {{ status().value }}
            </p>
            <p class="text-xs text-cta-default mt-1">
              Ingresa el código de 6 dígitos que recibiste por SMS
            </p>
          </div>

          <div>
            <label for="otp" class="block text-sm font-medium text-text-primary mb-2">
              Código de verificación
            </label>
            <input
              id="otp"
              type="text"
              [(ngModel)]="otpCode"
              placeholder="000000"
              maxlength="6"
              inputmode="numeric"
              pattern="[0-9]*"
              class="block w-full rounded-lg border-border-muted shadow-sm focus:ring-cta-default focus:border-cta-default text-center h4 tracking-widest font-mono"
              [disabled]="loading()"
              (input)="onOTPInput($event)"
            />
            <p class="text-xs text-text-secondary dark:text-text-secondary mt-1 text-center">
              Solo números, 6 dígitos
            </p>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              (click)="verifyOTP()"
              [disabled]="!canVerifyOTP() || loading()"
              class="flex-grow px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              [class]="
                canVerifyOTP()
                  ? 'bg-success-light text-text-primary hover:bg-success-light focus:ring-2 focus:ring-success-light focus:ring-offset-2'
                  : 'bg-surface-hover text-text-secondary dark:text-text-secondary cursor-not-allowed'
              "
            >
              <span *ngIf="!loading()" class="flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Verificar código</span>
              </span>
              <span *ngIf="loading()" class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Verificando...</span>
              </span>
            </button>

            <button
              type="button"
              (click)="cancelOTP()"
              [disabled]="loading()"
              class="px-4 py-3 text-sm font-medium text-text-primary bg-surface-raised border border-border-muted rounded-lg hover:bg-surface-base focus:ring-2 focus:ring-cta-default focus:ring-offset-2 disabled:opacity-50"
            >
              Cambiar número
            </button>
          </div>

          <button
            type="button"
            (click)="resendOTP()"
            [disabled]="!canResend() || loading()"
            class="w-full px-4 py-2 text-sm text-cta-default hover:text-cta-default disabled:text-text-muted dark:text-text-secondary"
          >
            {{
              cooldownRemaining() > 0
                ? 'Reenviar en ' + cooldownRemaining() + 's'
                : '¿No recibiste el código? Reenviar'
            }}
          </button>
        </div>

        <!-- Success Message -->
        <div
          *ngIf="successMessage()"
          class="p-3 bg-success-light/10 border border-success-light/40 rounded-lg text-sm text-success-light"
        >
          {{ successMessage() }}
        </div>

        <!-- Error Message -->
        <div
          *ngIf="error()"
          class="p-3 bg-error-bg border border-error-border rounded-lg text-sm text-error-strong"
        >
          {{ error() }}
        </div>

        <!-- Help Text -->
        <div class="text-xs text-text-secondary dark:text-text-secondary space-y-1">
          <p>• El código expira en 10 minutos</p>
          <p>• Máximo 3 intentos por hora</p>
          <p>• Revisa que tu teléfono pueda recibir SMS</p>
        </div>
      </div>
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
    console.log('[PhoneVerification] Component initialized');

    await this.phoneVerificationService.checkStatus();

    console.log('[PhoneVerification] Status after check:', this.status());
    console.log('[PhoneVerification] Is verified?', this.status().isVerified);
    console.log('[PhoneVerification] Phone:', this.status().value);
    console.log('[PhoneVerification] OTP sent?', this.status().otpSent);

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
      ? 'bg-success-light/20 text-success-light'
      : 'bg-warning-bg-hover text-warning-text';
  }

  getStatusLabel(): string {
    return this.status().isVerified ? 'Verificado' : 'Pendiente';
  }

  getStatusLabelClass(): string {
    return this.status().isVerified
      ? 'bg-success-light/20 text-success-light'
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
