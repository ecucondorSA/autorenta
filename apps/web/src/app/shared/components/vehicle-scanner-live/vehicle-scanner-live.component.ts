import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  output,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  VehicleScannerService,
  VehicleScanResult,
  FipeMarketValue,
} from '@core/services/ai/vehicle-scanner.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Output data when vehicle is confirmed
 */
export interface VehicleScannerConfirmData {
  detection: VehicleScanResult;
  marketValue: FipeMarketValue | null;
  suggestedDailyPrice: number | null;
}

/**
 * VehicleScannerLiveComponent
 *
 * Fullscreen camera component that continuously scans and displays
 * vehicle brand, model, year, and market price in real-time.
 *
 * Usage:
 * ```html
 * <app-vehicle-scanner-live
 *   (vehicleConfirmed)="onVehicleConfirmed($event)"
 *   (cancelled)="onCancelled()"
 * />
 * ```
 */
@Component({
  selector: 'app-vehicle-scanner-live',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 bg-black full-screen-scan scan-stage">
      <!-- Header -->
      <header class="scan-header scan-layer flex items-center justify-between px-4 py-3 sm:py-4 backdrop-blur-sm safe-area-top">
        <button
          type="button"
          (click)="cancel()"
          class="p-2 -ml-2 text-white/70 hover:text-white transition-colors"
          aria-label="Cancelar"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 class="text-white font-semibold tracking-tight">Escanear vehículo</h2>
        <div class="w-10"></div>
      </header>

      <!-- Camera View -->
      <main class="scan-video-layer absolute inset-0 overflow-hidden">
        <!-- Video Element -->
        <video
          #videoElement
          autoplay
          playsinline
          muted
          class="absolute inset-0 w-full h-full object-cover"
        ></video>

        <!-- Guide Frame Corners -->
        <div class="absolute inset-8 pointer-events-none">
          <div
            class="absolute top-0 left-0 w-16 h-16 border-t-3 border-l-3 rounded-tl-xl transition-colors duration-300"
            [class]="scanner.hasDetection() ? 'border-neon' : 'border-neutral-500/50'"
          ></div>
          <div
            class="absolute top-0 right-0 w-16 h-16 border-t-3 border-r-3 rounded-tr-xl transition-colors duration-300"
            [class]="scanner.hasDetection() ? 'border-neon' : 'border-neutral-500/50'"
          ></div>
          <div
            class="absolute bottom-0 left-0 w-16 h-16 border-b-3 border-l-3 rounded-bl-xl transition-colors duration-300"
            [class]="scanner.hasDetection() ? 'border-neon' : 'border-neutral-500/50'"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-16 h-16 border-b-3 border-r-3 rounded-br-xl transition-colors duration-300"
            [class]="scanner.hasDetection() ? 'border-neon' : 'border-neutral-500/50'"
          ></div>
        </div>

        <!-- Frame Counter Badge -->
        <div class="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full hidden sm:flex">
          <span class="text-neutral-400 text-xs font-mono">{{ scanner.frameCount() }} frames</span>
        </div>

        <!-- Detection Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-4 safe-area-bottom scan-layer">
          @if (scanner.currentDetection(); as detection) {
            <!-- Vehicle Card -->
            <div class="bg-black/95 backdrop-blur-md rounded-2xl p-4 border border-neutral-800/50 shadow-2xl animate-fadeIn">
              <!-- Header: Brand/Model + Confidence -->
              <div class="flex items-start justify-between gap-4 mb-3">
                <div class="flex-1 min-w-0">
                  <h3 class="text-xl font-bold text-white truncate">
                    {{ detection.brand }} {{ detection.model }}
                  </h3>
                  <p class="text-neutral-400 text-sm mt-0.5">
                    {{ scanner.yearLabel() }} · {{ detection.color | titlecase }} · {{ getBodyTypeLabel(detection.bodyType) }}
                  </p>
                </div>
                <div class="flex flex-col items-end shrink-0">
                  <span
                    class="text-sm font-bold"
                    [class]="getConfidenceColorClass(detection.confidence)"
                  >
                    {{ detection.confidence }}%
                  </span>
                  <span class="text-neutral-500 text-[10px] uppercase tracking-wide">confianza</span>
                </div>
              </div>

              <!-- FIPE Value Section -->
              @if (scanner.marketValue(); as fipe) {
                <div class="bg-neon/10 border border-neon/20 rounded-xl p-3 mb-3">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span class="text-neon/80 text-xs font-medium uppercase tracking-wide">Valor FIPE</span>
                    </div>
                    <span class="text-[10px] text-neon/60">{{ fipe.reference_month }}</span>
                  </div>
                  <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold text-white">
                      USD {{ fipe.value_usd | number:'1.0-0' }}
                    </span>
                    <span class="text-neutral-400 text-sm">
                      R$ {{ fipe.value_brl | number:'1.0-0' }}
                    </span>
                  </div>
                  @if (scanner.suggestedDailyPrice(); as dailyPrice) {
                    <div class="flex items-center justify-between mt-2 pt-2 border-t border-neon/20">
                      <span class="text-neutral-400 text-xs">Precio sugerido de alquiler</span>
                      <span class="text-neon font-bold">
                        $ {{ dailyPrice | number }}/día
                      </span>
                    </div>
                  }
                </div>
              } @else if (scanner.isFetchingFipe()) {
                <div class="bg-neutral-900/50 rounded-xl p-3 mb-3 flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-neon/30 border-t-neon rounded-full animate-spin"></div>
                  <span class="text-neutral-400 text-sm">Consultando precio de mercado...</span>
                </div>
              } @else if (scanner.detectionStability() >= 50) {
                <div class="bg-neutral-900/50 rounded-xl p-3 mb-3 flex items-center justify-center">
                  <span class="text-neutral-500 text-sm">Precio no disponible en FIPE</span>
                </div>
              }

              <!-- Positive Feedback Message -->
              <div class="bg-neon/10 border border-neon/20 rounded-xl p-3 mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ detectionMessage().icon }}</span>
                  <span class="text-neon text-sm font-medium">{{ detectionMessage().text }}</span>
                </div>
              </div>

              <!-- Stability Progress Bar -->
              <div class="relative">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-neutral-400 text-xs">Estabilidad de detección</span>
                  <span class="text-neutral-300 text-xs font-medium">{{ scanner.detectionStability() }}%</span>
                </div>
                <div class="h-2 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300 rounded-full bg-neon"
                    [style.width.%]="scanner.detectionStability()"
                  ></div>
                </div>
                @if (scanner.isStableEnough()) {
                  <p class="text-center text-neon text-xs mt-2 font-medium">
                    ✓ ¡Listo para confirmar!
                  </p>
                } @else {
                  <p class="text-center text-neutral-500 text-xs mt-2">
                    Mantené la cámara estable unos segundos más...
                  </p>
                }
              </div>
            </div>
          } @else {
            <!-- Scanning State - No Detection Yet -->
            <div class="scan-card mx-auto w-full max-w-md sm:max-w-lg rounded-2xl p-5 border shadow-2xl">
              <!-- Header -->
              <div class="flex items-center gap-3 mb-3">
                <div class="relative w-6 h-6">
                  <div class="absolute inset-0 border-2 border-neon/30 rounded-full"></div>
                  <div class="absolute inset-0 border-2 border-transparent border-t-neon rounded-full animate-spin"></div>
                </div>
                <span class="text-white font-semibold">Escaneando vehículo</span>
              </div>
              <p class="text-neutral-300 text-sm mb-4">
                Mantené el auto centrado y bien iluminado.
              </p>

              <!-- Rotating Tips -->
              <div class="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ currentTip().icon }}</span>
                  <div>
                    <p class="text-cta-default text-sm font-medium">Consejo</p>
                    <p class="text-white text-sm mt-0.5">{{ currentTip().text }}</p>
                  </div>
                </div>
              </div>

              <!-- All Tips List -->
              <div class="space-y-2 hidden sm:block">
                @for (tip of scanningTips; track tip.text; let i = $index) {
                  <div
                    class="flex items-center gap-2 text-xs transition-opacity duration-300"
                    [class]="currentTipIndex() % scanningTips.length === i ? 'text-white opacity-100' : 'text-neutral-500 opacity-60'"
                  >
                    <span>{{ tip.icon }}</span>
                    <span>{{ tip.text }}</span>
                  </div>
                }
              </div>

              <div class="mt-4 pt-3 border-t border-neutral-800/50">
                <span class="text-neutral-500 text-xs">Procesando imagen…</span>
              </div>
            </div>
          }
        </div>

        <!-- Camera Error -->
        @if (cameraError()) {
          <div class="absolute inset-0 bg-black flex flex-col items-center justify-center p-8">
            <div class="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Sin acceso a cámara</h3>
            <p class="text-neutral-400 text-sm text-center mb-6 max-w-xs">
              {{ cameraError() }}
            </p>
            <button
              type="button"
              (click)="cancel()"
              class="px-6 py-3 bg-neutral-800 text-white rounded-xl font-medium hover:bg-neutral-700 transition-colors"
            >
              Volver
            </button>
          </div>
        }
      </main>

      <!-- Footer Actions -->
      <footer class="scan-footer scan-layer p-4 border-t safe-area-bottom">
        @if (scanner.isStableEnough() && scanner.currentDetection()) {
          <button
            type="button"
            (click)="confirmAndUse()"
            class="w-full py-4 bg-neon hover:bg-neon/90 active:bg-neon/80 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Usar estos datos
          </button>
        } @else {
          <button
            type="button"
            (click)="cancel()"
            class="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-xl transition-colors"
          >
            Cancelar
          </button>
        }
      </footer>
    </div>
  `,
  styles: [`
    /* Neon green color utilities (#00d95f) */
    .bg-neon { background-color: #00d95f; }
    .bg-neon\\/10 { background-color: rgba(0, 217, 95, 0.1); }
    .bg-neon\\/90 { background-color: rgba(0, 217, 95, 0.9); }
    .bg-neon\\/80 { background-color: rgba(0, 217, 95, 0.8); }
    .text-neon { color: #00d95f; }
    .text-neon\\/80 { color: rgba(0, 217, 95, 0.8); }
    .text-neon\\/60 { color: rgba(0, 217, 95, 0.6); }
    .border-neon { border-color: #00d95f; }
    .border-neon\\/20 { border-color: rgba(0, 217, 95, 0.2); }
    .border-neon\\/30 { border-color: rgba(0, 217, 95, 0.3); }
    .border-t-neon { border-top-color: #00d95f; }

    .border-t-3 { border-top-width: 3px; }
    .border-b-3 { border-bottom-width: 3px; }
    .border-l-3 { border-left-width: 3px; }
    .border-r-3 { border-right-width: 3px; }

    .safe-area-top {
      padding-top: max(1rem, env(safe-area-inset-top));
    }

    .safe-area-bottom {
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }

    .full-screen-scan {
      width: 100vw;
      height: 100dvh;
      overscroll-behavior: contain;
    }

    .scan-stage {
      position: relative;
    }

    .scan-layer {
      position: absolute;
      left: 0;
      right: 0;
      z-index: 2;
    }

    .scan-header {
      top: 0;
    }

    .scan-footer {
      bottom: 0;
    }

    .scan-video-layer {
      z-index: 1;
    }

    .scan-header {
      background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.9) 0%,
        rgba(0, 0, 0, 0.6) 100%
      );
      border-bottom: 1px solid rgba(0, 217, 95, 0.15);
    }

    .scan-footer {
      background: rgba(0, 0, 0, 0.92);
      border-color: rgba(0, 217, 95, 0.2);
    }

    .scan-card {
      background: rgba(0, 0, 0, 0.86);
      border-color: rgba(0, 217, 95, 0.2);
      box-shadow: 0 24px 50px -36px rgba(0, 217, 95, 0.2);
      backdrop-filter: blur(16px);
    }
  `],
})
export class VehicleScannerLiveComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;

  readonly scanner = inject(VehicleScannerService);
  private readonly logger = inject(LoggerService);

  /** Emits when user confirms vehicle detection */
  readonly vehicleConfirmed = output<VehicleScannerConfirmData>();

  /** Emits when user cancels */
  readonly cancelled = output<void>();

  /** Camera error message */
  readonly cameraError = signal<string | null>(null);

  /** Current tip index for rotation */
  readonly currentTipIndex = signal(0);

  private stream: MediaStream | null = null;
  private tipRotationInterval: ReturnType<typeof setInterval> | null = null;

  // Tips when NO vehicle detected
  readonly scanningTips = [
    { icon: '📷', text: 'Asegurate que el auto esté bien iluminado' },
    { icon: '🚗', text: 'Apuntá al frente o lateral del vehículo' },
    { icon: '↔️', text: 'Alejate un poco para capturar el auto completo' },
    { icon: '🌙', text: 'Evitá contraluces o sombras fuertes' },
    { icon: '🎯', text: 'Mantené el auto centrado en la pantalla' },
  ];

  // Messages when vehicle IS detected (positive feedback)
  readonly detectionMessages = [
    { icon: '✨', text: '¡Excelente captura! Auto detectado' },
    { icon: '🎯', text: '¡Perfecto! Buena posición del vehículo' },
    { icon: '📸', text: '¡Genial! Imagen clara y nítida' },
    { icon: '👍', text: '¡Muy bien! Iluminación ideal' },
    { icon: '🚀', text: '¡Listo! Procesando información...' },
  ];

  /** Get current tip based on index */
  readonly currentTip = computed(() => this.scanningTips[this.currentTipIndex() % this.scanningTips.length]);

  /** Get random positive message when detected */
  readonly detectionMessage = computed(() => {
    const stability = this.scanner.detectionStability();
    const index = Math.min(Math.floor(stability / 20), this.detectionMessages.length - 1);
    return this.detectionMessages[index];
  });

  // Body type labels
  private readonly bodyTypeLabels: Record<string, string> = {
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

  async ngOnInit(): Promise<void> {
    await this.startCamera();
    this.startTipRotation();
  }

  ngOnDestroy(): void {
    this.scanner.stopScanning();
    this.stopCamera();
    this.stopTipRotation();
  }

  /**
   * Start rotating tips every 4 seconds
   */
  private startTipRotation(): void {
    this.tipRotationInterval = setInterval(() => {
      this.currentTipIndex.update(i => i + 1);
    }, 4000);
  }

  /**
   * Stop tip rotation
   */
  private stopTipRotation(): void {
    if (this.tipRotationInterval) {
      clearInterval(this.tipRotationInterval);
      this.tipRotationInterval = null;
    }
  }

  /**
   * Start camera and scanner
   */
  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // Wait for video element to be available
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = this.stream;
        await this.videoRef.nativeElement.play();

        // Start scanner
        this.scanner.startScanning(this.videoRef.nativeElement);
      }
    } catch (error) {
      this.logger.error('Camera access failed', 'VehicleScannerLive', error);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.cameraError.set('Permití el acceso a la cámara para escanear el vehículo');
        } else if (error.name === 'NotFoundError') {
          this.cameraError.set('No se encontró una cámara disponible');
        } else {
          this.cameraError.set('Error al acceder a la cámara');
        }
      } else {
        this.cameraError.set('Error desconocido al acceder a la cámara');
      }
    }
  }

  /**
   * Stop camera stream
   */
  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.srcObject = null;
    }
  }

  /**
   * Confirm and emit result
   */
  confirmAndUse(): void {
    const result = this.scanner.getResultForForm();
    if (!result) return;

    this.vehicleConfirmed.emit(result);
  }

  /**
   * Cancel and close
   */
  cancel(): void {
    this.scanner.stopScanning();
    this.stopCamera();
    this.cancelled.emit();
  }

  /**
   * Get body type label
   */
  getBodyTypeLabel(bodyType: string): string {
    return this.bodyTypeLabels[bodyType] || 'Auto';
  }

  /**
   * Get confidence color class
   */
  getConfidenceColorClass(confidence: number): string {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 60) return 'text-amber-400';
    return 'text-rose-400';
  }
}
