import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import {
  PhotoUploadAIComponent,
  PhotoWithAI,
  VehicleAutoDetect,
} from '@shared/components/photo-upload-ai/photo-upload-ai.component';

/**
 * Photos upload question
 * Reuses the PhotoUploadAIComponent with AI validation
 */
@Component({
  selector: 'app-photos-question',
  standalone: true,
  imports: [PhotoUploadAIComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Vehicle context -->
      <div class="text-center">
        <span
          class="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-full text-sm"
        >
          <span class="font-semibold text-text-primary">{{ brandName() }} {{ modelName() }}</span>
          <span class="text-text-muted">{{ year() }}</span>
        </span>
      </div>

      <!-- Photo upload component -->
      <app-photo-upload-ai
        [maxPhotos]="10"
        [enableVehicleDetection]="true"
        [enablePlateBlur]="true"
        [enableQualityValidation]="true"
        [requiredPositions]="['front', 'rear', 'interior']"
        [initialPhotos]="initialPhotos()"
        [isGeneratingAI]="isGeneratingAI()"
        [generationCountdown]="generationCountdown()"
        (photosChange)="onPhotosChange($event)"
        (vehicleDetected)="onVehicleDetected($event)"
        (requestAiGeneration)="onRequestAiGeneration()"
      />

      <!-- AI generation modal trigger info -->
      @if (photos().length === 0) {
        <div class="text-center py-4">
          <p class="text-sm text-text-muted">
            ¿No tenés fotos a mano? Podés
            <button
              type="button"
              (click)="onRequestAiGeneration()"
              class="text-cta-default hover:underline font-medium"
            >
              generar fotos con IA
            </button>
            basadas en tu vehículo.
          </p>
        </div>
      }

      <!-- Minimum photos indicator -->
      <div class="flex items-center justify-center gap-4">
        <div
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          [class.bg-emerald-100]="hasMinimumPhotos()"
          [class.text-emerald-700]="hasMinimumPhotos()"
          [class.bg-amber-100]="!hasMinimumPhotos()"
          [class.text-amber-700]="!hasMinimumPhotos()"
        >
          @if (hasMinimumPhotos()) {
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Mínimo de fotos alcanzado</span>
          } @else {
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Mínimo 3 fotos requeridas ({{ photos().length }}/3)</span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PhotosQuestionComponent {
  readonly brandName = input<string>();
  readonly modelName = input<string>();
  readonly year = input<number>();
  readonly initialPhotos = input<PhotoWithAI[]>([]);
  readonly isGeneratingAI = input(false);
  readonly generationCountdown = input(0);

  readonly photosChanged = output<PhotoWithAI[]>();
  readonly vehicleDetected = output<VehicleAutoDetect>();
  readonly requestAiGeneration = output<void>();

  readonly photos = signal<PhotoWithAI[]>([]);

  readonly hasMinimumPhotos = computed(() => this.photos().length >= 3);

  onPhotosChange(photos: PhotoWithAI[]): void {
    this.photos.set(photos);
    this.photosChanged.emit(photos);
  }

  onVehicleDetected(vehicle: VehicleAutoDetect): void {
    this.vehicleDetected.emit(vehicle);
  }

  onRequestAiGeneration(): void {
    this.requestAiGeneration.emit();
  }
}
