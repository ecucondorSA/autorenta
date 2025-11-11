import { Component, computed, effect, inject, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';
import { PricingService } from '../../../../core/services/pricing.service';

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
      subtitle="Completa los datos principales de tu vehículo"
    >
      <div class="basic-info-form">
        <!-- Vehicle Identity -->
        <div class="form-section">
          <h3 class="section-title">Identificación del Vehículo</h3>

          <div class="form-grid">
            <!-- Brand -->
            <div class="form-field">
              <label for="brand" class="field-label"> Marca <span class="required">*</span> </label>
              <select
                id="brand"
                class="field-input"
                [(ngModel)]="localData.brand"
                (change)="handleBrandChange()"
                required
              >
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
              <label for="year" class="field-label"> Año <span class="required">*</span> </label>
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

        <!-- Price Estimation (shown when brand/model/year filled) -->
        @if (valueEstimation()) {
          <div class="estimation-panel" [class.high-confidence]="valueEstimation()?.confidence === 'high'">
            <div class="estimation-header">
              <span class="estimation-icon">💰</span>
              <h4 class="estimation-title">Valoración Estimada</h4>
              @if (isEstimating()) {
                <span class="estimation-loading">Calculando...</span>
              }
            </div>

            <div class="estimation-content">
              <div class="estimation-row">
                <span class="estimation-label">Valor del vehículo:</span>
                <span class="estimation-value">
                  {{ '$' + ((valueEstimation()?.estimated_value_usd ?? 0) | number : '1.0-0') + ' USD' }}
                </span>
              </div>

              @if (valueEstimation()?.suggested_daily_rate_usd) {
                <div class="estimation-row">
                  <span class="estimation-label">Precio sugerido por día:</span>
                  <span class="estimation-value highlight">
                    {{ '$' + ((valueEstimation()?.suggested_daily_rate_usd ?? 0) | number : '1.0-0') + ' USD' }}
                    <span class="estimation-note">(~0.3% del valor)</span>
                  </span>
                </div>
              }

              <div class="estimation-row">
                <span class="estimation-label">Confianza:</span>
                <span
                  class="estimation-badge"
                  [class.high]="valueEstimation()?.confidence === 'high'"
                  [class.medium]="valueEstimation()?.confidence === 'medium'"
                  [class.low]="valueEstimation()?.confidence === 'low'"
                >
                  {{
                    valueEstimation()?.confidence === 'high'
                      ? '⭐ Alta'
                      : valueEstimation()?.confidence === 'medium'
                        ? '🟡 Media'
                        : '🟠 Baja'
                  }}
                </span>
              </div>

              @if (valueEstimation()?.category_name) {
                <div class="estimation-row">
                  <span class="estimation-label">Categoría sugerida:</span>
                  <span class="estimation-category">{{ valueEstimation()?.category_name }}</span>
                </div>
              }

              <p class="estimation-disclaimer">
                * Esta es una estimación basada en datos de mercado. El precio final lo defines tú.
              </p>
            </div>
          </div>
        }

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
                required
                [disabled]="isLoadingCategories()"
              >
                <option value="">
                  {{ isLoadingCategories() ? 'Cargando...' : 'Seleccionar categoría' }}
                </option>
                @for (cat of availableCategories(); track cat.id) {
                  <option [value]="cat.id">
                    {{ cat.name }}
                    @if (cat.description) {
                      <span> - {{ cat.description }}</span>
                    }
                  </option>
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
                required
              >
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
              <select id="fuelType" class="field-input" [(ngModel)]="localData.fuelType" required>
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
              <label for="color" class="field-label"> Color <span class="required">*</span> </label>
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
              <select id="doors" class="field-input" [(ngModel)]="localData.doors" required>
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
              <select id="seats" class="field-input" [(ngModel)]="localData.seats" required>
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
  styles: [
    `
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
        box-shadow: 0 0 0 3px var(--border-focus) / 20;
      }

      .field-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: var(--surface-hover);
      }

      .field-input::placeholder {
        color: var(--text-placeholder);
      }

      /* Estimation Panel */
      .estimation-panel {
        background: var(--surface-raised);
        border: 2px solid var(--border-focus);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        margin: 1rem 0;
        animation: slideIn 0.3s ease-out;
      }

      .estimation-panel.high-confidence {
        border-color: var(--success-600);
        background: linear-gradient(
          135deg,
          var(--surface-raised) 0%,
          var(--success-50) 100%
        );
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .estimation-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--border-default);
      }

      .estimation-icon {
        font-size: 1.5rem;
      }

      .estimation-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        flex: 1;
      }

      .estimation-loading {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-style: italic;
      }

      .estimation-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .estimation-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
      }

      .estimation-label {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .estimation-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .estimation-value.highlight {
        color: var(--success-700);
        font-size: 1.25rem;
      }

      .estimation-note {
        font-size: 0.75rem;
        font-weight: 400;
        color: var(--text-secondary);
        margin-left: 0.25rem;
      }

      .estimation-badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        font-weight: 600;
      }

      .estimation-badge.high {
        background: var(--success-100);
        color: var(--success-700);
      }

      .estimation-badge.medium {
        background: var(--warning-100);
        color: var(--warning-700);
      }

      .estimation-badge.low {
        background: var(--error-100);
        color: var(--error-700);
      }

      .estimation-category {
        padding: 0.25rem 0.75rem;
        background: var(--primary-100);
        color: var(--primary-700);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        font-weight: 600;
      }

      .estimation-disclaimer {
        font-size: 0.75rem;
        color: var(--text-tertiary);
        font-style: italic;
        margin: 0.5rem 0 0 0;
        padding-top: 0.75rem;
        border-top: 1px solid var(--border-subtle);
      }

      /* Mobile */
      @media (max-width: 768px) {
        .form-grid {
          grid-template-columns: 1fr;
        }

        .estimation-panel {
          padding: 1rem;
        }

        .estimation-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }

        .estimation-value.highlight {
          font-size: 1.125rem;
        }
      }
    `,
  ],
})
export class PublishBasicInfoStepComponent implements OnInit {
  // ==================== SERVICES ====================

