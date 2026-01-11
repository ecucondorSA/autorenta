import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { PhotoQualityService } from '@core/services/ai/photo-quality.service';
import { CosmeticConditionService, CosmeticIssue } from '@core/services/ai/cosmetic-condition.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Required photo positions for vehicle inspection */
export type InspectionPosition =
  | 'front'
  | 'rear'
  | 'left_side'
  | 'right_side'
  | 'front_left'
  | 'front_right'
  | 'rear_left'
  | 'rear_right'
  | 'interior_front'
  | 'interior_rear'
  | 'dashboard'
  | 'odometer'
  | 'fuel_gauge';

/** Inspection photo with AI analysis */
export interface InspectionPhotoAI {
  id: string;
  file: File;
  preview: string;
  position: InspectionPosition;
  validationStatus: 'pending' | 'validating' | 'valid' | 'invalid';
  qualityScore?: number;
  issues?: string[];
  damages?: CosmeticIssue[];
  odometerReading?: number;
  fuelLevel?: number;
}

/** Position configuration for UI */
export interface PositionConfig {
  id: InspectionPosition;
  label: string;
  description: string;
  icon: string;
  required: boolean;
  detectOdometer?: boolean;
  detectFuel?: boolean;
  detectDamages?: boolean;
}

/** Event emitted when photos change */
export interface InspectionPhotosChangeEvent {
  photos: InspectionPhotoAI[];
  isComplete: boolean;
  totalDamages: CosmeticIssue[];
  estimatedOdometer?: number;
  estimatedFuelLevel?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard inspection positions configuration */
const INSPECTION_POSITIONS: PositionConfig[] = [
  {
    id: 'front',
    label: 'Frente',
    description: 'Vista frontal completa del vehículo',
    icon: 'car-front',
    required: true,
    detectDamages: true,
  },
  {
    id: 'rear',
    label: 'Trasera',
    description: 'Vista trasera completa del vehículo',
    icon: 'car-rear',
    required: true,
    detectDamages: true,
  },
  {
    id: 'left_side',
    label: 'Lateral izquierdo',
    description: 'Vista lateral izquierda completa',
    icon: 'car-side',
    required: true,
    detectDamages: true,
  },
  {
    id: 'right_side',
    label: 'Lateral derecho',
    description: 'Vista lateral derecha completa',
    icon: 'car-side',
    required: true,
    detectDamages: true,
  },
  {
    id: 'front_left',
    label: '3/4 Frontal izq.',
    description: 'Vista 3/4 frontal izquierda',
    icon: 'car-front',
    required: false,
    detectDamages: true,
  },
  {
    id: 'front_right',
    label: '3/4 Frontal der.',
    description: 'Vista 3/4 frontal derecha',
    icon: 'car-front',
    required: false,
    detectDamages: true,
  },
  {
    id: 'interior_front',
    label: 'Interior frontal',
    description: 'Asientos delanteros y tablero',
    icon: 'car-seat',
    required: true,
    detectDamages: true,
  },
  {
    id: 'dashboard',
    label: 'Tablero',
    description: 'Panel de instrumentos completo',
    icon: 'gauge',
    required: true,
    detectDamages: false,
  },
  {
    id: 'odometer',
    label: 'Odómetro',
    description: 'Lectura clara del kilometraje',
    icon: 'speedometer',
    required: true,
    detectOdometer: true,
  },
  {
    id: 'fuel_gauge',
    label: 'Combustible',
    description: 'Indicador de nivel de combustible',
    icon: 'fuel',
    required: true,
    detectFuel: true,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Inspection Photo AI Component
 *
 * Modern photo upload component for vehicle inspections with AI validation:
 * - Quality validation (blur, lighting, composition)
 * - Cosmetic damage detection
 * - Odometer OCR reading
 * - Fuel level estimation
 * - Position-based photo organization
 *
 * @example
 * ```html
 * <app-inspection-photo-ai
 *   [stage]="'check_in'"
 *   [requiredPositions]="['front', 'rear', 'left_side', 'right_side', 'odometer', 'fuel_gauge']"
 *   (photosChange)="onPhotosChange($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-inspection-photo-ai',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="inspection-photo-ai">
      <!-- Header -->
      <div class="header">
        <h3 class="title">Fotos de inspección</h3>
        <p class="subtitle">
          Sube fotos de todas las posiciones requeridas.
          La IA analizará calidad y detectará daños automáticamente.
        </p>
      </div>

      <!-- Progress bar -->
      <div class="progress-section">
        <div class="progress-bar">
          <div
            class="progress-fill"
            [style.width.%]="progressPercent()"
            [class.complete]="isComplete()"
          ></div>
        </div>
        <span class="progress-text">
          {{ completedPositions().length }}/{{ requiredPositionConfigs().length }} posiciones
        </span>
      </div>

      <!-- Damages summary (if any) -->
      @if (allDamages().length > 0) {
        <div class="damages-summary">
          <div class="damages-header">
            <app-icon name="warning" class="text-warning-500" />
            <span>{{ allDamages().length }} daño(s) detectado(s)</span>
          </div>
          <div class="damages-list">
            @for (damage of allDamages().slice(0, 3); track damage.location) {
              <span class="damage-tag" [class]="'severity-' + damage.severity">
                {{ damage.type }} - {{ damage.location }}
              </span>
            }
            @if (allDamages().length > 3) {
              <span class="damage-more">+{{ allDamages().length - 3 }} más</span>
            }
          </div>
        </div>
      }

      <!-- Position grid -->
      <div class="positions-grid">
        @for (position of displayPositions(); track position.id) {
          <div
            class="position-card"
            [class.filled]="getPhotoForPosition(position.id)"
            [class.required]="position.required"
            [class.validating]="getPhotoForPosition(position.id)?.validationStatus === 'validating'"
            [class.invalid]="getPhotoForPosition(position.id)?.validationStatus === 'invalid'"
            (click)="openPhotoSelector(position.id)"
          >
            @if (getPhotoForPosition(position.id); as photo) {
              <!-- Photo preview -->
              <div class="photo-preview">
                <img [src]="photo.preview" [alt]="position.label" />

                <!-- Validation overlay -->
                @if (photo.validationStatus === 'validating') {
                  <div class="validation-overlay">
                    <div class="spinner"></div>
                    <span>Analizando...</span>
                  </div>
                }

                <!-- Quality badge -->
                @if (photo.qualityScore !== undefined) {
                  <div
                    class="quality-badge"
                    [class.good]="photo.qualityScore >= 70"
                    [class.medium]="photo.qualityScore >= 50 && photo.qualityScore < 70"
                    [class.low]="photo.qualityScore < 50"
                  >
                    {{ photo.qualityScore }}%
                  </div>
                }

                <!-- Damage indicator -->
                @if (photo.damages && photo.damages.length > 0) {
                  <div class="damage-indicator">
                    <app-icon name="warning" [size]="16" />
                    <span>{{ photo.damages.length }}</span>
                  </div>
                }

                <!-- Remove button -->
                <button
                  class="remove-btn"
                  (click)="removePhoto(position.id); $event.stopPropagation()"
                  aria-label="Eliminar foto"
                >
                  <app-icon name="x" [size]="16" />
                </button>
              </div>

              <!-- Odometer reading -->
              @if (position.detectOdometer && photo.odometerReading) {
                <div class="reading-badge odometer">
                  <app-icon name="speedometer" [size]="16" />
                  <span>{{ photo.odometerReading | number }} km</span>
                </div>
              }

              <!-- Fuel level -->
              @if (position.detectFuel && photo.fuelLevel !== undefined) {
                <div class="reading-badge fuel">
                  <app-icon name="fuel" [size]="16" />
                  <span>{{ photo.fuelLevel }}%</span>
                </div>
              }
            } @else {
              <!-- Empty state -->
              <div class="empty-state">
                <app-icon [name]="position.icon" [size]="24" />
                <span class="position-label">{{ position.label }}</span>
                @if (position.required) {
                  <span class="required-badge">Requerido</span>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        accept="image/*"
        capture="environment"
        (change)="onFileSelected($event)"
        class="hidden"
      />

      <!-- Actions -->
      <div class="actions">
        <button
          class="btn-primary"
          [disabled]="!isComplete() || isValidating()"
          (click)="emitComplete()"
        >
          @if (isValidating()) {
            <span class="spinner-sm"></span>
            Validando...
          } @else {
            Continuar
          }
        </button>
      </div>

      <!-- Issues list -->
      @if (allIssues().length > 0) {
        <div class="issues-section">
          <h4>Problemas detectados:</h4>
          <ul>
            @for (issue of allIssues(); track issue) {
              <li>{{ issue }}</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .inspection-photo-ai {
      @apply flex flex-col gap-4 p-4;
    }

    .header {
      @apply text-center mb-2;
    }

    .title {
      @apply text-lg font-semibold text-gray-900;
    }

    .subtitle {
      @apply text-sm text-gray-500 mt-1;
    }

    .progress-section {
      @apply flex items-center gap-3;
    }

    .progress-bar {
      @apply flex-1 h-2 bg-gray-200 rounded-full overflow-hidden;
    }

    .progress-fill {
      @apply h-full bg-cta-default transition-all duration-300;
    }

    .progress-fill.complete {
      @apply bg-success-500;
    }

    .progress-text {
      @apply text-sm text-gray-600 whitespace-nowrap;
    }

    .damages-summary {
      @apply bg-warning-50 border border-warning-200 rounded-lg p-3;
    }

    .damages-header {
      @apply flex items-center gap-2 text-warning-700 font-medium mb-2;
    }

    .damages-list {
      @apply flex flex-wrap gap-2;
    }

    .damage-tag {
      @apply px-2 py-1 rounded text-xs font-medium;
    }

    .damage-tag.severity-minor {
      @apply bg-gray-100 text-gray-700;
    }

    .damage-tag.severity-moderate {
      @apply bg-warning-100 text-warning-700;
    }

    .damage-tag.severity-severe {
      @apply bg-error-100 text-error-700;
    }

    .damage-more {
      @apply text-xs text-gray-500;
    }

    .positions-grid {
      @apply grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3;
    }

    .position-card {
      @apply relative aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300
             bg-gray-50 cursor-pointer transition-all overflow-hidden;
    }

    .position-card:hover {
      @apply border-primary-400 bg-primary-50;
    }

    .position-card.filled {
      @apply border-solid border-gray-200 bg-white;
    }

    .position-card.required {
      @apply border-primary-300;
    }

    .position-card.validating {
      @apply border-primary-400;
    }

    .position-card.invalid {
      @apply border-error-400 bg-error-50;
    }

    .photo-preview {
      @apply w-full h-full relative;
    }

    .photo-preview img {
      @apply w-full h-full object-cover;
    }

    .validation-overlay {
      @apply absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white;
    }

    .spinner {
      @apply w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2;
    }

    .spinner-sm {
      @apply w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2;
    }

    .quality-badge {
      @apply absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white;
    }

    .quality-badge.good {
      @apply bg-success-500;
    }

    .quality-badge.medium {
      @apply bg-warning-500;
    }

    .quality-badge.low {
      @apply bg-error-500;
    }

    .damage-indicator {
      @apply absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded
             bg-warning-500 text-white text-xs font-bold;
    }

    .remove-btn {
      @apply absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 text-white
             hover:bg-black/70 transition-colors;
    }

    .reading-badge {
      @apply absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded
             bg-black/70 text-white text-xs font-medium;
    }

    .empty-state {
      @apply w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400;
    }

    .position-label {
      @apply text-xs font-medium text-center;
    }

    .required-badge {
      @apply text-[10px] text-primary-600 font-medium;
    }

    .actions {
      @apply flex justify-center pt-4;
    }

    .btn-primary {
      @apply flex items-center justify-center px-6 py-3 rounded-lg
             bg-primary-600 text-white font-medium
             hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
             transition-colors;
    }

    .issues-section {
      @apply mt-4 p-3 bg-error-50 rounded-lg;
    }

    .issues-section h4 {
      @apply text-sm font-medium text-error-700 mb-2;
    }

    .issues-section ul {
      @apply list-disc list-inside text-sm text-error-600 space-y-1;
    }

    .hidden {
      @apply sr-only;
    }
  `],
})
export class InspectionPhotoAIComponent implements OnInit, OnDestroy {
  // ============================================================================
  // INPUTS
  // ============================================================================

