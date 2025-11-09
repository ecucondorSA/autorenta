import {
  Component,
  signal,
  output,
  input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import type { Instance } from 'flatpickr/dist/types/instance';
import { format } from 'date-fns';

export interface BlockDateRequest {
  startDate: Date;
  endDate: Date;
  reason: 'maintenance' | 'personal_use' | 'vacation' | 'other';
  notes?: string;
  applyToAllCars: boolean;
}

@Component({
  selector: 'app-block-date-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white dark:bg-slate-deep-pure rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-smoke-black dark:text-pearl-light">
            {{ title() || 'Bloquear Fechas' }}
          </h2>
          <button
            type="button"
            (click)="close()"
            class="text-charcoal-medium hover:text-smoke-black dark:hover:text-pearl-light transition-colors"
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

        <!-- Form -->
        <div class="space-y-4">
          <!-- Date Range Picker -->
          <div>
            <label class="block text-sm font-medium text-smoke-black dark:text-pearl-light mb-2">
              Rango de Fechas *
            </label>
            <input
              #dateInput
              type="text"
              placeholder="Seleccionar fechas"
              readonly
              class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-slate-deep focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all cursor-pointer"
            />
            <p class="text-xs text-charcoal-medium dark:text-pearl-light mt-1">
              {{ dateRangeText() }}
            </p>
          </div>

          <!-- Reason Selector -->
          <div>
            <label class="block text-sm font-medium text-smoke-black dark:text-pearl-light mb-2">
              Motivo *
            </label>
            <select
              [(ngModel)]="selectedReason"
              class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-slate-deep focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all"
            >
              <option value="">-- Seleccionar motivo --</option>
              <option value="maintenance">🔧 Mantenimiento</option>
              <option value="personal_use">🚗 Uso Personal</option>
              <option value="vacation">🏖️ Vacaciones</option>
              <option value="other">📝 Otro</option>
            </select>
          </div>

          <!-- Notes (Optional) -->
          <div>
            <label class="block text-sm font-medium text-smoke-black dark:text-pearl-light mb-2">
              Notas (opcional)
            </label>
            <textarea
              [(ngModel)]="notes"
              rows="3"
              placeholder="Ej: Cambio de aceite programado, revisión técnica, etc."
              class="w-full px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 bg-white dark:bg-slate-deep focus:border-accent-petrol focus:ring-2 focus:ring-accent-petrol/20 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Apply to All Cars (only show if has multiple cars) -->
          <div
            *ngIf="hasMultipleCars()"
            class="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl"
          >
            <input
              type="checkbox"
              id="applyToAll"
              [(ngModel)]="applyToAllCars"
              class="mt-1 w-4 h-4 text-accent-petrol border-pearl-gray rounded focus:ring-accent-petrol"
            />
            <label
              for="applyToAll"
              class="flex-1 text-sm text-smoke-black dark:text-pearl-light cursor-pointer"
            >
              <span class="font-semibold">Aplicar a todos mis autos</span>
              <p class="text-xs text-charcoal-medium dark:text-gray-400 mt-0.5">
                Bloqueará estas fechas en todos tus vehículos
              </p>
            </label>
          </div>

          <!-- Error Message -->
          <div
            *ngIf="errorMessage()"
            class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400"
          >
            {{ errorMessage() }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            (click)="close()"
            class="flex-1 px-4 py-3 rounded-xl border-2 border-pearl-gray dark:border-gray-600 text-charcoal-medium hover:bg-gray-100 dark:hover:bg-slate-deep transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="submit()"
            [disabled]="!canSubmit() || loading()"
            [class.opacity-50]="!canSubmit() || loading()"
            [class.cursor-not-allowed]="!canSubmit() || loading()"
            class="flex-1 px-4 py-3 rounded-xl bg-accent-petrol text-white hover:bg-accent-petrol/90 transition-all font-medium flex items-center justify-center gap-2"
          >
            <svg
              *ngIf="loading()"
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{{ loading() ? 'Bloqueando...' : 'Bloquear Fechas' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Flatpickr theme override for this modal */
      :host ::ng-deep .flatpickr-calendar {
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        border-radius: 12px;
      }

      :host ::ng-deep .flatpickr-day.selected {
        background: #0891b2 !important;
        border-color: #0891b2 !important;
      }
    `,
  ],
})
export class BlockDateModalComponent implements AfterViewInit, OnDestroy {
  // Inputs
  readonly isOpen = input.required<boolean>();
  readonly title = input<string>();
  readonly hasMultipleCars = input<boolean>(false);
  readonly blockedDates = input<string[]>([]); // YYYY-MM-DD array for disabled dates

  // Outputs
  readonly closeModal = output<void>();
  readonly blockDates = output<BlockDateRequest>();

  // ViewChild
  @ViewChild('dateInput') dateInput!: ElementRef<HTMLInputElement>;

  // State
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dateRangeText = signal<string>('No se ha seleccionado ningún rango');

  selectedReason = '';
  notes = '';
  applyToAllCars = false;

  private flatpickrInstance: Instance | null = null;
  private selectedStartDate: Date | null = null;
  private selectedEndDate: Date | null = null;

  constructor() {
    // Reset form when modal opens
    effect(() => {
      if (this.isOpen()) {
        this.resetForm();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initFlatpickr();
  }

  ngOnDestroy(): void {
    this.destroyFlatpickr();
  }

  private initFlatpickr(): void {
    if (!this.dateInput?.nativeElement) return;

    this.flatpickrInstance = flatpickr(this.dateInput.nativeElement, {
      mode: 'range',
      locale: Spanish,
      dateFormat: 'Y-m-d',
      minDate: 'today',
      disable: this.blockedDates().map((date) => date), // Disable already blocked dates
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          this.selectedStartDate = selectedDates[0];
          this.selectedEndDate = selectedDates[1];

          const days = Math.ceil(
            (this.selectedEndDate!.getTime() - this.selectedStartDate!.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          this.dateRangeText.set(
            `${format(this.selectedStartDate!, 'dd/MM/yyyy')} - ${format(this.selectedEndDate!, 'dd/MM/yyyy')} (${days} días)`,
          );
          this.errorMessage.set(null);
        } else if (selectedDates.length === 1) {
          this.selectedStartDate = selectedDates[0];
          this.selectedEndDate = null;
          this.dateRangeText.set(`Selecciona la fecha final...`);
        } else {
          this.selectedStartDate = null;
          this.selectedEndDate = null;
          this.dateRangeText.set('No se ha seleccionado ningún rango');
        }
      },
    });
  }

  private destroyFlatpickr(): void {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
      this.flatpickrInstance = null;
    }
  }

  canSubmit(): boolean {
    return !!(
      this.selectedStartDate &&
      this.selectedEndDate &&
      this.selectedReason &&
      !this.loading() &&
      !this.errorMessage()
    );
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.errorMessage.set('Por favor completa todos los campos requeridos');
      return;
    }

    const request: BlockDateRequest = {
      startDate: this.selectedStartDate!,
      endDate: this.selectedEndDate!,
      reason: this.selectedReason as BlockDateRequest['reason'],
      notes: this.notes || undefined,
      applyToAllCars: this.applyToAllCars,
    };

    this.blockDates.emit(request);
  }

  close(): void {
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private resetForm(): void {
    this.selectedReason = '';
    this.notes = '';
    this.applyToAllCars = false;
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.dateRangeText.set('No se ha seleccionado ningún rango');
    this.errorMessage.set(null);
    this.loading.set(false);

    // Reset flatpickr
    if (this.flatpickrInstance) {
      this.flatpickrInstance.clear();
    }
  }
}