  private readonly pricingService = inject(PricingService);

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
    licensePlate: '',
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
    licensePlate: '',
  };

  minYear = 1980;
  maxYear = new Date().getFullYear() + 1;

  availableBrands = [
    'Toyota',
    'Ford',
    'Chevrolet',
    'Volkswagen',
    'Fiat',
    'Renault',
    'Peugeot',
    'Honda',
    'Nissan',
    'Hyundai',
    'Citroën',
    'Jeep',
  ];

  availableCategories = signal<
    Array<{
      id: string;
      name: string;
      description: string;
      base_rate_multiplier: number;
      depreciation_rate_annual: number;
    }>
  >([]);

  isLoadingCategories = signal<boolean>(false);
  valueEstimation = signal<{
    estimated_value_usd: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    source: 'pricing_model' | 'category_fallback';
    category_id?: string;
    category_name?: string;
    suggested_daily_rate_usd?: number;
  } | null>(null);
  isEstimating = signal<boolean>(false);

  // ==================== COMPUTED ====================

  readonly isValid = computed(() => {
    return (
      this.localData.brand !== '' &&
      this.localData.model.trim() !== '' &&
      this.localData.year >= this.minYear &&
      this.localData.year <= this.maxYear &&
      this.localData.category !== '' &&
      this.localData.transmission !== '' &&
      this.localData.fuelType !== '' &&
      this.localData.color.trim() !== '' &&
      this.localData.licensePlate.trim() !== '' &&
      this.localData.doors > 0 &&
      this.localData.seats > 0
    );
  });

  // ==================== LIFECYCLE ====================

  ngOnInit(): void {
    this.loadCategories();
  }

  constructor() {
    // Initialize local data from input
    effect(
      () => {
        this.localData = { ...this.data() };
      },
      { allowSignalWrites: true },
    );

    // Emit changes when local data changes
    effect(() => {
      const valid = this.isValid();
      this.validChange.emit(valid);

      if (valid) {
        this.dataChange.emit({ ...this.localData });
      }
    });

    // Estimate value when brand/model/year change
    effect(() => {
      const brand = this.localData.brand;
      const model = this.localData.model;
      const year = this.localData.year;

      if (brand && model && year >= this.minYear && year <= this.maxYear) {
        this.estimateVehicleValue();
      } else {
        this.valueEstimation.set(null);
      }
    });
  }

  // ==================== METHODS ====================

  handleBrandChange(): void {
    // Could load models for selected brand here
    console.log('Brand changed to:', this.localData.brand);
  }

  async loadCategories(): Promise<void> {
    this.isLoadingCategories.set(true);
    try {
      const categories = await this.pricingService.getVehicleCategories();
      this.availableCategories.set(categories);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      this.isLoadingCategories.set(false);
    }
  }

  async estimateVehicleValue(): Promise<void> {
    if (this.isEstimating()) return;

    this.isEstimating.set(true);
    try {
      const estimation = await this.pricingService.estimateVehicleValue({
        brand: this.localData.brand,
        model: this.localData.model,
        year: this.localData.year,
        country: 'AR',
      });

      this.valueEstimation.set(estimation);

      // Auto-select category if estimation found one
      if (estimation?.category_id && !this.localData.category) {
        this.localData.category = estimation.category_id;
      }
    } catch (err) {
      console.error('Error estimating value:', err);
      this.valueEstimation.set(null);
    } finally {
      this.isEstimating.set(false);
    }
  }
}
