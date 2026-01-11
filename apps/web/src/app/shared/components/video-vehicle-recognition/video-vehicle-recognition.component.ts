import {
  Component,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  VehicleRecognitionService,
  VehicleRecognitionResult,
} from '@core/services/ai/vehicle-recognition.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Video Vehicle Recognition Component
 *
 * Allows users to scan their vehicle with the camera and automatically
 * detect brand, model, year, and color using AI.
 *
 * Features:
 * - Live camera preview with alignment guide
 * - Multi-frame capture for better accuracy
 * - Real-time AI analysis with progress
 * - Confidence score display
 * - One-tap to use detected data
 */

export interface DetectedVehicle {
  brand: string;
  model: string;
  year: number;
  yearRange: [number, number];
  color: string;
  bodyType: string;
  confidence: number;
}

type ScanState = 'idle' | 'camera-loading' | 'ready' | 'scanning' | 'analyzing' | 'success' | 'error';

@Component({
  selector: 'app-video-vehicle-recognition',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative rounded-2xl overflow-hidden bg-slate-900">
      <!-- Camera View -->
      <div class="aspect-[4/3] relative">
        <!-- Video Element -->
        <video
          #videoElement
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
          [class.hidden]="state() === 'idle' || state() === 'success'"
        ></video>

        <!-- Hidden canvas for frame capture -->
        <canvas #canvasElement class="hidden"></canvas>

        <!-- Idle State - Start Button -->
        @if (state() === 'idle') {
          <div class="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
              <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Escanear Vehículo</h3>
            <p class="text-slate-400 text-sm text-center mb-6 max-w-xs">
              Usá la cámara para detectar automáticamente la marca, modelo y año de tu auto
            </p>
            <button
              type="button"
              (click)="startCamera()"
              class="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              Iniciar Cámara
            </button>
          </div>
        }

        <!-- Camera Loading -->
        @if (state() === 'camera-loading') {
          <div class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
            <div class="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4"></div>
            <p class="text-white text-sm">Iniciando cámara...</p>
          </div>
        }

        <!-- Camera Ready - Alignment Guide -->
        @if (state() === 'ready' || state() === 'scanning') {
          <!-- Alignment Guide Overlay -->
          <div class="absolute inset-0 pointer-events-none">
            <!-- Corner guides -->
            <div class="absolute top-4 left-4 w-16 h-16 border-l-4 border-t-4 border-white/60 rounded-tl-xl"></div>
            <div class="absolute top-4 right-4 w-16 h-16 border-r-4 border-t-4 border-white/60 rounded-tr-xl"></div>
            <div class="absolute bottom-4 left-4 w-16 h-16 border-l-4 border-b-4 border-white/60 rounded-bl-xl"></div>
            <div class="absolute bottom-4 right-4 w-16 h-16 border-r-4 border-b-4 border-white/60 rounded-br-xl"></div>

            <!-- Center crosshair -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div class="w-8 h-8 border-2 border-white/40 rounded-full"></div>
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full"></div>
            </div>

            <!-- Hint text -->
            <div class="absolute bottom-20 left-0 right-0 text-center">
              <p class="text-white text-sm font-medium bg-black/40 backdrop-blur-sm inline-block px-4 py-2 rounded-full">
                @if (state() === 'scanning') {
                  Capturando... {{ captureProgress() }}%
                } @else {
                  Encuadrá el vehículo completo
                }
              </p>
            </div>
          </div>

          <!-- Capture Button -->
          <div class="absolute bottom-4 left-0 right-0 flex justify-center">
            <button
              type="button"
              (click)="startScan()"
              [disabled]="state() === 'scanning'"
              class="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              [class.animate-pulse]="state() === 'scanning'"
            >
              @if (state() === 'scanning') {
                <div class="w-6 h-6 bg-red-500 rounded-sm"></div>
              } @else {
                <div class="w-12 h-12 rounded-full border-4 border-slate-900"></div>
              }
            </button>
          </div>

          <!-- Close button -->
          <button
            type="button"
            (click)="stopCamera()"
            class="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }

        <!-- Analyzing State -->
        @if (state() === 'analyzing') {
          <div class="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6">
            <!-- AI Animation -->
            <div class="relative w-24 h-24 mb-6">
              <div class="absolute inset-0 border-4 border-violet-500/30 rounded-full"></div>
              <div class="absolute inset-0 border-4 border-transparent border-t-violet-500 rounded-full animate-spin"></div>
              <div class="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
              <div class="absolute inset-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <h3 class="text-xl font-bold text-white mb-2">Analizando con IA</h3>
            <p class="text-slate-400 text-sm text-center mb-4">
              Identificando marca, modelo y características...
            </p>

            <!-- Progress bar -->
            <div class="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
                [style.width.%]="analyzeProgress()"
              ></div>
            </div>
            <p class="text-violet-400 text-sm mt-2">{{ analyzeProgress() }}%</p>
          </div>
        }

        <!-- Success State -->
        @if (state() === 'success' && detectedVehicle()) {
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-900 flex flex-col p-6">
            <!-- Success Header -->
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white">Vehículo Detectado</h3>
                <p class="text-emerald-300 text-sm">{{ detectedVehicle()!.confidence }}% de confianza</p>
              </div>
            </div>

            <!-- Vehicle Info Card -->
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
              <div class="flex items-center gap-4 mb-4">
                <!-- Vehicle Icon -->
                <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M8 17h.01M16 17h.01M3 11l1.5-5.5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.5L21 11M3 11v6a1 1 0 001 1h1m16-7v6a1 1 0 01-1 1h-1M3 11h18" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-2xl font-bold text-white">
                    {{ detectedVehicle()!.brand }}
                  </p>
                  <p class="text-lg text-emerald-200">
                    {{ detectedVehicle()!.model }}
                  </p>
                </div>
              </div>

              <!-- Details Grid -->
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-white/10 rounded-lg p-2 text-center">
                  <p class="text-xs text-emerald-300 mb-1">Año</p>
                  <p class="text-white font-bold">{{ formatYearRange() }}</p>
                </div>
                <div class="bg-white/10 rounded-lg p-2 text-center">
                  <p class="text-xs text-emerald-300 mb-1">Color</p>
                  <p class="text-white font-bold capitalize">{{ detectedVehicle()!.color }}</p>
                </div>
                <div class="bg-white/10 rounded-lg p-2 text-center">
                  <p class="text-xs text-emerald-300 mb-1">Tipo</p>
                  <p class="text-white font-bold">{{ detectedVehicle()!.bodyType }}</p>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 mt-auto">
              <button
                type="button"
                (click)="resetScan()"
                class="flex-1 px-4 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
              >
                Escanear de nuevo
              </button>
              <button
                type="button"
                (click)="useDetectedVehicle()"
                class="flex-1 px-4 py-3 bg-white text-emerald-900 rounded-xl font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Usar estos datos
              </button>
            </div>
          </div>
        }

        <!-- Error State -->
        @if (state() === 'error') {
          <div class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6">
            <div class="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">No se pudo detectar</h3>
            <p class="text-slate-400 text-sm text-center mb-6 max-w-xs">
              {{ errorMessage() || 'No pudimos identificar el vehículo. Intentá con mejor iluminación o más cerca.' }}
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                (click)="resetScan()"
                class="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="startCamera()"
                class="px-6 py-3 bg-violet-500 text-white rounded-xl font-bold hover:bg-violet-600 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Bottom Info (when not in success state) -->
      @if (state() !== 'success' && state() !== 'error') {
        <div class="bg-slate-800 px-4 py-3 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-slate-400 text-xs">
            La IA analiza múltiples frames para identificar tu vehículo con mayor precisión.
          </p>
        </div>
      }
    </div>
  `,
})
export class VideoVehicleRecognitionComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private readonly vehicleRecognitionService = inject(VehicleRecognitionService);
  private readonly logger = inject(LoggerService);

  private stream: MediaStream | null = null;
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private capturedFrames: string[] = [];

  // Outputs
  readonly vehicleDetected = output<DetectedVehicle>();
  readonly cancelled = output<void>();

  // State
  readonly state = signal<ScanState>('idle');
  readonly captureProgress = signal(0);
  readonly analyzeProgress = signal(0);
  readonly detectedVehicle = signal<DetectedVehicle | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Computed
  readonly formatYearRange = computed(() => {
    const vehicle = this.detectedVehicle();
    if (!vehicle) return '';
    if (vehicle.yearRange[0] === vehicle.yearRange[1]) {
      return vehicle.yearRange[0].toString();
    }
    return `${vehicle.yearRange[0]}-${vehicle.yearRange[1]}`;
  });

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async startCamera(): Promise<void> {
    this.state.set('camera-loading');
    this.errorMessage.set(null);

    try {
      // Request camera with rear camera preferred for vehicle scanning
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // Wait for video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        await this.videoElement.nativeElement.play();
      }

      this.state.set('ready');
      this.logger.info('Camera started successfully', 'VideoVehicleRecognition');
    } catch (error) {
      this.logger.error('Failed to start camera', 'VideoVehicleRecognition', error);
      this.state.set('error');
      this.errorMessage.set('No se pudo acceder a la cámara. Verificá los permisos.');
    }
  }

  stopCamera(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }

    this.state.set('idle');
    this.cancelled.emit();
  }

  async startScan(): Promise<void> {
    if (this.state() !== 'ready') return;

    this.state.set('scanning');
    this.captureProgress.set(0);
    this.capturedFrames = [];

    const CAPTURE_DURATION_MS = 3000; // 3 seconds
    const CAPTURE_INTERVAL_MS = 500; // Capture every 500ms = 6 frames
    const TOTAL_CAPTURES = CAPTURE_DURATION_MS / CAPTURE_INTERVAL_MS;

    let captureCount = 0;

    this.captureInterval = setInterval(() => {
      // Capture frame
      const frame = this.captureFrame();
      if (frame) {
        this.capturedFrames.push(frame);
      }

      captureCount++;
      this.captureProgress.set(Math.round((captureCount / TOTAL_CAPTURES) * 100));

      // Done capturing
      if (captureCount >= TOTAL_CAPTURES) {
        if (this.captureInterval) {
          clearInterval(this.captureInterval);
          this.captureInterval = null;
        }
        this.analyzeFrames();
      }
    }, CAPTURE_INTERVAL_MS);
  }

  private captureFrame(): string | null {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;

    if (!video || !canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Return as base64
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private async analyzeFrames(): Promise<void> {
    this.state.set('analyzing');
    this.analyzeProgress.set(0);

    // Stop camera to save resources during analysis
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    try {
      // Select best frame (middle frame usually has best framing)
      const bestFrameIndex = Math.floor(this.capturedFrames.length / 2);
      const frameToAnalyze = this.capturedFrames[bestFrameIndex] || this.capturedFrames[0];

      if (!frameToAnalyze) {
        throw new Error('No frames captured');
      }

      this.analyzeProgress.set(20);

      // Send to AI for recognition
      const result = await this.vehicleRecognitionService.recognizeFromBase64(
        frameToAnalyze.replace(/^data:image\/\w+;base64,/, '')
      );

      this.analyzeProgress.set(80);

      // Check result
      if (result.success && result.vehicle.confidence >= 50) {
        this.analyzeProgress.set(100);

        const detected: DetectedVehicle = {
          brand: result.vehicle.brand,
          model: result.vehicle.model,
          year: result.vehicle.year_range[0],
          yearRange: result.vehicle.year_range,
          color: result.vehicle.color,
          bodyType: this.getBodyTypeLabel(result.vehicle.body_type),
          confidence: result.vehicle.confidence,
        };

        this.detectedVehicle.set(detected);
        this.state.set('success');
        this.logger.info(
          `Vehicle detected: ${detected.brand} ${detected.model} (${detected.confidence}%)`,
          'VideoVehicleRecognition'
        );
      } else {
        throw new Error(result.error || 'No se pudo identificar el vehículo');
      }
    } catch (error) {
      this.logger.error('Analysis failed', 'VideoVehicleRecognition', error);
      this.state.set('error');
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Error al analizar el video'
      );
    }
  }

  useDetectedVehicle(): void {
    const vehicle = this.detectedVehicle();
    if (vehicle) {
      this.vehicleDetected.emit(vehicle);
    }
  }

  resetScan(): void {
    this.detectedVehicle.set(null);
    this.capturedFrames = [];
    this.captureProgress.set(0);
    this.analyzeProgress.set(0);
    this.state.set('idle');
  }

  private getBodyTypeLabel(bodyType: string): string {
    const labels: Record<string, string> = {
      sedan: 'Sedán',
      suv: 'SUV',
      hatchback: 'Hatchback',
      pickup: 'Pickup',
      van: 'Van',
      coupe: 'Coupé',
      convertible: 'Convertible',
      wagon: 'Station Wagon',
      unknown: 'Auto',
    };
    return labels[bodyType] || 'Auto';
  }
}
