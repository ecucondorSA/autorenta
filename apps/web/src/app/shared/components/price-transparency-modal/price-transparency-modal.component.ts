import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Price Transparency Modal
 *
 * Modal informativo estilo Airbnb que explica al usuario
 * que los precios mostrados incluyen TODAS las tarifas.
 *
 * Uso:
 * <app-price-transparency-modal
 *   (close)="onModalClose()"
 * />
 */
@Component({
  selector: 'app-price-transparency-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-surface-raised rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in"
        (click)="$event.stopPropagation()"
      >
        <!-- Close button -->
        <button
          (click)="onClose()"
          class="absolute top-4 right-4 text-text-muted hover:text-text-secondary transition"
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

        <!-- Icon - Auto con etiqueta de precio -->
        <div class="mb-6 flex justify-center relative">
          <!-- Auto icon -->
          <div class="w-20 h-20 rounded-2xl bg-cta-default/10 flex items-center justify-center">
            <svg
              class="w-12 h-12 text-cta-default"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          </div>
          <!-- Tag badge (etiqueta de precio) -->
          <div
            class="absolute -top-2 -right-2 w-10 h-10 rounded-lg bg-success-icon flex items-center justify-center transform rotate-12 shadow-lg"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <!-- Content -->
        <div class="text-center mb-8">
          <h2 class="h2 text-text-primary mb-4">El precio que ves incluye todo</h2>
          <p class="text-text-secondary text-base leading-relaxed">
            En AutoRenta, el precio que te mostramos para tu alquiler
            <strong class="text-text-primary">incluye todas las tarifas</strong>. Sin sorpresas al
            finalizar la reserva.
          </p>
        </div>

        <!-- Feature list -->
        <div class="space-y-3 mb-8">
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-success-icon flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p class="text-sm text-text-secondary">
              <strong class="text-text-primary">Precio del alquiler</strong> completo
            </p>
          </div>

          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-success-icon flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p class="text-sm text-text-secondary">
              <strong class="text-text-primary">Tarifas de servicio</strong> de AutoRenta
            </p>
          </div>

          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-success-icon flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p class="text-sm text-text-secondary">
              <strong class="text-text-primary">Impuestos</strong> incluidos
            </p>
          </div>

          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 text-success-icon flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p class="text-sm text-text-secondary">
              <strong class="text-text-primary">Seguro básico</strong> (si aplica)
            </p>
          </div>
        </div>

        <!-- CTA Button -->
        <button
          (click)="onClose()"
          class="w-full py-4 px-6 bg-cta-default hover:bg-cta-hover text-cta-text font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Entendido
        </button>

        <!-- Footer note -->
        <p class="text-xs text-text-muted text-center mt-4">
          Los extras opcionales se cobran por separado
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
    `,
  ],
})
export class PriceTransparencyModalComponent {
  // Evento de cierre
  closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }

  onBackdropClick(_event: MouseEvent): void {
    this.onClose();
  }
}
