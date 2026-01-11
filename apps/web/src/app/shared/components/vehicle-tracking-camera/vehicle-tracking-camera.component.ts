import {
  Component,
  OnDestroy,
  OnInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  output,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleRecognitionService } from '@core/services/ai/vehicle-recognition.service';
import { FipeService } from '@core/services/cars/fipe.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Vehicle Tracking Camera Component
 *
 * Real-time vehicle detection and tracking using TensorFlow.js COCO-SSD.
 * Automatically captures when vehicle is centered and stable.
 * Identifies make/model and fetches market value from FIPE.
 *
 * Features:
 * - Live bounding box tracking (like face detection)
 * - Visual guidance for positioning
 * - Auto-capture when stable
 * - AI identification of brand/model/year
 * - FIPE market value lookup
 */

// TensorFlow.js types (loaded dynamically)
declare const cocoSsd: {
  load: (config?: { base?: string }) => Promise<CocoSsdModel>;
};

interface CocoSsdModel {
  detect: (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) => Promise<Detection[]>;
}

interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export interface DetectedVehicleWithValue {
  brand: string;
  model: string;
  year: number;
  yearRange: [number, number];
  color: string;
  bodyType: string;
  confidence: number;
  marketValue?: {
    min: number;
    max: number;
    average: number;
    currency: string;
  };
  suggestedDailyPrice?: number;
}

type TrackingState =
  | 'loading-model'
  | 'camera-loading'
  | 'scanning'
  | 'vehicle-detected'
  | 'capturing'
  | 'analyzing'
  | 'success'
  | 'error';

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle'];

