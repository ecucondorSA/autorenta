import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PhotoQualityService,
  PlateDetectionService,
  VehicleRecognitionService,
} from '@core/services/ai';

/**
 * Modern Photo Upload Component with AI Validation
 *
 * Features:
 * - Real-time AI validation (quality, plates, vehicle recognition)
 * - Progress indicators with percentage
 * - Stencil guides for photo positions
 * - Drag & drop support
 * - Background processing
 *
 * Based on UI patterns from:
 * - Inspektlabs (real-time feedback, alignment stencils)
 * - Uploadcare (drag-drop, previews, error states)
 * - PAVE/Ravin AI (guided capture, fraud detection)
 */

export type PhotoPosition =
  | 'cover'
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'interior'
  | 'dashboard'
  | 'trunk'
  | 'detail';

export type ValidationStatus = 'pending' | 'validating' | 'valid' | 'warning' | 'error';

export interface PhotoWithAI {
  id: string;
  file: File;
  preview: string;
  position: PhotoPosition;
  status: ValidationStatus;
  progress: number;
  quality?: {
    score: number;
    issues: string[];
    isAcceptable: boolean;
  };
  plates?: {
    detected: boolean;
    blurredUrl?: string;
    count: number;
  };
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    confidence: number;
  };
  error?: string;
}

export interface VehicleAutoDetect {
  brand: string;
  model: string;
  year: number;
  color: string;
  confidence: number;
}

const POSITION_LABELS: Record<PhotoPosition, string> = {
  cover: 'Portada',
  front: 'Frente',
  rear: 'Trasera',
  left: 'Lateral Izq.',
  right: 'Lateral Der.',
  interior: 'Interior',
  dashboard: 'Tablero',
  trunk: 'Baúl',
  detail: 'Detalle',
};

const POSITION_HINTS: Record<PhotoPosition, string> = {
  cover: 'Vista 3/4 frontal del vehículo completo',
  front: 'Vista frontal con patente visible',
  rear: 'Vista trasera con patente visible',
  left: 'Lateral izquierdo completo',
  right: 'Lateral derecho completo',
  interior: 'Vista general del interior',
  dashboard: 'Tablero y consola central',
  trunk: 'Interior del baúl/maletero',
  detail: 'Detalle específico del vehículo',
};