  /** Inspection stage (check_in or check_out) */
  @Input() stage: 'check_in' | 'check_out' = 'check_in';

  /** Required positions for this inspection */
  @Input() requiredPositions: InspectionPosition[] = [
    'front',
    'rear',
    'left_side',
    'right_side',
    'interior_front',
    'odometer',
    'fuel_gauge',
  ];

  /** Whether to run damage analysis */
  @Input() enableDamageDetection = true;

  /** Whether to enable OCR for odometer */
  @Input() enableOdometerOCR = true;

  // ============================================================================
  // OUTPUTS
  // ============================================================================

  /** Emitted when photos change */
  @Output() photosChange = new EventEmitter<InspectionPhotosChangeEvent>();

  /** Emitted when inspection is complete and valid */
  @Output() inspectionReady = new EventEmitter<InspectionPhotosChangeEvent>();

  // ============================================================================
  // SERVICES
  // ============================================================================

  private readonly supabase = injectSupabase();
  private readonly photoQuality = inject(PhotoQualityService);
  private readonly cosmeticCondition = inject(CosmeticConditionService);
  private readonly logger = inject(LoggerService);

  // ============================================================================
  // STATE
  // ============================================================================

  readonly photos = signal<InspectionPhotoAI[]>([]);
  readonly currentPosition = signal<InspectionPosition | null>(null);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  /** Position configs for required positions */
  readonly requiredPositionConfigs = computed(() =>
    INSPECTION_POSITIONS.filter((p) => this.requiredPositions.includes(p.id)),
  );

