import { Component, computed, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';

export interface PublishPriceAvailability {
  dailyRate: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  minimumDays: number;
  maximumDays: number;
  address: string;
  city: string;
  province: string;
  availableFrom: string;
  availableUntil: string;
}

@Component({
  selector: 'app-publish-price-availability-step',
  standalone: true,
  imports: [CommonModule, FormsModule, WizardStepComponent],
  template: `
    <app-wizard-step
      title="Precio y Disponibilidad"
      subtitle="Configura el precio y disponibilidad de tu vehículo"
    >
      <div class="price-availability-form">
        <!-- Pricing -->
        <div class="form-section">
          <h3 class="section-title">Precios</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="dailyRate" class="field-label"
                >Tarifa Diaria (ARS) <span class="required">*</span></label
              >
              <input
                type="number"
                id="dailyRate"
                [(ngModel)]="localData.dailyRate"
                class="field-input"
                min="500"
                step="100"
                required
              />
            </div>
            <div class="form-field">
              <label for="weeklyDiscount" class="field-label">Descuento Semanal (%)</label>
              <input
                type="number"
                id="weeklyDiscount"
                [(ngModel)]="localData.weeklyDiscount"
                class="field-input"
                min="0"
                max="50"
              />
            </div>
            <div class="form-field">
              <label for="monthlyDiscount" class="field-label">Descuento Mensual (%)</label>
              <input
                type="number"
                id="monthlyDiscount"
                [(ngModel)]="localData.monthlyDiscount"
                class="field-input"
                min="0"
                max="50"
              />
            </div>
          </div>
        </div>

        <!-- Rental Limits -->
        <div class="form-section">
          <h3 class="section-title">Límites de Renta</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="minimumDays" class="field-label"
                >Mínimo de Días <span class="required">*</span></label
              >
              <select
                id="minimumDays"
                [(ngModel)]="localData.minimumDays"
                class="field-input"
                required
              >
                <option [value]="1">1 día</option>
                <option [value]="2">2 días</option>
                <option [value]="3">3 días</option>
                <option [value]="7">7 días</option>
              </select>
            </div>
            <div class="form-field">
              <label for="maximumDays" class="field-label"
                >Máximo de Días <span class="required">*</span></label
              >
              <select
                id="maximumDays"
                [(ngModel)]="localData.maximumDays"
                class="field-input"
                required
              >
                <option [value]="7">7 días</option>
                <option [value]="14">14 días</option>
                <option [value]="30">30 días</option>
                <option [value]="90">90 días</option>
                <option [value]="365">Sin límite</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Location -->
        <div class="form-section">
          <h3 class="section-title">Ubicación</h3>
          <div class="form-grid">
            <div class="form-field full-width">
              <label for="address" class="field-label"
                >Dirección <span class="required">*</span></label
              >
              <input
                type="text"
                id="address"
                [(ngModel)]="localData.address"
                class="field-input"
                placeholder="Calle y número"
                required
              />
            </div>
            <div class="form-field">
              <label for="city" class="field-label">Ciudad <span class="required">*</span></label>
              <input
                type="text"
                id="city"
                [(ngModel)]="localData.city"
                class="field-input"
                placeholder="Buenos Aires"
                required
              />
            </div>
            <div class="form-field">
              <label for="province" class="field-label"
                >Provincia <span class="required">*</span></label
              >
              <select id="province" [(ngModel)]="localData.province" class="field-input" required>
                <option value="">Seleccionar</option>
                <option value="buenos_aires">Buenos Aires</option>
                <option value="caba">CABA</option>
                <option value="cordoba">Córdoba</option>
                <option value="santa_fe">Santa Fe</option>
                <option value="mendoza">Mendoza</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Availability Dates -->
        <div class="form-section">
          <h3 class="section-title">Fechas de Disponibilidad</h3>
          <div class="form-grid">
            <div class="form-field">
              <label for="availableFrom" class="field-label"
                >Disponible Desde <span class="required">*</span></label
              >
              <input
                type="date"
                id="availableFrom"
                [(ngModel)]="localData.availableFrom"
                class="field-input"
                [min]="minDate"
                required
              />
            </div>
            <div class="form-field">
              <label for="availableUntil" class="field-label">Disponible Hasta</label>
              <input
                type="date"
                id="availableUntil"
                [(ngModel)]="localData.availableUntil"
                class="field-input"
                [min]="localData.availableFrom"
              />
              <p class="field-hint">Dejar vacío para disponibilidad indefinida</p>
            </div>
          </div>
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [
    `
      .price-availability-form {
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
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border-default);
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
      .form-field.full-width {
        grid-column: 1 / -1;
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
      }
      .field-input:focus {
        outline: none;
        border-color: var(--border-focus);
        box-shadow: 0 0 0 3px var(--border-focus) / 20;
      }
      .field-hint {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin: 0;
      }
      @media (max-width: 768px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PublishPriceAvailabilityStepComponent {
  data = input<PublishPriceAvailability>({
    dailyRate: 5000,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
    minimumDays: 1,
    maximumDays: 30,
    address: '',
    city: '',
    province: '',
    availableFrom: new Date().toISOString().split('T')[0],
    availableUntil: '',
  });
  dataChange = output<PublishPriceAvailability>();
  validChange = output<boolean>();

  localData: PublishPriceAvailability = {
    dailyRate: 5000,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
    minimumDays: 1,
    maximumDays: 30,
    address: '',
    city: '',
    province: '',
    availableFrom: new Date().toISOString().split('T')[0],
    availableUntil: '',
  };

  minDate = new Date().toISOString().split('T')[0];

  readonly isValid = computed(
    () =>
      this.localData.dailyRate >= 500 &&
      this.localData.minimumDays > 0 &&
      this.localData.maximumDays >= this.localData.minimumDays &&
      this.localData.address.trim() !== '' &&
      this.localData.city.trim() !== '' &&
      this.localData.province !== '' &&
      this.localData.availableFrom !== '',
  );

  constructor() {
    effect(
      () => {
        this.localData = { ...this.data() };
      },
      { allowSignalWrites: true },
    );
    effect(() => {
      const valid = this.isValid();
      this.validChange.emit(valid);
      if (valid) this.dataChange.emit({ ...this.localData });
    });
  }
}
