import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingInspection, InspectionPhoto, InspectionStage } from '@core/models/fgo-v1-1.model';
import {
  AREA_LABELS,
  AreasDetected,
  DAMAGE_TYPE_LABELS,
  INSPECTION_SEVERITY_LABELS,
  InspectionDamage,
  VideoInspectionAIService,
  VideoInspectionResult,
} from '@core/services/ai/video-inspection-ai.service';
import { SessionFacadeService } from '@core/services/facades/session-facade.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../icon/icon.component';

type ViewState = 'recording' | 'processing' | 'results' | 'error';

/**
 * Video Inspection AI Component
 *
 * Permite realizar inspecciones de vehículos usando video + IA.
 * - Graba video del vehículo (30-60 segundos)
 * - Extrae frames automáticamente
 * - Analiza con Gemini Vision
 * - Detecta daños, lee odómetro, estima combustible
 * - Permite edición manual y confirmación
 */
@Component({
  selector: 'app-video-inspection-ai',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './video-inspection-ai.component.html',
})
export class VideoInspectionAIComponent implements OnInit, OnDestroy {
  @Input() bookingId!: string;
  @Input() stage!: InspectionStage;
  @Output() inspectionCompleted = new EventEmitter<BookingInspection>();
  @Output() inspectionCancelled = new EventEmitter<void>();
  @Output() switchToPhotos = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('previewVideo') previewVideo!: ElementRef<HTMLVideoElement>;

  private readonly videoInspectionService = inject(VideoInspectionAIService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly sessionFacade = inject(SessionFacadeService);
  private readonly logger = inject(LoggerService);

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // State
  readonly viewState = signal<ViewState>('recording');
  readonly isRecording = signal(false);
  readonly recordingTime = signal(0);
  readonly recordedVideo = signal<Blob | null>(null);
  readonly recordedVideoUrl = signal<string | null>(null);

  // Processing state
  readonly processingStep = signal('');
  readonly processingProgress = signal(0);

  // Results state
  readonly analysisResult = signal<VideoInspectionResult | null>(null);
  readonly editableOdometer = signal(0);
  readonly editableFuelLevel = signal(0);
  readonly damages = signal<InspectionDamage[]>([]);

  // Saving state
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Recording timer
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  // Labels for template
  readonly DAMAGE_LABELS = DAMAGE_TYPE_LABELS;
  readonly SEVERITY_LABELS = INSPECTION_SEVERITY_LABELS;
  readonly AREA_LABELS = AREA_LABELS;

  // Computed properties
  readonly stageLabel = computed(() => {
    if (this.stage === 'check_in') return 'Check-in';
    if (this.stage === 'renter_check_in') return 'Recepción';
    return 'Check-out';
  });

  readonly minVideoSeconds = computed(() => this.videoInspectionService.getMinVideoSeconds());
  readonly recommendedVideoSeconds = computed(() =>
    this.videoInspectionService.getRecommendedVideoSeconds(),
  );

  readonly canStopRecording = computed(() => {
    return this.recordingTime() >= this.minVideoSeconds();
  });

  readonly recordingTimeFormatted = computed(() => {
    const time = this.recordingTime();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  readonly detectedAreasCount = computed(() => {
    const result = this.analysisResult();
    if (!result) return 0;
    return this.videoInspectionService.getDetectedAreasCount(result.areas_detected);
  });

  readonly missingAreas = computed(() => {
    const result = this.analysisResult();
    if (!result) return [];
    return this.videoInspectionService.getMissingAreas(result.areas_detected);
  });

  readonly confirmedDamagesCount = computed(() => {
    return this.damages().filter((d) => !d.discarded).length;
  });

  readonly isValid = computed(() => {
    return (
      this.editableOdometer() > 0 &&
      this.editableFuelLevel() >= 0 &&
      this.editableFuelLevel() <= 100
    );
  });

  ngOnInit(): void {
    if (!this.bookingId || !this.stage) {
      this.error.set('Faltan parámetros requeridos');
      this.viewState.set('error');
      return;
    }

    this.initCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
    // Clean up video URL
    const videoUrl = this.recordedVideoUrl();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }

  // ============================================================================
  // CAMERA & RECORDING
  // ============================================================================

  private async initCamera(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // Wait for next tick to ensure view is rendered
      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
          this.videoElement.nativeElement.play();
        }
      }, 100);
    } catch (err) {
      this.logger.error('Failed to access camera', 'VideoInspectionAI', err);
      this.error.set('No se pudo acceder a la cámara. Verificá los permisos.');
      this.viewState.set('error');
    }
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  startRecording(): void {
    if (!this.mediaStream) {
      this.error.set('Cámara no disponible');
      return;
    }

    this.recordedChunks = [];
    this.recordingTime.set(0);
    this.error.set(null);

    try {
      // Try to use the best available codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        // 750 kbps = calidad suficiente para inspecciones de vehículos
        // Reduce tamaño de archivo en ~70% (3min: 56MB → 17MB)
        // Fix: Sentry #610 - videos demasiado pesados causaban errores de upload
        videoBitsPerSecond: 750000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.recordedVideo.set(videoBlob);
        // Create URL for video preview
        const oldUrl = this.recordedVideoUrl();
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        this.recordedVideoUrl.set(URL.createObjectURL(videoBlob));
        this.logger.info(`Recording complete: ${videoBlob.size} bytes`, 'VideoInspectionAI');
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording.set(true);

      // Start timer
      this.recordingInterval = setInterval(() => {
        this.recordingTime.update((t) => t + 1);
      }, 1000);
    } catch (err) {
      this.logger.error('Failed to start recording', 'VideoInspectionAI', err);
      this.error.set('Error al iniciar la grabación');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      this.stopCamera();
    }
  }

