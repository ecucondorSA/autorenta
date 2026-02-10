import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { BookingInspection, InspectionPhoto, InspectionStage } from '@core/models/fgo-v1-1.model';
import { FgoV1_1Service } from '@core/services/verification/fgo-v1-1.service';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to service facade
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import {
  GeminiLiveService,
  LiveAnalysisEvent,
  DetectedAreaState,
} from '@core/services/ai/gemini-live.service';
import { IconComponent } from '../icon/icon.component';

type ViewState = 'initializing' | 'ready' | 'recording' | 'review' | 'saving' | 'error';

interface DamageEntry {
  type: string;
  description: string;
  severity: string;
  location: string;
  timestamp: number;
  confirmed: boolean;
  discarded: boolean;
}

/**
 * Video Inspection Live Component
 *
 * Real-time vehicle inspection using Gemini Live API.
 * - Streams video to Gemini at 1 FPS
 * - Shows live feedback (detected areas, damages, guidance)
 * - User confirms/discards detected damages
 * - Saves inspection when complete
 */
@Component({
  selector: 'app-video-inspection-live',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: 'video-inspection-live.component.html',
})
export class VideoInspectionLiveComponent implements OnInit, OnDestroy {
  @Input() bookingId!: string;
  @Input() stage!: InspectionStage;
  @Output() inspectionCompleted = new EventEmitter<BookingInspection>();
  @Output() inspectionCancelled = new EventEmitter<void>();
  @Output() switchToPhotos = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  protected readonly geminiLive = inject(GeminiLiveService);
  private readonly fgoService = inject(FgoV1_1Service);
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);

  private mediaStream: MediaStream | null = null;
  private eventsSubscription: Subscription | null = null;

  // State
  readonly viewState = signal<ViewState>('initializing');
  readonly recordingTime = signal(0);
  readonly liveMessages = signal<LiveAnalysisEvent[]>([]);

  // From GeminiLiveService
  readonly isConnected = this.geminiLive.isConnected;
  readonly connectionState = this.geminiLive.connectionState;
  readonly areasDetected = this.geminiLive.areasDetected;
  readonly areaConfidence = this.geminiLive.areaConfidence;
  readonly detectedAreasCount = this.geminiLive.detectedAreasCount;
  readonly missingAreas = this.geminiLive.missingAreas;
  readonly lastMessage = this.geminiLive.lastMessage;
  readonly currentImageQuality = this.geminiLive.currentImageQuality;
  readonly forensicLog = this.geminiLive.forensicLog;

  // Local editable state
  readonly damages = signal<DamageEntry[]>([]);
  readonly editableOdometer = signal(0);
  readonly editableFuelLevel = signal(50);

  // Saving state
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Recording timer
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  // Labels for template
  readonly AREA_LABELS: Record<keyof DetectedAreaState, string> = {
    front: 'Frente',
    rear: 'Trasera',
    left_side: 'Lat. Izq',
    right_side: 'Lat. Der',
    interior: 'Interior',
    dashboard: 'Tablero',
    trunk: 'Maletero',
  };

  readonly DAMAGE_LABELS: Record<string, string> = {
    scratch: 'Rayón',
    dent: 'Abolladura',
    crack: 'Grieta',
    stain: 'Mancha',
    missing: 'Faltante',
    other: 'Otro',
  };

  readonly SEVERITY_LABELS: Record<string, string> = {
    minor: 'Menor',
    moderate: 'Moderado',
    severe: 'Severo',
  };

  // Computed properties
  readonly stageLabel = computed(() => {
    if (this.stage === 'check_in') return 'Check-in';
    if (this.stage === 'renter_check_in') return 'Recepción';
    return 'Check-out';
  });

  readonly recordingTimeFormatted = computed(() => {
    const time = this.recordingTime();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

  readonly canFinish = computed(() => {
    // Required areas: front, rear, left_side, right_side
    const areas = this.areasDetected();
    return areas.front && areas.rear && areas.left_side && areas.right_side;
  });

  ngOnInit(): void {
    if (!this.bookingId || !this.stage) {
      this.error.set('Faltan parámetros requeridos');
      this.viewState.set('error');
      return;
    }

    this.initializeInspection();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private async initializeInspection(): Promise<void> {
    try {
      // Subscribe to live events
      this.eventsSubscription = this.geminiLive.events$.subscribe((event) => {
        this.handleLiveEvent(event);
      });

      // Initialize camera first
      try {
        await this.initCamera();
      } catch (cameraErr) {
        this.logger.error('Camera initialization failed', 'VideoInspectionLive', cameraErr);
        const errorMessage = cameraErr instanceof Error ? cameraErr.message : 'Error desconocido';
        this.error.set(`Error de cámara: ${errorMessage}`);
        this.viewState.set('error');
        return;
      }

      // Connect to Gemini Live
      try {
        await firstValueFrom(this.geminiLive.connect());
      } catch (geminiErr) {
        this.logger.error('Gemini connection failed', 'VideoInspectionLive', geminiErr);
        const errorMessage = geminiErr instanceof Error ? geminiErr.message : 'Error desconocido';
        this.error.set(`Error de conexión IA: ${errorMessage}`);
        this.viewState.set('error');
        return;
      }

      this.viewState.set('ready');
    } catch (err) {
      this.logger.error('Failed to initialize', 'VideoInspectionLive', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      this.error.set(`Error al inicializar: ${errorMessage}`);
      this.viewState.set('error');
    }
  }

  private async initCamera(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
      this.logger.error('Failed to access camera', 'VideoInspectionLive', err);
      throw new Error('No se pudo acceder a la cámara');
    }
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  private cleanup(): void {
    this.geminiLive.disconnect();
    this.stopCamera();

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }

    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
  }

  // ============================================================================
  // RECORDING CONTROL
  // ============================================================================

  startRecording(): void {
    if (!this.isConnected() || !this.mediaStream) {
      this.error.set('No hay conexión con IA o cámara');
      return;
    }

    this.viewState.set('recording');
    this.recordingTime.set(0);
    this.error.set(null);

    // Wait for Angular to render the new video element in 'recording' state
    // then reassign the stream and start frame capture
    setTimeout(() => {
      if (this.videoElement?.nativeElement && this.mediaStream) {
        // Reassign stream to the new video element
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.videoElement.nativeElement.play();

        // Start frame capture after video is playing
        setTimeout(() => {
          if (this.videoElement?.nativeElement) {
            this.geminiLive.startFrameCapture(this.videoElement.nativeElement);
            this.logger.info('Frame capture started', 'VideoInspectionLive');
          }
        }, 200);
      }
    }, 100);

    // Start timer
    this.recordingInterval = setInterval(() => {
      this.recordingTime.update((t) => t + 1);
    }, 1000);

    this.logger.info('Recording started', 'VideoInspectionLive');
  }

  stopRecording(): void {
    // Stop frame capture
    this.geminiLive.stopFrameCapture();

    // Stop timer
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    // Copy damages from service
    const serviceDamages = this.geminiLive.damages();
    this.damages.set(
      serviceDamages.map((d) => ({
        ...d,
        confirmed: false,
        discarded: false,
      })),
    );

    // Copy odometer and fuel if detected
    const odometer = this.geminiLive.odometer();
    if (odometer) {
      this.editableOdometer.set(odometer.value);
    }

    const fuel = this.geminiLive.fuelLevel();
    if (fuel) {
      this.editableFuelLevel.set(fuel.percentage);
    }

    this.viewState.set('review');
    this.logger.info('Recording stopped, entering review', 'VideoInspectionLive');
  }

  // ============================================================================
  // LIVE EVENT HANDLING
  // ============================================================================

  private handleLiveEvent(event: LiveAnalysisEvent): void {
    // Add to messages (keep last 10)
    this.liveMessages.update((msgs) => {
      const updated = [...msgs, event];
      return updated.slice(-10);
    });

    // Log significant events
    if (event.type !== 'text') {
      this.logger.info(`Live event: ${event.type} - ${event.message}`, 'VideoInspectionLive');
    }
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
    this.viewState.set('saving');
    this.error.set(null);

    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Build photos array from confirmed damages
      // Note: In live mode we don't have frame URLs, so we store damage info only
      const confirmedDamages = this.damages().filter((d) => !d.discarded);
      const photos: InspectionPhoto[] = confirmedDamages.map((damage) => ({
        url: '', // No frame URL in live mode
        type: 'exterior' as const,
        damageInfo: {
          type: damage.type as 'scratch' | 'dent' | 'crack' | 'stain' | 'missing' | 'other',
          description: damage.description,
          severity: damage.severity as 'minor' | 'moderate' | 'severe',
          location: damage.location,
        },
      }));

      // Create inspection
      const inspection = await firstValueFrom(
        this.fgoService.createInspection({
          bookingId: this.bookingId,
          stage: this.stage,
          inspectorId: user.id,
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
      this.logger.error('Save failed', 'VideoInspectionLive', err);
      this.error.set(err instanceof Error ? err.message : 'Error al guardar inspección');
      this.viewState.set('review');
    } finally {
      this.saving.set(false);
    }
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  cancel(): void {
    this.cleanup();
    this.inspectionCancelled.emit();
  }

  backToRecording(): void {
    this.viewState.set('ready');
    this.damages.set([]);
  }

  retry(): void {
    this.error.set(null);
    this.viewState.set('initializing');
    this.initializeInspection();
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  getAreaLabel(key: keyof DetectedAreaState): string {
    return this.AREA_LABELS[key];
  }

  getSeverityClass(severity: string): string {
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

  getEventIcon(type: string): string {
    switch (type) {
      case 'area_detected':
        return 'checkmark-circle';
      case 'damage_found':
        return 'warning';
      case 'odometer_read':
        return 'speedometer';
      case 'fuel_read':
        return 'battery-half';
      case 'guidance':
        return 'information-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'chatbubble';
    }
  }

  getEventClass(type: string): string {
    switch (type) {
      case 'area_detected':
        return 'text-green-600';
      case 'damage_found':
        return 'text-orange-600';
      case 'odometer_read':
        return 'text-blue-600';
      case 'fuel_read':
        return 'text-blue-600';
      case 'guidance':
        return 'text-purple-600';
      case 'quality_warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getQualityScoreClass(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  getQualityLabel(
    quality:
      | 'excellent'
      | 'good'
      | 'poor'
      | 'very_poor'
      | 'sharp'
      | 'acceptable'
      | 'blurry'
      | 'very_blurry'
      | 'optimal'
      | 'suboptimal'
      | 'unusable'
      | 'complete'
      | 'partial'
      | 'minimal',
  ): string {
    const labels: Record<string, string> = {
      excellent: 'Excelente',
      good: 'Buena',
      poor: 'Pobre',
      very_poor: 'Muy Pobre',
      sharp: 'Nítido',
      acceptable: 'Aceptable',
      blurry: 'Borroso',
      very_blurry: 'Muy Borroso',
      optimal: 'Óptimo',
      suboptimal: 'Subóptimo',
      unusable: 'Inutilizable',
      complete: 'Completa',
      partial: 'Parcial',
      minimal: 'Mínima',
    };
    return labels[quality] || quality;
  }

  getForensicSummary() {
    return this.geminiLive.getForensicSummary();
  }
}
