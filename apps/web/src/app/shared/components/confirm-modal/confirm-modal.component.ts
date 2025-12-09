import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
  icon?: string;
}

/**
 * Branded Confirmation Modal
 *
 * Reemplaza confirm() nativo con un modal estilizado que sigue el design system.
 *
 * @example
 * const confirmed = await confirmModalService.confirm({
 *   title: 'Cancelar reserva',
 *   message: '¿Seguro querés cancelar? Esta acción no se puede deshacer.',
 *   confirmText: 'Sí, cancelar',
 *   variant: 'danger'
 * });
 */
@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'confirm-modal-title'"
      >
        <!-- Modal -->
        <div
          class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-modal-enter"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div
            class="p-6 pb-4 border-b border-gray-100 dark:border-gray-800"
            [ngClass]="headerClass()"
          >
            <!-- Icon -->
            <div class="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" [ngClass]="iconBgClass()">
              @switch (options()?.variant) {
                @case ('danger') {
                  <svg class="w-6 h-6" [ngClass]="iconClass()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                }
                @case ('warning') {
                  <svg class="w-6 h-6" [ngClass]="iconClass()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
                @default {
                  <svg class="w-6 h-6" [ngClass]="iconClass()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
              }
            </div>

            <h3 id="confirm-modal-title" class="text-lg font-bold text-center text-gray-900 dark:text-white">
              {{ options()?.title }}
            </h3>
          </div>

          <!-- Body -->
          <div class="p-6">
            <p class="text-center text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {{ options()?.message }}
            </p>
          </div>

          <!-- Footer -->
          <div class="p-6 pt-0 flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              (click)="onCancel()"
            >
              {{ options()?.cancelText || 'Cancelar' }}
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
              [ngClass]="confirmButtonClass()"
              (click)="onConfirm()"
            >
              {{ options()?.confirmText || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes modal-enter {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .animate-modal-enter {
      animation: modal-enter 0.2s ease-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModalComponent {
  readonly isOpen = signal(false);
  readonly options = signal<ConfirmModalOptions | null>(null);

  private resolvePromise: ((value: boolean) => void) | null = null;

  open(options: ConfirmModalOptions): Promise<boolean> {
    this.options.set(options);
    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  onConfirm(): void {
    this.isOpen.set(false);
    this.resolvePromise?.(true);
    this.resolvePromise = null;
  }

  onCancel(): void {
    this.isOpen.set(false);
    this.resolvePromise?.(false);
    this.resolvePromise = null;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  headerClass(): string {
    return '';
  }

  iconBgClass(): string {
    switch (this.options()?.variant) {
      case 'danger':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30';
    }
  }

  iconClass(): string {
    switch (this.options()?.variant) {
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  confirmButtonClass(): string {
    switch (this.options()?.variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-black';
      default:
        return 'bg-[#00D95F] hover:bg-[#00C553] text-black';
    }
  }
}
