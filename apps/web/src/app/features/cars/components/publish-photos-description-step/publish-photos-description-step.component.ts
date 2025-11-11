import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';

export interface PublishPhotosDescription {
  photos: File[];
  description: string;
  features: string[];
}

@Component({
  selector: 'app-publish-photos-description-step',
  standalone: true,
  imports: [CommonModule, FormsModule, WizardStepComponent],
  template: `
    <app-wizard-step title="Fotos y Descripción" subtitle="Agrega fotos y describe tu vehículo">
      <div class="photos-description-form">
        <!-- Photos Upload -->
        <div class="form-section">
          <h3 class="section-title">Fotos del Vehículo</h3>
          <div class="upload-area">
            <input
              type="file"
              id="photos"
              multiple
              accept="image/*"
              (change)="handleFileSelect($event)"
              class="file-input"
            />
            <label for="photos" class="upload-label">
              <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Arrastra fotos aquí o haz click para seleccionar</span>
              <span class="upload-hint">Máximo 10 fotos, 5MB cada una</span>
            </label>
          </div>
          @if (photoCount() > 0) {
            <div class="photo-count">
              {{ photoCount() }} foto{{ photoCount() > 1 ? 's' : '' }} seleccionada{{
                photoCount() > 1 ? 's' : ''
              }}
            </div>
          }
        </div>

        <!-- Description -->
        <div class="form-section">
          <h3 class="section-title">Descripción</h3>
          <textarea
            [(ngModel)]="localData.description"
            class="field-textarea"
            rows="6"
            placeholder="Describe tu vehículo: estado, extras, uso, etc..."
            maxlength="1000"
          ></textarea>
          <div class="char-count">{{ localData.description.length }}/1000</div>
        </div>

        <!-- Features -->
        <div class="form-section">
          <h3 class="section-title">Características Especiales</h3>
          <div class="features-grid">
            @for (feature of availableFeatures; track feature) {
              <label class="feature-checkbox">
                <input
                  type="checkbox"
                  [checked]="hasFeature(feature)"
                  (change)="toggleFeature(feature)"
                />
                <span>{{ feature }}</span>
              </label>
            }
          </div>
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [
    `
      .photos-description-form {
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
      .upload-area {
        position: relative;
      }
      .file-input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
      }
      .upload-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 3rem 2rem;
        border: 2px dashed var(--border-default);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--duration-fast);
      }
      .upload-label:hover {
        border-color: var(--cta-default);
        background: var(--surface-hover);
      }
      .upload-icon {
        width: 3rem;
        height: 3rem;
        color: var(--text-muted);
      }
      .upload-hint {
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }
      .photo-count {
        font-size: 0.875rem;
        color: var(--success-600);
        font-weight: 600;
      }
      .field-textarea {
        padding: 0.75rem;
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        color: var(--text-primary);
        background: var(--surface-base);
        resize: vertical;
      }
      .field-textarea:focus {
        outline: none;
        border-color: var(--border-focus);
        box-shadow: 0 0 0 3px var(--border-focus) / 20;
      }
      .char-count {
        text-align: right;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }
      .features-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .feature-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }
      @media (max-width: 768px) {
        .features-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PublishPhotosDescriptionStepComponent {
  data = input<PublishPhotosDescription>({ photos: [], description: '', features: [] });
  dataChange = output<PublishPhotosDescription>();
  validChange = output<boolean>();

  localData: PublishPhotosDescription = { photos: [], description: '', features: [] };

  availableFeatures = [
    'GPS',
    'Bluetooth',
    'Cámara trasera',
    'Sensores de estacionamiento',
    'Aire acondicionado',
    'Control crucero',
    'Asientos de cuero',
    'Techo solar',
  ];

  readonly photoCount = computed(() => this.localData.photos.length);
  readonly isValid = computed(
    () => this.localData.photos.length > 0 && this.localData.description.trim().length >= 50,
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

  handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.localData.photos = Array.from(input.files).slice(0, 10);
  }

  hasFeature(feature: string): boolean {
    return this.localData.features.includes(feature);
  }

  toggleFeature(feature: string): void {
    const index = this.localData.features.indexOf(feature);
    if (index === -1) this.localData.features.push(feature);
    else this.localData.features.splice(index, 1);
  }
}