  /** All positions to display (required first, then optional) */
  readonly displayPositions = computed(() => {
    const required = this.requiredPositionConfigs();
    const optional = INSPECTION_POSITIONS.filter(
      (p) => !this.requiredPositions.includes(p.id),
    );
    return [...required, ...optional];
  });

  /** Positions that have photos */
  readonly completedPositions = computed(() => {
    const photoPositions = this.photos().map((p) => p.position);
    return this.requiredPositions.filter((pos) => photoPositions.includes(pos));
  });

  /** Progress percentage */
  readonly progressPercent = computed(() => {
    const total = this.requiredPositions.length;
    const completed = this.completedPositions().length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  /** Whether all required positions have valid photos */
  readonly isComplete = computed(() => {
    const completed = this.completedPositions();
    const allValid = this.photos().every(
      (p) => p.validationStatus === 'valid' || p.validationStatus === 'pending',
    );
    return (
      completed.length >= this.requiredPositions.length &&
      allValid &&
      !this.isValidating()
    );
  });

  /** Whether any photo is being validated */
  readonly isValidating = computed(() =>
    this.photos().some((p) => p.validationStatus === 'validating'),
  );

  /** All damages across all photos */
  readonly allDamages = computed(() => {
    const damages: CosmeticIssue[] = [];
    this.photos().forEach((photo) => {
      if (photo.damages) {
        damages.push(...photo.damages);
      }
    });
    return damages;
  });

  /** All issues across all photos */
  readonly allIssues = computed(() => {
    const issues: string[] = [];
    this.photos().forEach((photo) => {
      if (photo.issues) {
        issues.push(...photo.issues);
      }
    });
    return [...new Set(issues)]; // Dedupe
  });

  /** Estimated odometer from OCR */
  readonly estimatedOdometer = computed(() => {
    const odometerPhoto = this.photos().find(
      (p) => p.position === 'odometer' && p.odometerReading,
    );
    return odometerPhoto?.odometerReading;
  });

  /** Estimated fuel level */
  readonly estimatedFuelLevel = computed(() => {
    const fuelPhoto = this.photos().find(
      (p) => p.position === 'fuel_gauge' && p.fuelLevel !== undefined,
    );
    return fuelPhoto?.fuelLevel;
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  private fileInputRef?: HTMLInputElement;

  ngOnInit(): void {
    this.logger.debug(
      '[InspectionPhotoAI] Initialized with positions:',
      this.requiredPositions,
    );
  }

  ngOnDestroy(): void {
    // Cleanup preview URLs
    this.photos().forEach((photo) => {
      if (photo.preview.startsWith('blob:')) {
        URL.revokeObjectURL(photo.preview);
      }
    });
  }

  // ============================================================================
  // METHODS
  // ============================================================================

  /** Get photo for a specific position */
  getPhotoForPosition(position: InspectionPosition): InspectionPhotoAI | undefined {
    return this.photos().find((p) => p.position === position);
  }

  /** Open file selector for a position */
  openPhotoSelector(position: InspectionPosition): void {
    this.currentPosition.set(position);

    // Find or create file input
    if (!this.fileInputRef) {
      this.fileInputRef = document.querySelector(
        'app-inspection-photo-ai input[type="file"]',
      ) as HTMLInputElement;
    }

    this.fileInputRef?.click();
  }

  /** Handle file selection */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const position = this.currentPosition();

    if (!file || !position) {
      input.value = '';
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    const id = `${position}_${Date.now()}`;

    // Add photo to list
    const newPhoto: InspectionPhotoAI = {
      id,
      file,
      preview,
      position,
      validationStatus: 'pending',
    };

    // Remove existing photo for this position if any
    this.photos.update((photos) => {
      const filtered = photos.filter((p) => p.position !== position);
      return [...filtered, newPhoto];
    });

    // Reset input
    input.value = '';

    // Emit change
    this.emitChange();

    // Start validation
    await this.validatePhoto(id);
  }

  /** Remove photo for a position */
  removePhoto(position: InspectionPosition): void {
    const photo = this.getPhotoForPosition(position);
    if (photo?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(photo.preview);
    }

    this.photos.update((photos) => photos.filter((p) => p.position !== position));
    this.emitChange();
  }

  /** Validate a photo with AI */
  private async validatePhoto(photoId: string): Promise<void> {
    const photoIndex = this.photos().findIndex((p) => p.id === photoId);
    if (photoIndex === -1) return;

    // Mark as validating
    this.photos.update((photos) => {
      const updated = [...photos];
      updated[photoIndex] = {
        ...updated[photoIndex],
        validationStatus: 'validating',
      };
      return updated;
    });

    const photo = this.photos()[photoIndex];
    const positionConfig = INSPECTION_POSITIONS.find((p) => p.id === photo.position);

    try {
      // Upload image temporarily to get URL for AI analysis
      const imageUrl = await this.uploadTempImage(photo.file);

      // Run quality validation
      const qualityResult = await this.photoQuality.validatePhoto(
        imageUrl,
        'vehicle_exterior',
        photo.position as 'front' | 'rear' | 'left' | 'right' | 'interior',
      );

      let damages: CosmeticIssue[] = [];
      let odometerReading: number | undefined;
      let fuelLevel: number | undefined;

      // Run damage detection if enabled
      if (this.enableDamageDetection && positionConfig?.detectDamages) {
        // Map inspection position to vehicle area
        const areaMap: Record<string, 'front' | 'rear' | 'left' | 'right' | 'interior' | 'dashboard' | 'trunk'> = {
          front: 'front',
          rear: 'rear',
          left_side: 'left',
          right_side: 'right',
          front_left: 'front',
          front_right: 'front',
          rear_left: 'rear',
          rear_right: 'rear',
          interior_front: 'interior',
          interior_rear: 'interior',
          dashboard: 'dashboard',
          odometer: 'dashboard',
          fuel_gauge: 'dashboard',
        };
        const area = areaMap[photo.position] ?? 'front';
        const damageResult = await this.cosmeticCondition.analyzeArea(imageUrl, area);
        if (damageResult.success) {
          damages = damageResult.issues;
        }
      }

      // TODO: Implement odometer OCR when endpoint is ready
      if (this.enableOdometerOCR && positionConfig?.detectOdometer) {
        // For now, skip OCR - user will enter manually
        this.logger.debug('[InspectionPhotoAI] Odometer OCR not implemented yet');
      }

      // TODO: Implement fuel level detection when endpoint is ready
      if (positionConfig?.detectFuel) {
        // For now, skip fuel detection - user will enter manually
        this.logger.debug('[InspectionPhotoAI] Fuel detection not implemented yet');
      }

      // Update photo with results
      this.photos.update((photos) => {
        const updated = [...photos];
        const idx = updated.findIndex((p) => p.id === photoId);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            validationStatus: qualityResult.quality.is_acceptable ? 'valid' : 'invalid',
            qualityScore: qualityResult.quality.score,
            issues: qualityResult.quality.issues.map(i => i.description),
            damages,
            odometerReading,
            fuelLevel,
          };
        }
        return updated;
      });
    } catch (error) {
      this.logger.error('[InspectionPhotoAI] Validation failed:', error);

      // Mark as valid anyway to not block user
      this.photos.update((photos) => {
        const updated = [...photos];
        const idx = updated.findIndex((p) => p.id === photoId);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            validationStatus: 'valid',
            qualityScore: 70, // Default acceptable score
          };
        }
        return updated;
      });
    }

    this.emitChange();
  }

  /** Upload image temporarily for AI analysis */
  private async uploadTempImage(file: File): Promise<string> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id || 'anonymous';

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `temp_${timestamp}.${extension}`;
    const filePath = `${userId}/temp/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('car-images')
      .upload(filePath, file, {
        cacheControl: '300', // 5 min cache
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from('car-images').getPublicUrl(filePath);

    return publicUrl;
  }

  /** Emit photos change event */
  private emitChange(): void {
    this.photosChange.emit({
      photos: this.photos(),
      isComplete: this.isComplete(),
      totalDamages: this.allDamages(),
      estimatedOdometer: this.estimatedOdometer(),
      estimatedFuelLevel: this.estimatedFuelLevel(),
    });
  }

  /** Emit completion event */
  emitComplete(): void {
    if (!this.isComplete()) return;

    this.inspectionReady.emit({
      photos: this.photos(),
      isComplete: true,
      totalDamages: this.allDamages(),
      estimatedOdometer: this.estimatedOdometer(),
      estimatedFuelLevel: this.estimatedFuelLevel(),
    });
  }
}
