import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SUCCESS_MESSAGE_DURATION_MS } from '@core/constants/timing.constants';
import { EmailVerificationService } from '@core/services/auth/email-verification.service';

@Component({
  standalone: true,
  selector: 'app-email-verification',
  imports: [TranslateModule],
  template: `
    <div class="space-y-4">
      <!-- Status Row -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Email</h4>
          <p class="text-sm text-text-secondary">
            {{ status().value || 'No configurado' }}
          </p>
        </div>

        @if (status().isVerified) {
          <span
            class="flex items-center gap-1 text-xs font-medium text-success-600 bg-success-50 px-2 py-1 rounded-full"
          >
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Verificado
          </span>
        } @else {
          <span
            class="flex items-center gap-1 text-xs font-medium text-warning-700 bg-warning-50 px-2 py-1 rounded-full"
          >
            Pendiente
          </span>
        }
      </div>

      <!-- Pending Action -->
      @if (!status().isVerified) {
        <div class="animate-fade-in">
          <div class="mb-3 text-sm text-text-secondary">
            <p>
              Te enviamos un link de confirmación a <strong>{{ status().value }}</strong
              >.
            </p>
          </div>

          <button
            type="button"
            (click)="resendEmail()"
            [disabled]="!canResend() || loading()"
            class="inline-flex items-center gap-2 text-sm font-medium text-cta-default hover:text-cta-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (loading()) {
              <span
                class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
              ></span>
              Enviando...
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {{
                cooldownRemaining() > 0
                  ? 'Reenviar en ' + cooldownRemaining() + 's'
                  : 'Reenviar email'
              }}
            }
          </button>

          @if (successMessage()) {
            <p class="mt-2 text-xs text-success-600 animate-fade-in">{{ successMessage() }}</p>
          }
          @if (error()) {
            <p class="mt-2 text-xs text-error-600 animate-fade-in">{{ error() }}</p>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  private readonly emailVerificationService = inject(EmailVerificationService);

  readonly status = this.emailVerificationService.status;
  readonly loading = this.emailVerificationService.loading;
  readonly error = this.emailVerificationService.error;

  readonly cooldownRemaining = signal(0);
  readonly successMessage = signal<string | null>(null);
  readonly canResend = computed(() => this.status().canResend && this.cooldownRemaining() === 0);

  private unsubscribe?: () => void;
  private stopCooldownTimer?: () => void;

  async ngOnInit(): Promise<void> {
    // Load initial status
    await this.emailVerificationService.checkEmailStatus();

    // Subscribe to changes
    this.unsubscribe = this.emailVerificationService.subscribeToEmailChanges((verified) => {
      if (verified) {
        this.successMessage.set('¡Email verificado exitosamente!');
        setTimeout(() => this.successMessage.set(null), SUCCESS_MESSAGE_DURATION_MS);
      }
    });

    // Start cooldown timer if needed
    if (this.status().cooldownSeconds && this.status()!.cooldownSeconds > 0) {
      this.startCooldownTimer();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.stopCooldownTimer?.();
  }

  async resendEmail(): Promise<void> {
    if (!this.canResend()) {
      return;
    }

    this.successMessage.set(null);
    this.emailVerificationService.clearError();

    try {
      await this.emailVerificationService.resendVerificationEmail();
      this.successMessage.set('Email de verificación enviado. Revisa tu bandeja de entrada.');
      this.startCooldownTimer();

      // Auto-hide success message after 5 seconds
      setTimeout(() => this.successMessage.set(null), SUCCESS_MESSAGE_DURATION_MS);
    } catch (_error) {
      // Error is handled by service
      console.error('Failed to resend verification email:', _error);
    }
  }

  private startCooldownTimer(): void {
    this.stopCooldownTimer?.();

    this.stopCooldownTimer = this.emailVerificationService.startCooldownTimer((remaining) => {
      this.cooldownRemaining.set(remaining);
    });
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
