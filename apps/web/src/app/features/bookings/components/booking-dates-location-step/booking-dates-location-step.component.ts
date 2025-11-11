import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';

export interface BookingDatesLocation {
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  dropoffTime: string;
}

/**
 * BookingDatesLocationStepComponent - Step 1 of booking checkout wizard
 *
 * Allows user to review and edit:
 * - Start and end dates
 * - Pickup and dropoff locations
 * - Pickup and dropoff times
 */
@Component({
  selector: 'app-booking-dates-location-step',
  standalone: true,
  imports: [CommonModule, FormsModule, WizardStepComponent],
  template: `
    <app-wizard-step
      title="Fechas y Ubicación"
      subtitle="Revisa y confirma las fechas y ubicaciones de tu reserva">

      <div class="dates-location-form">
        <!-- Dates Section -->
        <div class="form-section">
          <h3 class="section-title">Fechas de la Reserva</h3>

          <div class="form-grid">
            <!-- Start Date -->
            <div class="form-field">
              <label for="startDate" class="field-label">
                Fecha de Inicio
                <span class="required">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                class="field-input"
                [(ngModel)]="localData.startDate"
                [min]="minStartDate"
                (change)="handleDateChange()"
                required
              />
            </div>

            <!-- Start Time -->
            <div class="form-field">
              <label for="startTime" class="field-label">
                Hora de Retiro
                <span class="required">*</span>
              </label>
              <select
                id="startTime"
                class="field-input"
                [(ngModel)]="localData.pickupTime"
                required>
                @for (time of availableTimes; track time) {
                  <option [value]="time">{{ time }}</option>
                }
              </select>
            </div>

            <!-- End Date -->
            <div class="form-field">
              <label for="endDate" class="field-label">
                Fecha de Devolución
                <span class="required">*</span>
              </label>
              <input
                type="date"
                id="endDate"
                class="field-input"
                [(ngModel)]="localData.endDate"
                [min]="minEndDate()"
                (change)="handleDateChange()"
                required
              />
            </div>

            <!-- End Time -->
            <div class="form-field">
              <label for="endTime" class="field-label">
                Hora de Devolución
                <span class="required">*</span>
              </label>
              <select
                id="endTime"
                class="field-input"
                [(ngModel)]="localData.dropoffTime"
                required>
                @for (time of availableTimes; track time) {
                  <option [value]="time">{{ time }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Duration Info -->
          @if (durationDays() > 0) {
            <div class="duration-info">
              <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Duración total: {{ durationDays() }} día{{ durationDays() > 1 ? 's' : '' }}</span>
            </div>
          }
        </div>

        <!-- Locations Section -->
        <div class="form-section">
          <h3 class="section-title">Ubicaciones</h3>

          <div class="form-grid">
            <!-- Pickup Location -->
            <div class="form-field">
              <label for="pickupLocation" class="field-label">
                Lugar de Retiro
                <span class="required">*</span>
              </label>
              <input
                type="text"
                id="pickupLocation"
                class="field-input"
                [(ngModel)]="localData.pickupLocation"
                placeholder="Ej: Aeropuerto Internacional"
                required
              />
              <p class="field-hint">Dirección donde retirarás el vehículo</p>
            </div>

            <!-- Dropoff Location -->
            <div class="form-field">
              <label for="dropoffLocation" class="field-label">
                Lugar de Devolución
                <span class="required">*</span>
              </label>
              <input
                type="text"
                id="dropoffLocation"
                class="field-input"
                [(ngModel)]="localData.dropoffLocation"
                placeholder="Ej: Centro de la ciudad"
                required
              />
              <p class="field-hint">Dirección donde devolverás el vehículo</p>
            </div>
          </div>

          <!-- Different Location Warning -->
          @if (isDifferentLocation()) {
            <div class="location-warning">
              <svg class="warning-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <div>
                <p class="warning-title">Ubicaciones diferentes detectadas</p>
                <p class="warning-text">Ten en cuenta que podrían aplicarse cargos adicionales por devolución en ubicación diferente.</p>
              </div>
            </div>
          }
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [`
    .dates-location-form {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .field-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .required {
      color: var(--error-600);
    }

    .field-input {
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--surface-base);
      transition: all var(--duration-fast) var(--ease-default);
    }

    .field-input:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--border-focus)/20;
    }

    .field-input::placeholder {
      color: var(--text-placeholder);
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .duration-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--info-50);
      border: 1px solid var(--info-200);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      color: var(--info-700);
    }

    .info-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .location-warning {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--warning-50);
      border: 1px solid var(--warning-200);
      border-radius: var(--radius-md);
    }

    .warning-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: var(--warning-700);
      flex-shrink: 0;
    }

    .warning-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--warning-900);
      margin: 0 0 0.25rem 0;
    }

    .warning-text {
      font-size: 0.8125rem;
      color: var(--warning-700);
      margin: 0;
    }

    /* Mobile */
    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BookingDatesLocationStepComponent {
  // ==================== INPUTS ====================

  /**
   * Initial data
   */
  data = input<BookingDatesLocation>({
    startDate: '',
    endDate: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '10:00',
    dropoffTime: '10:00'
  });

  // ==================== OUTPUTS ====================

  /**
   * Emitted when data changes
   */
  dataChange = output<BookingDatesLocation>();

  /**
   * Emitted when validation state changes
   */
  validChange = output<boolean>();

  // ==================== STATE ====================

  /**
   * Local editable data
   */
  localData: BookingDatesLocation = {
    startDate: '',
    endDate: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '10:00',
    dropoffTime: '10:00'
  };

  /**
   * Available times for pickup/dropoff
   */
  availableTimes = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00'
  ];

  /**
   * Minimum start date (today)
   */
  minStartDate = new Date().toISOString().split('T')[0];

  // ==================== COMPUTED ====================

  /**
   * Minimum end date (start date + 1 day)
   */
  readonly minEndDate = computed(() => {
    if (!this.localData.startDate) return this.minStartDate;

    const start = new Date(this.localData.startDate);
    start.setDate(start.getDate() + 1);
    return start.toISOString().split('T')[0];
  });

  /**
   * Duration in days
   */
  readonly durationDays = computed(() => {
    if (!this.localData.startDate || !this.localData.endDate) return 0;

    const start = new Date(this.localData.startDate);
    const end = new Date(this.localData.endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  /**
   * Is pickup and dropoff location different?
   */
  readonly isDifferentLocation = computed(() => {
    return this.localData.pickupLocation.trim() !== '' &&
           this.localData.dropoffLocation.trim() !== '' &&
           this.localData.pickupLocation !== this.localData.dropoffLocation;
  });

  /**
   * Is form valid?
   */
  readonly isValid = computed(() => {
    return this.localData.startDate !== '' &&
           this.localData.endDate !== '' &&
           this.localData.pickupLocation.trim() !== '' &&
           this.localData.dropoffLocation.trim() !== '' &&
           this.localData.pickupTime !== '' &&
           this.localData.dropoffTime !== '' &&
           this.durationDays() > 0;
  });

  // ==================== LIFECYCLE ====================

  constructor() {
    // Initialize local data from input
    effect(() => {
      this.localData = { ...this.data() };
    }, { allowSignalWrites: true });

    // Emit changes when local data changes
    effect(() => {
      const valid = this.isValid();
      this.validChange.emit(valid);

      if (valid) {
        this.dataChange.emit({ ...this.localData });
      }
    });
  }

  // ==================== METHODS ====================

  /**
   * Handle date change
   */
  handleDateChange(): void {
    // Ensure end date is after start date
    if (this.localData.startDate && this.localData.endDate) {
      const start = new Date(this.localData.startDate);
      const end = new Date(this.localData.endDate);

      if (end <= start) {
        const newEnd = new Date(start);
        newEnd.setDate(newEnd.getDate() + 1);
        this.localData.endDate = newEnd.toISOString().split('T')[0];
      }
    }
  }
}
