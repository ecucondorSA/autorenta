import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RefundService } from '../../../core/services/refund.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-refund-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white dark:bg-gray-700-pure rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-pearl-light">
            Solicitar Reembolso
          </h2>
          <button
            type="button"
            (click)="close()"
            class="text-charcoal-medium hover:text-gray-900 dark:hover:text-pearl-light transition-colors"
            aria-label="Cerrar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="space-y-4">
          <p class="text-sm text-charcoal-medium dark:text-pearl-light">
            Puedes solicitar un reembolso completo o parcial para esta reserva. Nuestro equipo revisará tu solicitud.
          </p>

          <!-- Refund Type Selector -->
          <div>
            <label class="block text-sm font-medium text-gray-900 dark:text-pearl-light mb-2">
              Tipo de Reembolso *
            </label>
            <div class="space-y-2">
              <label class="flex items-center p-3 border-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                [class.border-sky-500]="refundType() === 'full'"
                [class.border-gray-300]="refundType() !== 'full'">
                <input
                  type="radio"
                  [checked]="refundType() === 'full'"
                  (change)="refundType.set('full')"
                  class="mr-3"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">Reembolso Completo</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Se reembolsará el monto total de la reserva</div>
                </div>
              </label>
              <label class="flex items-center p-3 border-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                [class.border-sky-500]="refundType() === 'partial'"
                [class.border-gray-300]="refundType() !== 'partial'">
                <input
                  type="radio"
                  [checked]="refundType() === 'partial'"
                  (change)="refundType.set('partial')"
                  class="mr-3"
                />
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white">Reembolso Parcial</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Especifica el monto a reembolsar</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Partial Amount Input -->
          @if (refundType() === 'partial') {
            <div>
              <label class="block text-sm font-medium text-gray-900 dark:text-pearl-light mb-2">
                Monto a Reembolsar (USD) *
              </label>
              <input
                type="number"
                [(ngModel)]="partialAmount"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all"
              />
            </div>
          }

          <!-- Reason -->
          <div>
            <label class="block text-sm font-medium text-gray-900 dark:text-pearl-light mb-2">
              Motivo del Reembolso *
            </label>
            <textarea
              [(ngModel)]="reason"
              rows="4"
              placeholder="Explica el motivo del reembolso..."
              class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-gray-700 focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all resize-none"
              required
            ></textarea>
          </div>

          <!-- Error Message -->
          <div
            *ngIf="error()"
            class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400"
          >
            {{ error() }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            (click)="close()"
            class="flex-1 px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 text-charcoal-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="submit()"
            [disabled]="!canSubmit() || loading()"
            [class.opacity-50]="!canSubmit() || loading()"
            [class.cursor-not-allowed]="!canSubmit() || loading()"
            class="flex-1 px-4 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-600/90 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg
              *ngIf="loading()"
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{{ loading() ? 'Procesando...' : 'Solicitar Reembolso' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RefundRequestComponent {
  private readonly refundService = inject(RefundService);
  private readonly toastService = inject(ToastService);

  readonly isOpen = input.required<boolean>();
  readonly bookingId = input.required<string>();

  readonly closeModal = output<void>();
  readonly refundRequested = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly refundType = signal<'full' | 'partial'>('full');
  partialAmount = 0;
  reason = '';

  canSubmit(): boolean {
    if (!this.reason.trim()) return false;
    if (this.refundType() === 'partial') {
      return this.partialAmount > 0;
    }
    return true;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.resetForm();
    this.closeModal.emit();
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.refundService.processRefund({
        booking_id: this.bookingId(),
        refund_type: this.refundType(),
        amount: this.refundType() === 'partial' ? this.partialAmount : undefined,
        reason: this.reason.trim(),
      });

      this.toastService.success('Solicitud de reembolso enviada. Nuestro equipo la revisará pronto.');
      this.refundRequested.emit();
      this.close();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error al solicitar el reembolso'
      );
    } finally {
      this.loading.set(false);
    }
  }

  private resetForm(): void {
    this.refundType.set('full');
    this.partialAmount = 0;
    this.reason = '';
    this.error.set(null);
  }
}