@Component({
  selector: 'app-photo-upload-ai',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Header con stats -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-cta-default/15 flex items-center justify-center">
            <svg class="w-5 h-5 text-cta-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-text-primary">Fotos del vehículo</h3>
            <p class="text-sm text-text-secondary">
              {{ photos().length }}/{{ maxPhotos() }} fotos
              @if (validPhotosCount() > 0) {
                <span class="text-emerald-600 ml-1">
                  ({{ validPhotosCount() }} verificadas)
                </span>
              }
            </p>
          </div>
        </div>

        <!-- AI Quality Score Badge -->
        @if (averageQualityScore() > 0) {
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full"
               [class]="getScoreBadgeClass(averageQualityScore())">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-semibold">{{ averageQualityScore() }}% calidad</span>
          </div>
        }
      </div>

      <!-- Vehicle Auto-Detect Banner -->
      @if (detectedVehicle() && showAutoDetect()) {
        <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 animate-fade-in">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-emerald-900">Vehículo detectado automáticamente</p>
              <p class="text-emerald-700 font-medium">
                {{ detectedVehicle()?.brand }} {{ detectedVehicle()?.model }}
                {{ detectedVehicle()?.year }}
                @if (detectedVehicle()?.color) {
                  <span class="text-emerald-600">- {{ detectedVehicle()?.color }}</span>
                }
              </p>
              <p class="text-xs text-emerald-600 mt-1">
                {{ detectedVehicle()?.confidence }}% de confianza
              </p>
            </div>
            <button
              type="button"
              (click)="onUseDetectedVehicle()"
              class="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors flex-shrink-0"
            >
              Usar estos datos
            </button>
          </div>
        </div>
      }

      <!-- Photo Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <!-- Upload Dropzone -->
        <label
          class="aspect-[4/3] relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all group"
          [class.border-cta-default]="isDragging()"
          [class.bg-cta-default/5]="isDragging()"
          [class.border-border-default]="!isDragging()"
          [class.hover:border-cta-default]="!isDragging()"
          [class.hover:bg-surface-secondary]="!isDragging()"
          [class.opacity-50]="photos().length >= maxPhotos()"
          [class.cursor-not-allowed]="photos().length >= maxPhotos()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
        >
          <div class="flex flex-col items-center gap-2 p-4 text-center">
            <div class="p-3 bg-surface-secondary rounded-full group-hover:scale-110 transition-transform"
                 [class.bg-cta-default/20]="isDragging()">
              <svg class="w-6 h-6 transition-colors"
                   [class.text-cta-default]="isDragging()"
                   [class.text-text-secondary]="!isDragging()"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <span class="text-sm font-semibold text-text-primary">
                {{ isDragging() ? 'Soltá aquí' : 'Subir fotos' }}
              </span>
              <p class="text-xs text-text-muted mt-0.5">
                Arrastrá o tocá para seleccionar
              </p>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            [disabled]="photos().length >= maxPhotos()"
            (change)="onFileSelected($event)"
            class="hidden"
          />
        </label>

        <!-- Photo Cards -->
        @for (photo of photos(); track photo.id; let i = $index) {
          <div class="aspect-[4/3] relative rounded-xl overflow-hidden shadow-sm group bg-surface-secondary">
            <!-- Image -->
            <img
              [src]="photo.plates?.blurredUrl || photo.preview"
              [alt]="'Foto ' + (i + 1)"
              class="w-full h-full object-cover"
              [class.opacity-50]="photo.status === 'validating'"
            />

            <!-- Validation Overlay -->
            @switch (photo.status) {
              @case ('validating') {
                <div class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <div class="w-12 h-12 relative">
                    <svg class="w-12 h-12 animate-spin text-white/30" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" />
                    </svg>
                    <svg class="w-12 h-12 absolute inset-0 text-white" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"
                        stroke-dasharray="62.83" [attr.stroke-dashoffset]="62.83 - (62.83 * photo.progress / 100)"
                        class="transition-all duration-300" />
                    </svg>
                  </div>
                  <span class="text-white text-sm font-medium">{{ photo.progress }}%</span>
                  <span class="text-white/70 text-xs">Analizando foto...</span>
                </div>
              }
              @case ('error') {
                <div class="absolute inset-0 bg-rose-500/80 flex flex-col items-center justify-center gap-2 p-3">
                  <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-white text-xs text-center font-medium">{{ photo.error }}</span>
                </div>
              }
            }

            <!-- Status Badge -->
            @if (photo.status !== 'validating') {
              <div class="absolute top-2 left-2">
                @switch (photo.status) {
                  @case ('valid') {
                    <div class="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold shadow-sm">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ photo.quality?.score || 100 }}%
                    </div>
                  }
                  @case ('warning') {
                    <div class="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded-full text-xs font-semibold shadow-sm">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Revisar
                    </div>
                  }
                  @case ('error') {
                    <div class="flex items-center gap-1 px-2 py-1 bg-rose-500 text-white rounded-full text-xs font-semibold shadow-sm">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Error
                    </div>
                  }
                }
              </div>
            }

            <!-- Plate Detection Badge -->
            @if (photo.plates?.detected) {
              <div class="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Placa blur
              </div>
            }

            <!-- Cover Badge -->
            @if (i === 0) {
              <div class="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md">
                <span class="text-xs font-bold text-white uppercase tracking-wider">Portada</span>
              </div>
            }

            <!-- Quality Issues Tooltip -->
            @if (photo.quality?.issues?.length) {
              <div class="absolute bottom-2 right-2 group/tooltip">
                <div class="p-1.5 bg-amber-500 rounded-full cursor-help">
                  <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-lg z-10">
                  <p class="font-semibold mb-1">Sugerencias:</p>
                  <ul class="space-y-0.5">
                    @for (issue of photo.quality?.issues; track issue) {
                      <li class="flex items-start gap-1">
                        <span class="text-amber-400">•</span>
                        {{ issue }}
                      </li>
                    }
                  </ul>
                </div>
              </div>
            }

            <!-- Hover Actions -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                (click)="removePhoto(i)"
                class="p-2.5 bg-white/90 text-rose-600 rounded-full hover:bg-white hover:scale-110 transition-all shadow-lg"
                title="Eliminar"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              @if (photo.status === 'error' || photo.status === 'warning') {
                <button
                  type="button"
                  (click)="retryValidation(photo)"
                  class="p-2.5 bg-white/90 text-blue-600 rounded-full hover:bg-white hover:scale-110 transition-all shadow-lg"
                  title="Reintentar"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              }
            </div>
          </div>
        }

        <!-- Empty Slots with Stencils -->
        @for (slot of emptySlots(); track slot) {
          <div class="aspect-[4/3] rounded-xl border-2 border-dashed border-border-default/50 bg-surface-secondary/50 flex flex-col items-center justify-center p-3">
            <div class="text-center">
              <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-surface-secondary flex items-center justify-center">
                @switch (slot) {
                  @case ('front') {
                    <svg class="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="6" width="18" height="12" rx="2" stroke-width="1.5"/>
                      <circle cx="7" cy="15" r="1.5" stroke-width="1.5"/>
                      <circle cx="17" cy="15" r="1.5" stroke-width="1.5"/>
                    </svg>
                  }
                  @case ('rear') {
                    <svg class="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="6" width="18" height="12" rx="2" stroke-width="1.5"/>
                      <circle cx="7" cy="15" r="1.5" stroke-width="1.5"/>
                      <circle cx="17" cy="15" r="1.5" stroke-width="1.5"/>
                      <line x1="8" y1="9" x2="16" y2="9" stroke-width="1.5"/>
                    </svg>
                  }
                  @case ('interior') {
                    <svg class="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="3" stroke-width="1.5"/>
                      <path d="M5 12h2M17 12h2M12 5v2M12 17v2" stroke-width="1.5"/>
                    </svg>
                  }
                  @default {
                    <svg class="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                }
              </div>
              <span class="text-xs font-medium text-text-muted">{{ getPositionLabel(slot) }}</span>
              <p class="text-[10px] text-text-muted/70 mt-0.5 leading-tight">{{ getPositionHint(slot) }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Tips Banner -->
      @if (photos().length < 3) {
        <div class="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-blue-900">Fotos de calidad = más reservas</p>
            <p class="text-xs text-blue-700 mt-0.5">
              Autos con 5+ fotos reciben hasta <strong>40% más consultas</strong>.
              Usá luz natural y mostrá el vehículo completo.
            </p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class PhotoUploadAIComponent {
  private readonly photoQualityService = inject(PhotoQualityService);
  private readonly plateDetectionService = inject(PlateDetectionService);
  private readonly vehicleRecognitionService = inject(VehicleRecognitionService);

  // Inputs
  readonly maxPhotos = input(10);
  readonly enableVehicleDetection = input(true);
  readonly enablePlateBlur = input(true);
  readonly enableQualityValidation = input(true);
  readonly requiredPositions = input<PhotoPosition[]>(['front', 'rear', 'interior']);

  // Outputs
  readonly photosChange = output<PhotoWithAI[]>();
  readonly vehicleDetected = output<VehicleAutoDetect>();

  // State
  readonly photos = signal<PhotoWithAI[]>([]);
  readonly isDragging = signal(false);
  readonly detectedVehicle = signal<VehicleAutoDetect | null>(null);
  readonly showAutoDetect = signal(true);

  // Computed
  readonly validPhotosCount = computed(() =>
    this.photos().filter(p => p.status === 'valid').length
  );

  readonly averageQualityScore = computed(() => {
    const validPhotos = this.photos().filter(p => p.quality?.score);
    if (validPhotos.length === 0) return 0;
    const sum = validPhotos.reduce((acc, p) => acc + (p.quality?.score || 0), 0);
    return Math.round(sum / validPhotos.length);
  });

  readonly emptySlots = computed(() => {
    const uploaded = this.photos().length;
    const remaining = Math.max(0, this.requiredPositions().length - uploaded);
    const positions = this.requiredPositions();
    return positions.slice(uploaded, uploaded + remaining);
  });

  constructor() {
    // Emit changes when photos update
    effect(() => {
      this.photosChange.emit(this.photos());
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = ''; // Reset for same file selection
    }
  }

  private async processFiles(files: File[]): Promise<void> {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const available = this.maxPhotos() - this.photos().length;
    const toProcess = imageFiles.slice(0, available);

    for (const file of toProcess) {
      const photo = await this.createPhotoEntry(file);
      this.photos.update(photos => [...photos, photo]);

      // Start AI validation in background
      this.validatePhoto(photo);
    }
  }

  private async createPhotoEntry(file: File): Promise<PhotoWithAI> {
    const preview = await this.fileToDataUrl(file);
    const position = this.guessPosition(this.photos().length);

    return {
      id: crypto.randomUUID(),
      file,
      preview,
      position,
      status: 'pending',
      progress: 0,
    };
  }

  private async validatePhoto(photo: PhotoWithAI): Promise<void> {
    this.updatePhoto(photo.id, { status: 'validating', progress: 10 });

    try {
      // Run validations in parallel
      const validations: Promise<void>[] = [];

      // 1. Quality validation
      if (this.enableQualityValidation()) {
        validations.push(this.runQualityValidation(photo));
      }

      // 2. Plate detection
      if (this.enablePlateBlur()) {
        validations.push(this.runPlateDetection(photo));
      }

      // 3. Vehicle recognition (only for first photo)
      if (this.enableVehicleDetection() && this.photos().length === 1 && !this.detectedVehicle()) {
        validations.push(this.runVehicleRecognition(photo));
      }

      await Promise.all(validations);

      // Determine final status
      const updatedPhoto = this.photos().find(p => p.id === photo.id);
      if (updatedPhoto) {
        const hasErrors = updatedPhoto.quality && !updatedPhoto.quality.isAcceptable;
        const hasWarnings = updatedPhoto.quality?.issues?.length ?? 0 > 0;

        this.updatePhoto(photo.id, {
          status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid',
          progress: 100,
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      this.updatePhoto(photo.id, {
        status: 'error',
        progress: 100,
        error: 'Error al validar la foto',
      });
    }
  }

  private async runQualityValidation(photo: PhotoWithAI): Promise<void> {
    this.updatePhoto(photo.id, { progress: 30 });

    try {
      const result = await this.photoQualityService.validatePhoto(photo.preview, 'vehicle_exterior');

      this.updatePhoto(photo.id, {
        progress: 50,
        quality: {
          score: result.quality.score,
          issues: result.recommendations || [],
          isAcceptable: result.quality.is_acceptable,
        },
      });
    } catch {
      // Non-fatal, continue
      this.updatePhoto(photo.id, { progress: 50 });
    }
  }

  private async runPlateDetection(photo: PhotoWithAI): Promise<void> {
    this.updatePhoto(photo.id, { progress: 60 });

    try {
      const result = await this.plateDetectionService.detectPlates(photo.preview);

      if (result.plates_detected > 0 && result.plates.length > 0) {
        // Generate blurred version
        const blurredBlob = await this.plateDetectionService.blurPlatesInImage(
          photo.preview,
          result.plates
        );
        const blurredUrl = URL.createObjectURL(blurredBlob);

        this.updatePhoto(photo.id, {
          progress: 80,
          plates: {
            detected: true,
            blurredUrl,
            count: result.plates_detected,
          },
        });
      } else {
        this.updatePhoto(photo.id, {
          progress: 80,
          plates: { detected: false, count: 0 },
        });
      }
    } catch {
      this.updatePhoto(photo.id, { progress: 80 });
    }
  }

  private async runVehicleRecognition(photo: PhotoWithAI): Promise<void> {
    this.updatePhoto(photo.id, { progress: 90 });

    try {
      const result = await this.vehicleRecognitionService.recognizeFromUrl(photo.preview);

      if (result.success && result.vehicle && result.vehicle.confidence >= 70) {
        const detected: VehicleAutoDetect = {
          brand: result.vehicle.brand || '',
          model: result.vehicle.model || '',
          year: result.vehicle.year_range?.[0] || 0,
          color: result.vehicle.color || '',
          confidence: result.vehicle.confidence,
        };

        this.detectedVehicle.set(detected);
        this.vehicleDetected.emit(detected);

        this.updatePhoto(photo.id, {
          vehicle: {
            brand: result.vehicle.brand,
            model: result.vehicle.model,
            year: result.vehicle.year_range?.[0],
            color: result.vehicle.color,
            confidence: result.vehicle.confidence,
          },
        });
      }
    } catch {
      // Non-fatal
    }
  }

  private updatePhoto(id: string, updates: Partial<PhotoWithAI>): void {
    this.photos.update(photos =>
      photos.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  removePhoto(index: number): void {
    const photo = this.photos()[index];
    if (photo.plates?.blurredUrl) {
      URL.revokeObjectURL(photo.plates.blurredUrl);
    }
    this.photos.update(photos => photos.filter((_, i) => i !== index));
  }

  retryValidation(photo: PhotoWithAI): void {
    this.validatePhoto(photo);
  }

  onUseDetectedVehicle(): void {
    this.showAutoDetect.set(false);
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private guessPosition(index: number): PhotoPosition {
    const positions: PhotoPosition[] = ['cover', 'front', 'rear', 'left', 'right', 'interior', 'dashboard', 'trunk'];
    return positions[index] || 'detail';
  }

  getPositionLabel(position: PhotoPosition): string {
    return POSITION_LABELS[position] || position;
  }

  getPositionHint(position: PhotoPosition): string {
    return POSITION_HINTS[position] || '';
  }

  getScoreBadgeClass(score: number): string {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  }
}
