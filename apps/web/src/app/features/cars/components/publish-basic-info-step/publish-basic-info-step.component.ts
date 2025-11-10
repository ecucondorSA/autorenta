import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';

export interface PublishBasicInfo {
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  doors: number;
  seats: number;
  color: string;
  licensePlate: string;
}

/**
 * PublishBasicInfoStepComponent - Step 1 of publish car wizard
 *
 * Basic vehicle information entry
 */
@Component({
  selector: 'app-publish-basic-info-step',
  standalone: true,
  imports: [CommonModule, FormsModule, WizardStepComponent],
  template: `
    <app-wizard-step
      title="Información Básica"
      subtitle="Completa los datos principales de tu vehículo">

      <div class="basic-info-form">
        <!-- Vehicle Identity -->
        <div class="form-section">
          <h3 class="section-title">Identificación del Vehículo</h3>

          <div class="form-grid">
            <!-- Brand -->
            <div class="form-field">
              <label for="brand" class="field-label">
                Marca <span class="required">*</span>
              </label>
              <select
                id="brand"
                class="field-input"
                [(ngModel)]="localData.brand"
                (change)="handleBrandChange()"
                required>
                <option value="">Seleccionar marca</option>
                @for (brand of availableBrands; track brand) {
                  <option [value]="brand">{{ brand }}</option>
                }
              </select>
            </div>

            <!-- Model -->
            <div class="form-field">
              <label for="model" class="field-label">
                Modelo <span class="required">*</span>
              </label>
              <input
                type="text"
                id="model"
                class="field-input"
                [(ngModel)]="localData.model"
                placeholder="Ej: Corolla"
                required
                [disabled]="!localData.brand"
              />
            </div>

            <!-- Year -->
            <div class="form-field">
              <label for="year" class="field-label">
                Año <span class="required">*</span>
              </label>
              <input
                type="number"
                id="year"
                class="field-input"
                [(ngModel)]="localData.year"
                [min]="minYear"
                [max]="maxYear"
                placeholder="2020"
                required
              />
            </div>

            <!-- License Plate -->
            <div class="form-field">
              <label for="licensePlate" class="field-label">
                Patente <span class="required">*</span>
              </label>
              <input
                type="text"
                id="licensePlate"
                class="field-input"
                [(ngModel)]="localData.licensePlate"
                placeholder="ABC123"
                required
                maxlength="7"
              />
            </div>
          </div>
        </div>

        <!-- Vehicle Specs -->
        <div class="form-section">
          <h3 class="section-title">Especificaciones</h3>

          <div class="form-grid">
            <!-- Category -->
            <div class="form-field">
              <label for="category" class="field-label">
                Categoría <span class="required">*</span>
              </label>
              <select
                id="category"
                class="field-input"
                [(ngModel)]="localData.category"
                required>
                <option value="">Seleccionar categoría</option>
                @for (cat of availableCategories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
            </div>

            <!-- Transmission -->
            <div class="form-field">
              <label for="transmission" class="field-label">
                Transmisión <span class="required">*</span>
              </label>
              <select
                id="transmission"
                class="field-input"
                [(ngModel)]="localData.transmission"
                required>
                <option value="">Seleccionar</option>
                <option value="manual">Manual</option>
                <option value="automatic">Automático</option>
                <option value="semi-automatic">Semiautomático</option>
              </select>
            </div>

            <!-- Fuel Type -->
            <div class="form-field">
              <label for="fuelType" class="field-label">
                Combustible <span class="required">*</span>
              </label>
              <select
                id="fuelType"
                class="field-input"
                [(ngModel)]="localData.fuelType"
                required>
                <option value="">Seleccionar</option>
                <option value="gasoline">Nafta</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Híbrido</option>
                <option value="electric">Eléctrico</option>
                <option value="gnc">GNC</option>
              </select>
            </div>

            <!-- Color -->
            <div class="form-field">
              <label for="color" class="field-label">
                Color <span class="required">*</span>
              </label>
              <input
                type="text"
                id="color"
                class="field-input"
                [(ngModel)]="localData.color"
                placeholder="Ej: Blanco"
                required
              />
            </div>

            <!-- Doors -->
            <div class="form-field">
              <label for="doors" class="field-label">
                Puertas <span class="required">*</span>
              </label>
              <select
                id="doors"
                class="field-input"
                [(ngModel)]="localData.doors"
                required>
                <option value="">Seleccionar</option>
                <option [value]="2">2 puertas</option>
                <option [value]="3">3 puertas</option>
                <option [value]="4">4 puertas</option>
                <option [value]="5">5 puertas</option>
              </select>
            </div>

            <!-- Seats -->
            <div class="form-field">
              <label for="seats" class="field-label">
                Asientos <span class="required">*</span>
              </label>
              <select
                id="seats"
                class="field-input"
                [(ngModel)]="localData.seats"
                required>
                <option value="">Seleccionar</option>
                <option [value]="2">2 asientos</option>
                <option [value]="4">4 asientos</option>
                <option [value]="5">5 asientos</option>
                <option [value]="7">7 asientos</option>
                <option [value]="9">9 asientos</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [`
    .basic-info-form {
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

    .field-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--surface-hover);
    }

    .field-input::placeholder {
      color: var(--text-placeholder);
    }

    /* Mobile */
    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PublishBasicInfoStepComponent {
  // ==================== INPUTS ====================

  data = input<PublishBasicInfo>({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    category: '',
    transmission: '',
    fuelType: '',
    doors: 4,
    seats: 5,
    color: '',
    licensePlate: ''
  });

  // ==================== OUTPUTS ====================

  dataChange = output<PublishBasicInfo>();
  validChange = output<boolean>();

  // ==================== STATE ====================

  localData: PublishBasicInfo = {
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    category: '',
    transmission: '',
    fuelType: '',
    doors: 4,
    seats: 5,
    color: '',
    licensePlate: ''
  };

  minYear = 1980;
  maxYear = new Date().getFullYear() + 1;

  availableBrands = [
    'Toyota', 'Ford', 'Chevrolet', 'Volkswagen', 'Fiat', 'Renault',
    'Peugeot', 'Honda', 'Nissan', 'Hyundai', 'Citroën', 'Jeep'
  ];

  availableCategories = [
    { value: 'economy', label: 'Económico' },
    { value: 'sedan', label: 'Sedán' },
    { value: 'suv', label: 'SUV' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'van', label: 'Van' },
    { value: 'luxury', label: 'Lujo' },
    { value: 'sports', label: 'Deportivo' }
  ];

  // ==================== COMPUTED ====================

  readonly isValid = computed(() => {
    return this.localData.brand !== '' &&
           this.localData.model.trim() !== '' &&
           this.localData.year >= this.minYear &&
           this.localData.year <= this.maxYear &&
           this.localData.category !== '' &&
           this.localData.transmission !== '' &&
           this.localData.fuelType !== '' &&
           this.localData.color.trim() !== '' &&
           this.localData.licensePlate.trim() !== '' &&
           this.localData.doors > 0 &&
           this.localData.seats > 0;
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

  handleBrandChange(): void {
    // Could load models for selected brand here
    console.log('Brand changed to:', this.localData.brand);
  }
}
