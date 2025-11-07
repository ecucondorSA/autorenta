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
import { TranslateModule } from '@ngx-translate/core';
import { EmailVerificationService } from '../../../core/services/email-verification.service';

@Component({
  standalone: true,
  selector: 'app-email-verification',
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 p-6">
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
            <h4 class="font-semibold text-gray-900">Verificación de Email</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ status().value || 'No configurado' }}</p>
          </div>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full" [class]="getStatusLabelClass()">
          {{ getStatusLabel() }}
        </span>
      </div>

      <!-- Verified State -->
      <div *ngIf="status().isVerified" class="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-medium">Email verificado exitosamente</span>
        </div>
        <p class="text-xs text-green-700 mt-2">
          Verificado el {{ formatDate(status().verifiedAt) }}
        </p>
      </div>

      <!-- Pending State -->
      <div *ngIf="!status().isVerified" class="space-y-4">
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">
            Te enviamos un email de verificación a
            <strong>{{ status().value }}</strong
            >. Por favor revisa tu bandeja de entrada y haz click en el link de confirmación.
          </p>
        </div>

        <!-- Resend Button -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="resendEmail()"
            [disabled]="!canResend() || loading()"
            class="flex-grow px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            [class]="
              canResend()
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'bg-gray-200 text-gray-500 dark:text-gray-300 cursor-not-allowed'
            "
          >
            <span *ngIf="!loading()" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>{{
                cooldownRemaining() > 0
                  ? 'Espera ' + cooldownRemaining() + 's'
                  : 'Reenviar email'
              }}</span>
            </span>
            <span *ngIf="loading()" class="flex items-center justify-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enviando...</span>
            </span>
          </button>
        </div>

        <!-- Success Message -->
        <div
          *ngIf="successMessage()"
          class="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
        >
          {{ successMessage() }}
        </div>

        <!-- Error Message -->
        <div
          *ngIf="error()"
          class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
        >
          {{ error() }}
        </div>

        <!-- Help Text -->
        <div class="text-xs text-gray-500 dark:text-gray-300">
          <p>• Revisa tu carpeta de spam si no encuentras el email</p>
          <p>• El link de verificación expira en 24 horas</p>
          <p>• Puedes reenviar el email cada 60 segundos</p>
        </div>
      </div>
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
  readonly canResend = computed(
    () => this.status().canResend && this.cooldownRemaining() === 0,
  );

  private unsubscribe?: () => void;
  private stopCooldownTimer?: () => void;

  async ngOnInit(): Promise<void> {
    // Load initial status
    await this.emailVerificationService.checkEmailStatus();

    // Subscribe to changes
    this.unsubscribe = this.emailVerificationService.subscribeToEmailChanges((verified) => {
      if (verified) {
        this.successMessage.set('¡Email verificado exitosamente!');
        setTimeout(() => this.successMessage.set(null), 5000);
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
      setTimeout(() => this.successMessage.set(null), 5000);
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
      ? 'bg-green-100 text-green-600'
      : 'bg-yellow-100 text-yellow-600';
  }

  getStatusLabel(): string {
    return this.status().isVerified ? 'Verificado' : 'Pendiente';
  }

  getStatusLabelClass(): string {
    return this.status().isVerified
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
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