  // ============================================================================
  // PROCESSING
  // ============================================================================

  async processVideo(): Promise<void> {
    const video = this.recordedVideo();
    if (!video) {
      this.error.set('No hay video grabado');
      return;
    }

    this.viewState.set('processing');
    this.processingStep.set('Preparando análisis...');
    this.processingProgress.set(0);

    try {
      const result = await firstValueFrom(
        this.videoInspectionService.processVideoInspection(
          video,
          this.bookingId,
          this.stage,
          (step, progress) => {
            this.processingStep.set(step);
            this.processingProgress.set(progress);
          },
        ),
      );

      if (!result.success) {
        throw new Error(result.error || 'Error en el análisis');
      }

      // Set results
      this.analysisResult.set(result);
      this.damages.set(result.damages.map((d) => ({ ...d, confirmed: false, discarded: false })));
      this.editableOdometer.set(result.odometer?.value || 0);
      this.editableFuelLevel.set(result.fuel_level?.percentage || 50);

      this.viewState.set('results');
    } catch (err) {
      this.logger.error('Processing failed', 'VideoInspectionAI', err);
      this.error.set(err instanceof Error ? err.message : 'Error al procesar el video');
      this.viewState.set('error');
    }
  }

  retryRecording(): void {
    this.error.set(null);
    this.recordedVideo.set(null);
    this.analysisResult.set(null);
    this.viewState.set('recording');
    this.initCamera();
  }

  // ============================================================================
  // DAMAGE MANAGEMENT
  // ============================================================================

  confirmDamage(index: number): void {
    this.damages.update((damages) => {
      const updated = [...damages];
      updated[index] = { ...updated[index], confirmed: true, discarded: false };
      return updated;
    });
  }

  discardDamage(index: number): void {
    this.damages.update((damages) => {
      const updated = [...damages];
      updated[index] = { ...updated[index], discarded: true, confirmed: false };
      return updated;
    });
  }

  restoreDamage(index: number): void {
    this.damages.update((damages) => {
      const updated = [...damages];
      updated[index] = { ...updated[index], discarded: false };
      return updated;
    });
  }

  // ============================================================================
  // SAVE INSPECTION
  // ============================================================================

  async saveInspection(): Promise<void> {
    if (!this.isValid()) {
      this.error.set('Complete todos los campos requeridos');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      const userId = await this.sessionFacade.getCurrentUserId();

      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Build photos array from confirmed damages
      const confirmedDamages = this.damages().filter((d) => !d.discarded);
      const photos: InspectionPhoto[] = confirmedDamages.map((damage) => ({
        url: damage.frame_url,
        type: 'exterior' as const,
        damageInfo: {
          type: damage.type,
          description: damage.description,
          severity: damage.severity,
          location: damage.location,
        },
      }));

      // Create inspection
      const inspection = await firstValueFrom(
        this.fgoService.createInspection({
          bookingId: this.bookingId,
          stage: this.stage,
          inspectorId: userId,
          photos,
          odometer: this.editableOdometer(),
          fuelLevel: this.editableFuelLevel(),
        }),
      );

      if (!inspection) {
        throw new Error('No se pudo crear la inspección');
      }

      // Sign inspection
      const signed = await firstValueFrom(this.fgoService.signInspection(inspection.id));

      if (!signed) {
        throw new Error('No se pudo firmar la inspección');
      }

      this.inspectionCompleted.emit(inspection);
    } catch (err) {
      this.logger.error('Save failed', 'VideoInspectionAI', err);
      this.error.set(err instanceof Error ? err.message : 'Error al guardar inspección');
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    if (this.isRecording()) {
      this.stopRecording();
    }
    this.stopCamera();
    this.inspectionCancelled.emit();
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  getAreaLabel(key: keyof AreasDetected): string {
    return AREA_LABELS[key];
  }

  getSeverityClass(severity: InspectionDamage['severity']): string {
    switch (severity) {
      case 'minor':
        return 'bg-yellow-100 text-yellow-800';
      case 'moderate':
        return 'bg-orange-100 text-orange-800';
      case 'severe':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getConfidencePercentage(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
}
