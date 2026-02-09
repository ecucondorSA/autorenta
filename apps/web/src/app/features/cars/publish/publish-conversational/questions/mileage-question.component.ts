import { Component, input, output, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Mileage input question
 * Features numeric input with visual feedback
 */
@Component({
  selector: 'app-mileage-question',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Large number input -->
      <div class="text-center">
        <div class="relative inline-block">
          <input
            type="text"
            inputmode="numeric"
            [ngModel]="formattedValue()"
            (ngModelChange)="onInputChange($event)"
            placeholder="0"
            class="w-64 text-center text-5xl font-bold bg-transparent border-b-4 border-border-default focus:border-cta-default focus:outline-none transition-colors py-4"
          />
          <span class="absolute right-0 bottom-4 text-2xl font-medium text-text-muted">km</span>
        </div>
      </div>

      <!-- Mileage context -->
      @if (mileage() !== null) {
        <div class="text-center">
          @if (mileage()! < 30000) {
            <div
              class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Bajo kilometraje - Excelente para alquilar</span>
            </div>
          } @else if (mileage()! < 80000) {
            <div
              class="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Kilometraje promedio - Buena opción</span>
            </div>
          } @else if (mileage()! < 150000) {
            <div
              class="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Kilometraje alto - Precio competitivo recomendado</span>
            </div>
          } @else {
            <div
              class="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>Kilometraje muy alto - Considerá un precio más bajo</span>
            </div>
          }
        </div>
      }

      <!-- Quick select options -->
      <div class="flex flex-wrap justify-center gap-2">
        <span class="w-full text-center text-xs text-text-muted mb-2">Selección rápida:</span>
        @for (option of quickOptions; track option) {
          <button
            type="button"
            (click)="selectQuickOption(option)"
            class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            [class.bg-cta-default]="mileage() === option"
            [class.text-white]="mileage() === option"
            [class.bg-surface-secondary]="mileage() !== option"
            [class.text-text-secondary]="mileage() !== option"
            [class.hover:bg-surface-hover]="mileage() !== option"
          >
            {{ formatNumber(option) }} km
          </button>
        }
      </div>

      <!-- Info tip -->
      <div class="flex items-start gap-3 p-4 bg-surface-secondary rounded-xl">
        <svg
          class="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-sm text-text-secondary">
          El kilometraje actual de tu vehículo. Esto ayuda a los interesados a conocer el estado del
          auto y nos permite sugerirte un precio justo.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      input[type='number'] {
        -moz-appearance: textfield;
      }
    `,
  ],
})
export class MileageQuestionComponent implements OnInit {
  readonly initialValue = input<number | null>(null);
  readonly mileageChanged = output<number>();

  readonly mileage = signal<number | null>(null);

  readonly quickOptions = [10000, 30000, 50000, 80000, 100000, 150000];

  ngOnInit(): void {
    const initial = this.initialValue();
    if (initial !== null) {
      this.mileage.set(initial);
    }
  }

  formattedValue(): string {
    const value = this.mileage();
    if (value === null) return '';
    return this.formatNumber(value);
  }

  formatNumber(value: number): string {
    return value.toLocaleString('es-AR');
  }

  onInputChange(value: string): void {
    // Remove non-numeric characters
    const numericValue = parseInt(value.replace(/\D/g, ''), 10);
    if (!isNaN(numericValue)) {
      this.mileage.set(numericValue);
      this.mileageChanged.emit(numericValue);
    } else if (value === '') {
      this.mileage.set(null);
    }
  }

  selectQuickOption(value: number): void {
    this.mileage.set(value);
    this.mileageChanged.emit(value);
  }
}