@Component({
  selector: 'app-vehicle-tracking-camera',
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
          [class.hidden]="state() === 'loading-model' || state() === 'success'"
        ></video>

        <!-- Canvas for bounding box overlay -->
        <canvas
          #overlayCanvas
          class="absolute inset-0 w-full h-full pointer-events-none"
          [class.hidden]="state() === 'loading-model' || state() === 'success'"
        ></canvas>

        <!-- Hidden canvas for frame capture -->
        <canvas #captureCanvas class="hidden"></canvas>

        <!-- Loading Model State -->
        @if (state() === 'loading-model') {
          <div class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6">
            <div class="relative w-20 h-20 mb-6">
              <!-- Outer ring -->
              <div class="absolute inset-0 border-4 border-violet-500/30 rounded-full"></div>
              <!-- Spinning ring -->
              <div class="absolute inset-0 border-4 border-transparent border-t-violet-500 rounded-full animate-spin"></div>
              <!-- Inner icon -->
              <div class="absolute inset-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Cargando IA</h3>
            <p class="text-slate-400 text-sm text-center">
              Preparando modelo de detección de vehículos...
            </p>
            <div class="w-48 h-1.5 bg-slate-700 rounded-full mt-4 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full animate-pulse" style="width: 60%"></div>
            </div>
          </div>
        }

        <!-- Camera Loading -->
        @if (state() === 'camera-loading') {
          <div class="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center">
            <div class="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4"></div>
            <p class="text-white text-sm">Iniciando cámara...</p>
          </div>
        }

        <!-- Scanning State - Show guidance -->
        @if (state() === 'scanning' || state() === 'vehicle-detected' || state() === 'capturing') {
          <!-- Guide Frame -->
          <div class="absolute inset-8 pointer-events-none">
            <!-- Corner guides with animation when vehicle detected -->
            <div class="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 rounded-tl-2xl transition-all duration-300"
                 [class]="vehicleInFrame() ? 'border-emerald-400 animate-pulse' : 'border-white/40'"></div>
            <div class="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 rounded-tr-2xl transition-all duration-300"
                 [class]="vehicleInFrame() ? 'border-emerald-400 animate-pulse' : 'border-white/40'"></div>
            <div class="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 rounded-bl-2xl transition-all duration-300"
                 [class]="vehicleInFrame() ? 'border-emerald-400 animate-pulse' : 'border-white/40'"></div>
            <div class="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 rounded-br-2xl transition-all duration-300"
                 [class]="vehicleInFrame() ? 'border-emerald-400 animate-pulse' : 'border-white/40'"></div>
          </div>

          <!-- Status indicator -->
          <div class="absolute top-4 left-0 right-0 flex justify-center">
            <div class="px-4 py-2 rounded-full backdrop-blur-sm transition-all duration-300"
                 [class]="vehicleInFrame() ? 'bg-emerald-500/80' : 'bg-black/60'">
              <div class="flex items-center gap-2">
                @if (vehicleInFrame()) {
                  <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span class="text-white text-sm font-medium">
                    @if (state() === 'capturing') {
                      Capturando... {{ stabilityProgress() }}%
                    } @else {
                      Vehículo detectado - Mantené quieto
                    }
                  </span>
                } @else {
                  <svg class="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span class="text-white/90 text-sm">Buscando vehículo...</span>
                }
              </div>
            </div>
          </div>

          <!-- Stability progress bar -->
          @if (state() === 'capturing') {
            <div class="absolute bottom-20 left-8 right-8">
              <div class="h-2 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  class="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-100"
                  [style.width.%]="stabilityProgress()"
                ></div>
              </div>
            </div>
          }

          <!-- Detection info -->
          @if (currentDetection()) {
            <div class="absolute bottom-4 left-4 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg">
              <p class="text-white text-xs">
                <span class="text-emerald-400 font-bold">{{ currentDetection()!.class | titlecase }}</span>
                <span class="text-white/60 ml-2">{{ (currentDetection()!.score * 100).toFixed(0) }}%</span>
              </p>
            </div>
          }

          <!-- Close button -->
          <button
            type="button"
            (click)="cancel()"
            class="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }

        <!-- Analyzing State -->
        @if (state() === 'analyzing') {
          <div class="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6">
            <!-- Captured image preview (blurred background) -->
            @if (capturedImage()) {
              <img [src]="capturedImage()" class="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
            }

            <div class="relative z-10 flex flex-col items-center">
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

              <h3 class="text-xl font-bold text-white mb-2">{{ analyzeStep() }}</h3>
              <p class="text-slate-400 text-sm text-center mb-4">
                {{ analyzeSubtext() }}
              </p>

              <!-- Progress bar -->
              <div class="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
                  [style.width.%]="analyzeProgress()"
                ></div>
              </div>
            </div>
          </div>
        }

        <!-- Success State -->
        @if (state() === 'success' && result()) {
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-900 p-5 overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center gap-3 mb-5">
              <div class="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Vehículo Identificado</h3>
                <p class="text-emerald-300 text-sm">{{ result()!.confidence }}% confianza</p>
              </div>
            </div>

            <!-- Vehicle Card -->
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
              <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M8 17h.01M16 17h.01M3 11l1.5-5.5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.5L21 11M3 11v6a1 1 0 001 1h1m16-7v6a1 1 0 01-1 1h-1M3 11h18" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-2xl font-bold text-white truncate">{{ result()!.brand }}</p>
                  <p class="text-lg text-emerald-200 truncate">{{ result()!.model }}</p>
                </div>
              </div>

              <!-- Specs Grid -->
              <div class="grid grid-cols-3 gap-2">
                <div class="bg-white/10 rounded-lg p-2 text-center">
                  <p class="text-[10px] text-emerald-300 mb-0.5">Año</p>
                  <p class="text-white font-bold text-sm">{{ formatYearRange(result()!.yearRange) }}</p>
                </div>
                <div class="bg-white/10 rounded-lg p-2 text-center">
                  <p class="text-[10px] text-emerald-300 mb-0.5">Color</p>
                  <p class="text-white font-bold text-sm capitalize">{{ result()!.color }}</p>
                </div>
                <div class="bg-white/10 rounded-lg p-2 text-center">
                  <p class="text-[10px] text-emerald-300 mb-0.5">Tipo</p>
                  <p class="text-white font-bold text-sm">{{ result()!.bodyType }}</p>
                </div>
              </div>
            </div>

            <!-- Market Value Card -->
            @if (result()!.marketValue) {
              <div class="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 rounded-xl p-4 mb-4">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-amber-200 font-semibold text-sm">Valor de Mercado (FIPE)</span>
                </div>
                <div class="text-center">
                  <p class="text-3xl font-bold text-white mb-1">
                    {{ result()!.marketValue!.currency }} {{ result()!.marketValue!.average | number:'1.0-0' }}
                  </p>
                  <p class="text-amber-200/80 text-xs">
                    Rango: {{ result()!.marketValue!.currency }} {{ result()!.marketValue!.min | number:'1.0-0' }}
                    - {{ result()!.marketValue!.currency }} {{ result()!.marketValue!.max | number:'1.0-0' }}
                  </p>
                </div>

                @if (result()!.suggestedDailyPrice) {
                  <div class="mt-3 pt-3 border-t border-amber-400/20 text-center">
                    <p class="text-amber-200/80 text-xs mb-1">Precio sugerido de alquiler</p>
                    <p class="text-xl font-bold text-amber-300">
                      {{ result()!.marketValue!.currency }} {{ result()!.suggestedDailyPrice | number:'1.0-0' }}/día
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Actions -->
            <div class="flex gap-3">
              <button
                type="button"
                (click)="reset()"
                class="flex-1 px-4 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors text-sm"
              >
                Escanear otro
              </button>
              <button
                type="button"
                (click)="useResult()"
                class="flex-1 px-4 py-3 bg-white text-emerald-900 rounded-xl font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Usar datos
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
            <h3 class="text-xl font-bold text-white mb-2">{{ errorTitle() }}</h3>
            <p class="text-slate-400 text-sm text-center mb-6 max-w-xs">{{ errorMessage() }}</p>
            <div class="flex gap-3">
              <button
                type="button"
                (click)="cancel()"
                class="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="retry()"
                class="px-6 py-3 bg-violet-500 text-white rounded-xl font-bold hover:bg-violet-600 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Bottom Info -->
      @if (state() === 'scanning' || state() === 'vehicle-detected') {
        <div class="bg-slate-800 px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-slate-400 text-xs">
              La IA detecta y sigue al vehículo automáticamente. Cuando esté centrado, capturamos y analizamos.
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class VehicleTrackingCameraComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('captureCanvas') captureCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly vehicleRecognitionService = inject(VehicleRecognitionService);
  private readonly fipeService = inject(FipeService);
  private readonly logger = inject(LoggerService);
  private readonly ngZone = inject(NgZone);

  private model: CocoSsdModel | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private stabilityCounter = 0;
  private lastDetectionBox: [number, number, number, number] | null = null;

  private readonly STABILITY_THRESHOLD = 30; // Frames needed for stable detection
  private readonly BOX_MOVEMENT_THRESHOLD = 20; // Pixels of allowed movement

  // Outputs
  readonly vehicleDetected = output<DetectedVehicleWithValue>();
  readonly cancelled = output<void>();

  // State
  readonly state = signal<TrackingState>('loading-model');
  readonly vehicleInFrame = signal(false);
  readonly currentDetection = signal<Detection | null>(null);
  readonly stabilityProgress = signal(0);
  readonly capturedImage = signal<string | null>(null);
  readonly result = signal<DetectedVehicleWithValue | null>(null);
  readonly errorTitle = signal('Error');
  readonly errorMessage = signal('');

  // Analyze progress
  readonly analyzeProgress = signal(0);
  readonly analyzeStep = signal('Analizando imagen...');
  readonly analyzeSubtext = signal('Identificando marca y modelo del vehículo');

  async ngOnInit(): Promise<void> {
    await this.loadModel();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async loadModel(): Promise<void> {
    this.state.set('loading-model');

    try {
      // Load TensorFlow.js and COCO-SSD dynamically
      await this.loadScripts();

      // Load the model
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Fastest model
      });

      this.logger.info('COCO-SSD model loaded', 'VehicleTracking');

      // Start camera after model is ready
      await this.startCamera();
    } catch (error) {
      this.logger.error('Failed to load model', 'VehicleTracking', error);
      this.state.set('error');
      this.errorTitle.set('Error al cargar IA');
      this.errorMessage.set('No se pudo cargar el modelo de detección. Verificá tu conexión.');
    }
  }

  private async loadScripts(): Promise<void> {
    // Check if already loaded
    if (typeof cocoSsd !== 'undefined') return;

    // Load TensorFlow.js
    await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
    // Load COCO-SSD
    await this.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  private async startCamera(): Promise<void> {
    this.state.set('camera-loading');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        await this.videoElement.nativeElement.play();

        // Setup canvas size
        const video = this.videoElement.nativeElement;
        if (this.overlayCanvas?.nativeElement) {
          this.overlayCanvas.nativeElement.width = video.videoWidth;
          this.overlayCanvas.nativeElement.height = video.videoHeight;
        }

        this.state.set('scanning');
        this.startDetectionLoop();
      }
    } catch (error) {
      this.logger.error('Camera access failed', 'VehicleTracking', error);
      this.state.set('error');
      this.errorTitle.set('Sin acceso a cámara');
      this.errorMessage.set('Permití el acceso a la cámara para escanear tu vehículo.');
    }
  }

  private startDetectionLoop(): void {
    const detect = async () => {
      if (!this.model || !this.videoElement?.nativeElement || this.state() === 'analyzing' || this.state() === 'success') {
        return;
      }

      try {
        const video = this.videoElement.nativeElement;
        const predictions = await this.model.detect(video);

        // Filter for vehicles only
        const vehicles = predictions.filter(
          p => VEHICLE_CLASSES.includes(p.class) && p.score > 0.5
        );

        // Use the best detection
        const bestVehicle = vehicles.length > 0
          ? vehicles.reduce((a, b) => (a.score > b.score ? a : b))
          : null;

        this.ngZone.run(() => {
          this.processDetection(bestVehicle);
        });

        // Draw bounding box
        this.drawOverlay(bestVehicle);
      } catch (error) {
        this.logger.warn('Detection frame error', 'VehicleTracking', error);
      }

      // Continue loop
      this.animationFrameId = requestAnimationFrame(detect);
    };

    detect();
  }

  private processDetection(detection: Detection | null): void {
    this.currentDetection.set(detection);

    if (!detection) {
      this.vehicleInFrame.set(false);
      this.stabilityCounter = 0;
      this.stabilityProgress.set(0);
      this.lastDetectionBox = null;
      if (this.state() !== 'scanning') {
        this.state.set('scanning');
      }
      return;
    }

    this.vehicleInFrame.set(true);

    // Check if vehicle is stable (not moving much)
    const isStable = this.checkStability(detection.bbox);

    if (isStable) {
      this.stabilityCounter++;
      this.stabilityProgress.set(Math.min(100, (this.stabilityCounter / this.STABILITY_THRESHOLD) * 100));

      if (this.state() !== 'capturing') {
        this.state.set('capturing');
      }

      // Auto-capture when stable enough
      if (this.stabilityCounter >= this.STABILITY_THRESHOLD) {
        this.captureAndAnalyze();
      }
    } else {
      this.stabilityCounter = Math.max(0, this.stabilityCounter - 2); // Decay
      this.stabilityProgress.set(Math.min(100, (this.stabilityCounter / this.STABILITY_THRESHOLD) * 100));
      if (this.state() === 'capturing' && this.stabilityCounter < 10) {
        this.state.set('vehicle-detected');
      }
    }

    this.lastDetectionBox = detection.bbox;
  }

  private checkStability(currentBox: [number, number, number, number]): boolean {
    if (!this.lastDetectionBox) return true;

    const [x1, y1] = currentBox;
    const [x2, y2] = this.lastDetectionBox;

    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);

    return dx < this.BOX_MOVEMENT_THRESHOLD && dy < this.BOX_MOVEMENT_THRESHOLD;
  }

  private drawOverlay(detection: Detection | null): void {
    const canvas = this.overlayCanvas?.nativeElement;
    const video = this.videoElement?.nativeElement;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detection) return;

    const [x, y, width, height] = detection.bbox;

    // Scale to canvas size
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledW = width * scaleX;
    const scaledH = height * scaleY;

    // Draw bounding box
    ctx.strokeStyle = this.state() === 'capturing' ? '#34D399' : '#A78BFA'; // emerald or violet
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);

    // Animated dash offset
    const time = Date.now() / 100;
    ctx.lineDashOffset = time % 30;

    ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

    // Draw corner accents
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    const cornerSize = 20;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + cornerSize);
    ctx.lineTo(scaledX, scaledY);
    ctx.lineTo(scaledX + cornerSize, scaledY);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(scaledX + scaledW - cornerSize, scaledY);
    ctx.lineTo(scaledX + scaledW, scaledY);
    ctx.lineTo(scaledX + scaledW, scaledY + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + scaledH - cornerSize);
    ctx.lineTo(scaledX, scaledY + scaledH);
    ctx.lineTo(scaledX + cornerSize, scaledY + scaledH);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(scaledX + scaledW - cornerSize, scaledY + scaledH);
    ctx.lineTo(scaledX + scaledW, scaledY + scaledH);
    ctx.lineTo(scaledX + scaledW, scaledY + scaledH - cornerSize);
    ctx.stroke();
  }

  private async captureAndAnalyze(): Promise<void> {
    // Stop detection loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Capture frame
    const video = this.videoElement?.nativeElement;
    const canvas = this.captureCanvas?.nativeElement;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    this.capturedImage.set(imageData);

    // Stop camera
    this.stopCamera();

    // Start analysis
    this.state.set('analyzing');
    await this.analyzeImage(imageData);
  }

  private async analyzeImage(imageData: string): Promise<void> {
    try {
      // Step 1: Vehicle Recognition
      this.analyzeProgress.set(20);
      this.analyzeStep.set('Identificando vehículo...');
      this.analyzeSubtext.set('Analizando marca, modelo y características');

      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
      const recognition = await this.vehicleRecognitionService.recognizeFromBase64(base64);

      if (!recognition.success || recognition.vehicle.confidence < 50) {
        throw new Error('No se pudo identificar el vehículo con suficiente confianza');
      }

      this.analyzeProgress.set(60);
      this.analyzeStep.set('Consultando valor de mercado...');
      this.analyzeSubtext.set('Buscando en base de datos FIPE');

      // Step 2: FIPE Lookup
      let marketValue: DetectedVehicleWithValue['marketValue'] | undefined;
      let suggestedDailyPrice: number | undefined;

      try {
        // Try to find in FIPE
        const brands = await this.fipeService.getBrands('carros');
        const matchingBrand = brands.find(
          b => b.nome.toLowerCase().includes(recognition.vehicle.brand.toLowerCase()) ||
               recognition.vehicle.brand.toLowerCase().includes(b.nome.toLowerCase())
        );

        if (matchingBrand) {
          const models = await this.fipeService.getModels('carros', matchingBrand.codigo);
          const matchingModel = models.find(
            m => m.nome.toLowerCase().includes(recognition.vehicle.model.toLowerCase())
          );

          if (matchingModel) {
            const years = await this.fipeService.getYears('carros', matchingBrand.codigo, matchingModel.codigo);
            const targetYear = recognition.vehicle.year_range[0];
            const matchingYear = years.find(y => y.nome.includes(targetYear.toString()));

            if (matchingYear) {
              const value = await this.fipeService.getValue(
                'carros',
                matchingBrand.codigo,
                matchingModel.codigo,
                matchingYear.codigo
              );

              if (value?.Valor) {
                const numericValue = parseFloat(value.Valor.replace(/[^\d,]/g, '').replace(',', '.'));
                marketValue = {
                  min: numericValue * 0.9,
                  max: numericValue * 1.1,
                  average: numericValue,
                  currency: 'R$',
                };

                // Suggested daily price: ~0.2% of value (rough estimate)
                suggestedDailyPrice = Math.round(numericValue * 0.002);
              }
            }
          }
        }
      } catch (fipeError) {
        this.logger.warn('FIPE lookup failed', 'VehicleTracking', fipeError);
        // Continue without market value
      }

      this.analyzeProgress.set(100);

      // Build result
      const result: DetectedVehicleWithValue = {
        brand: recognition.vehicle.brand,
        model: recognition.vehicle.model,
        year: recognition.vehicle.year_range[0],
        yearRange: recognition.vehicle.year_range,
        color: recognition.vehicle.color,
        bodyType: this.getBodyTypeLabel(recognition.vehicle.body_type),
        confidence: recognition.vehicle.confidence,
        marketValue,
        suggestedDailyPrice,
      };

      this.result.set(result);
      this.state.set('success');

      this.logger.info(
        `Vehicle identified: ${result.brand} ${result.model}`,
        'VehicleTracking'
      );
    } catch (error) {
      this.logger.error('Analysis failed', 'VehicleTracking', error);
      this.state.set('error');
      this.errorTitle.set('No se pudo identificar');
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Intentá con mejor iluminación o más cerca del vehículo.'
      );
    }
  }

  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopCamera();
  }

  // Public methods
  cancel(): void {
    this.cleanup();
    this.cancelled.emit();
  }

  reset(): void {
    this.result.set(null);
    this.capturedImage.set(null);
    this.stabilityCounter = 0;
    this.stabilityProgress.set(0);
    this.lastDetectionBox = null;
    this.analyzeProgress.set(0);
    this.startCamera();
  }

  retry(): void {
    this.reset();
  }

  useResult(): void {
    const r = this.result();
    if (r) {
      this.vehicleDetected.emit(r);
    }
  }

  formatYearRange(range: [number, number]): string {
    if (range[0] === range[1]) return range[0].toString();
    return `${range[0]}-${range[1]}`;
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
