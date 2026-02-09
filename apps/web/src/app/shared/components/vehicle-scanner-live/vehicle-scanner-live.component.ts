import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  output,
  ViewChild,
  ElementRef,
  Renderer2,
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
    <div
      class="fixed inset-0 z-[9999] bg-black full-screen-scan scan-stage fade-in"
      [class.fade-out]="isClosing()"
    >
      <!-- Header - Clean minimal design with WCAG AA contrast (bg: rgba(0,0,0,0.85) = ~12:1 ratio) -->
      <header class="scan-header-minimal safe-area-top">
        <button type="button" (click)="cancel()" class="close-btn" aria-label="Cerrar escáner">
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div
          class="status-indicator"
          [class.detected]="scanner.hasDetection()"
          [class.ready]="scanner.isStableEnough()"
        >
          <span class="status-dot"></span>
          <span class="status-text">
            {{
              scanner.isStableEnough() ? 'Listo' : scanner.hasDetection() ? 'Detectado' : 'Buscando'
            }}
          </span>
        </div>
      </header>

      <!-- Camera View - Clean, unobstructed -->
      <main class="scan-video-layer absolute inset-0 overflow-hidden">
        <!-- Video Element -->
        <video
          #videoElement
          autoplay
          playsinline
          muted
          class="absolute inset-0 w-full h-full object-cover"
        ></video>

        <!-- Minimal corner brackets only - no silhouette, no grid, no scan lines -->
        <div
          class="scan-frame-minimal"
          [class.detected]="scanner.hasDetection()"
          [class.locked]="scanner.isStableEnough()"
        >
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
        </div>

        <!-- Single alert for low light only - positioned at top, high contrast -->
        @if (lowLight()) {
          <div class="low-light-alert">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>Poca luz - buscá mejor iluminación</span>
          </div>
        }

        <!-- Detection Card - Bottom overlay with proper contrast -->
        <div class="detection-overlay safe-area-bottom">
          @if (!isSecureContextSignal()) {
            <div class="error-banner">
              <span>Se requiere HTTPS para usar la cámara</span>
            </div>
          } @else if (permissionState() === 'denied') {
            <div class="error-banner">
              <span>Cámara bloqueada - revisá permisos</span>
            </div>
          }

          @if (scanner.currentDetection(); as detection) {
            <!-- Detected Vehicle Card - Simplified -->
            <div class="detection-card detected">
              <div class="detection-header">
                <div class="vehicle-info">
                  <h3 class="vehicle-name">{{ detection.brand }} {{ detection.model }}</h3>
                  <p class="vehicle-details">
                    {{ scanner.yearLabel() }} · {{ detection.color | titlecase }}
                  </p>
                </div>
                <div
                  class="confidence-badge"
                  [class.high]="detection.confidence >= 80"
                  [class.medium]="detection.confidence >= 60 && detection.confidence < 80"
                >
                  {{ detection.confidence }}%
                </div>
              </div>

              @if (scanner.marketValue(); as fipe) {
                <div class="price-row">
                  <span class="price-label">Valor mercado</span>
                  <span class="price-value">USD {{ fipe.value_usd | number: '1.0-0' }}</span>
                </div>
              }

              <!-- Simple progress indicator -->
              <div class="stability-bar">
                <div class="stability-fill" [style.width.%]="scanner.detectionStability()"></div>
              </div>
              <p class="stability-hint">
                {{ scanner.isStableEnough() ? '✓ Listo para confirmar' : 'Mantené estable...' }}
              </p>
            </div>
          } @else {
            <!-- Scanning State - Minimal -->
            <div class="detection-card scanning">
              <div class="scanning-indicator">
                <div class="spinner"></div>
                <span>Apuntá al vehículo</span>
              </div>
            </div>
          }
        </div>

        <!-- Camera Error Overlay -->
        @if (cameraError()) {
          <div class="camera-error-overlay">
            <div class="error-icon">
              <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="error-title">Cámara no disponible</h3>
            <p class="error-message">{{ cameraError() }}</p>
            <button type="button" (click)="retryCamera()" class="retry-btn">Reintentar</button>
          </div>
        }
      </main>

      <!-- Footer - Action button -->
      @if (!cameraError()) {
        <footer class="scan-footer-minimal safe-area-bottom">
          @if (scanner.isStableEnough() && scanner.currentDetection()) {
            <button type="button" (click)="confirmAndUse()" class="confirm-btn-minimal">
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Usar estos datos
            </button>
          } @else {
            <p class="footer-hint">
              {{ scanner.hasDetection() ? 'Estabilizando...' : 'Buscando vehículo...' }}
            </p>
          }
        </footer>
      }
    </div>
  `,
  styles: [
    `
      /*
     * MINIMAL SCANNER STYLES - WCAG AA Compliant
     * Contrast ratios: text on dark bg minimum 4.5:1, large text 3:1
     * Background overlays use rgba(0,0,0,0.85) for ~12:1 contrast with white text
     */

      /* === CORE: Fullscreen positioning === */
      :host {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        z-index: 999999 !important;
        display: block !important;
        contain: none !important;
        transform: none !important;
        isolation: isolate;
      }

      .full-screen-scan {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        z-index: 999999 !important;
        background: #000;
        overscroll-behavior: contain;
      }

      /* === SAFE AREAS === */
      .safe-area-top {
        padding-top: max(16px, env(safe-area-inset-top));
      }

      .safe-area-bottom {
        padding-bottom: max(16px, env(safe-area-inset-bottom));
      }

      /* === ANIMATIONS === */
      .fade-in {
        animation: fadeIn 200ms ease-out;
      }

      .fade-out {
        opacity: 0;
        transform: scale(0.98);
        transition:
          opacity 200ms ease,
          transform 200ms ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* === HEADER: Minimal with high contrast === */
      .scan-header-minimal {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
      }

      .close-btn {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        border: none;
        color: #fff;
        cursor: pointer;
        transition: background 150ms ease;
      }

      .close-btn:hover,
      .close-btn:active {
        background: rgba(0, 0, 0, 0.8);
      }

      /* === STATUS INDICATOR === */
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 20px;
        background: rgba(0, 0, 0, 0.9);
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      }

      .status-indicator.detected {
        color: #00d95f;
      }

      .status-indicator.ready {
        background: #00d95f;
        color: #000;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .status-indicator.detected .status-dot {
        background: #00d95f;
      }

      .status-indicator.ready .status-dot {
        background: #000;
        animation: none;
      }

      .status-text {
        line-height: 1;
      }

      /* === VIDEO LAYER === */
      .scan-video-layer {
        z-index: 1;
      }

      /* === MINIMAL CORNER FRAME === */
      .scan-frame-minimal {
        position: absolute;
        inset: 10%;
        pointer-events: none;
        z-index: 2;
      }

      .corner {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 4px solid #fff;
        filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 8px rgba(0, 0, 0, 0.5));
        transition: all 300ms ease;
      }

      .corner-tl {
        top: 0;
        left: 0;
        border-right: none;
        border-bottom: none;
      }
      .corner-tr {
        top: 0;
        right: 0;
        border-left: none;
        border-bottom: none;
      }
      .corner-bl {
        bottom: 0;
        left: 0;
        border-right: none;
        border-top: none;
      }
      .corner-br {
        bottom: 0;
        right: 0;
        border-left: none;
        border-top: none;
      }

      .scan-frame-minimal.detected .corner {
        border-color: #00d95f;
        width: 40px;
        height: 40px;
      }

      .scan-frame-minimal.locked .corner {
        border-color: #00d95f;
        width: 48px;
        height: 48px;
        box-shadow: 0 0 12px rgba(0, 217, 95, 0.6);
      }

      /* === LOW LIGHT ALERT === */
      .low-light-alert {
        position: absolute;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 8px;
        background: rgba(251, 191, 36, 0.9);
        color: #000;
        font-size: 13px;
        font-weight: 600;
      }

      /* === DETECTION OVERLAY (bottom) === */
      .detection-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 5;
        padding: 16px;
        background: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.85) 0%,
          rgba(0, 0, 0, 0.6) 70%,
          transparent 100%
        );
      }

      .error-banner {
        padding: 12px 16px;
        margin-bottom: 12px;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.9);
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
      }

      /* === DETECTION CARD === */
      .detection-card {
        padding: 16px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .detection-card.detected {
        border-color: rgba(0, 217, 95, 0.4);
      }

      .detection-card.scanning {
        background: rgba(0, 0, 0, 0.9);
      }

      .detection-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .vehicle-info {
        flex: 1;
      }

      .vehicle-name {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        line-height: 1.2;
      }

      .vehicle-details {
        margin: 4px 0 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }

      .confidence-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.7);
      }

      .confidence-badge.high {
        background: rgba(0, 217, 95, 0.2);
        color: #00d95f;
      }

      .confidence-badge.medium {
        background: rgba(251, 191, 36, 0.2);
        color: #fbbf24;
      }

      .price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: 8px;
      }

      .price-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
      }

      .price-value {
        font-size: 16px;
        font-weight: 700;
        color: #00d95f;
      }

      /* === STABILITY BAR === */
      .stability-bar {
        height: 4px;
        margin-top: 12px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.1);
        overflow: hidden;
      }

      .stability-fill {
        height: 100%;
        background: #00d95f;
        transition: width 200ms ease;
      }

      .stability-hint {
        margin: 8px 0 0;
        font-size: 13px;
        color: #fff;
        text-align: center;
      }

      /* === SCANNING STATE === */
      .scanning-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 8px 0;
      }

      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .scanning-indicator span {
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      /* === CAMERA ERROR OVERLAY === */
      .camera-error-overlay {
        position: absolute;
        inset: 0;
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(to bottom, #1a1a1a, #000);
      }

      .error-icon {
        width: 80px;
        height: 80px;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }

      .error-title {
        margin: 0 0 12px;
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        text-align: center;
      }

      .error-message {
        margin: 0 0 24px;
        font-size: 15px;
        color: rgba(255, 255, 255, 0.7);
        text-align: center;
        max-width: 300px;
        line-height: 1.5;
        white-space: pre-line;
      }

      .retry-btn {
        padding: 14px 32px;
        border: none;
        border-radius: 12px;
        background: #00d95f;
        color: #000;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: background 150ms ease;
      }

      .retry-btn:hover,
      .retry-btn:active {
        background: #00ff6e;
      }

      /* === FOOTER === */
      .scan-footer-minimal {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10;
        padding: 16px;
        text-align: center;
      }

      .confirm-btn-minimal {
        width: 100%;
        max-width: 320px;
        margin: 0 auto;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        border: none;
        border-radius: 14px;
        background: #00d95f;
        color: #000;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 150ms ease;
      }

      .confirm-btn-minimal:hover,
      .confirm-btn-minimal:active {
        background: #00ff6e;
        transform: scale(1.02);
      }

      .footer-hint {
        margin: 0;
        padding: 12px 20px;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 12px;
        display: inline-block;
      }

      /* === RESPONSIVE === */
      @media (max-width: 480px) {
        .scan-frame-minimal {
          inset: 5%;
        }

        .detection-card {
          padding: 14px;
        }

        .vehicle-name {
          font-size: 16px;
        }

        .confirm-btn-minimal {
          padding: 14px 20px;
          font-size: 15px;
        }
      }

      /* === REDUCED MOTION === */
      @media (prefers-reduced-motion: reduce) {
        .fade-in,
        .fade-out,
        .spinner,
        .status-dot,
        .corner {
          animation: none !important;
          transition: none !important;
        }
      }
    `,
  ],
})
export class VehicleScannerLiveComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;

  readonly scanner = inject(VehicleScannerService);
  private readonly logger = inject(LoggerService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  /** Emits when user confirms vehicle detection */
  readonly vehicleConfirmed = output<VehicleScannerConfirmData>();

  /** Emits when user cancels */
  readonly cancelled = output<void>();

  // GHOST SILHOUETTES (SVG paths) - Professional car outlines centered in 400x300
  // Each silhouette includes: body, windows, wheels with realistic proportions
  private readonly GHOST_SILHOUETTES: Record<
    string,
    { body: string; windows: string; wheels: string[] }
  > = {
    sedan: {
      // Classic 3-box sedan silhouette - low roof, trunk
      body: `M 60,185
             L 60,165 C 60,155 70,140 85,135
             L 100,115 C 110,95 135,85 180,85
             L 250,85 C 290,85 315,95 335,120
             L 350,145 C 365,150 375,160 375,175
             L 375,185`,
      windows: `M 110,130 L 125,100 C 135,90 155,87 185,87 L 235,87 C 260,87 275,95 285,110 L 300,130 Z`,
      wheels: [
        'M 105,195 m -22,0 a 22,22 0 1,0 44,0 a 22,22 0 1,0 -44,0', // Front wheel
        'M 330,195 m -22,0 a 22,22 0 1,0 44,0 a 22,22 0 1,0 -44,0', // Rear wheel
      ],
    },
    suv: {
      // Tall, boxy SUV silhouette - high roof, squared rear
      body: `M 55,195
             L 55,145 C 55,125 70,110 90,105
             L 105,80 C 115,65 140,55 190,55
             L 280,55 C 330,55 350,65 360,85
             L 370,115 C 380,125 385,145 385,165
             L 385,195`,
      windows: `M 115,100 L 130,70 C 140,60 165,57 200,57 L 270,57 C 305,57 325,65 335,80 L 350,100 L 350,125 L 115,125 Z`,
      wheels: [
        'M 100,205 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0', // Front wheel (bigger)
        'M 335,205 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0', // Rear wheel (bigger)
      ],
    },
    hatchback: {
      // Compact 2-box silhouette - sloped rear
      body: `M 65,185
             L 65,160 C 65,145 80,130 95,125
             L 115,100 C 130,80 160,70 210,70
             L 280,70 C 325,70 350,90 365,125
             L 370,160 L 370,185`,
      windows: `M 125,120 L 140,90 C 155,78 180,72 220,72 L 275,72 C 310,72 335,85 345,105 L 355,120 Z`,
      wheels: [
        'M 110,195 m -22,0 a 22,22 0 1,0 44,0 a 22,22 0 1,0 -44,0', // Front wheel
        'M 325,195 m -22,0 a 22,22 0 1,0 44,0 a 22,22 0 1,0 -44,0', // Rear wheel
      ],
    },
    pickup: {
      // Pickup truck with cabin and bed
      body: `M 50,195
             L 50,150 C 50,130 65,115 85,110
             L 100,80 C 115,60 145,50 190,50
             L 220,50 C 245,50 260,70 265,90
             L 265,110 L 360,110 C 380,110 390,130 390,155
             L 390,195`,
      windows: `M 110,105 L 125,70 C 140,55 170,52 200,52 L 215,52 C 235,52 250,65 255,85 L 255,105 Z`,
      wheels: [
        'M 105,205 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0',
        'M 340,205 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0',
      ],
    },
    coupe: {
      // Sporty coupe - low, sleek, 2-door proportions
      body: `M 70,180
             L 70,160 C 70,145 85,130 105,125
             L 130,100 C 150,75 185,65 240,65
             L 290,65 C 340,70 360,95 365,130
             L 370,160 L 370,180`,
      windows: `M 140,120 L 160,85 C 175,72 210,67 250,67 L 285,70 C 320,75 340,90 350,115 L 355,120 Z`,
      wheels: [
        'M 115,190 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0',
        'M 325,190 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0',
      ],
    },
    unknown: {
      // Generic vehicle outline - balanced proportions
      body: `M 60,190
             L 60,160 C 60,140 75,125 95,120
             L 115,95 C 135,70 175,60 230,60
             L 290,60 C 340,65 360,90 370,125
             L 375,160 L 375,190`,
      windows: `M 125,115 L 145,80 C 165,65 200,62 240,62 L 280,65 C 320,70 345,85 355,110 L 360,115 Z`,
      wheels: [
        'M 110,200 m -24,0 a 24,24 0 1,0 48,0 a 24,24 0 1,0 -48,0',
        'M 330,200 m -24,0 a 24,24 0 1,0 48,0 a 24,24 0 1,0 -48,0',
      ],
    },
  };

  /**
   * Get the current silhouette based on detected body type
   */
  getCurrentSilhouette(): { body: string; windows: string; wheels: string[] } {
    const bodyType = this.scanner.currentDetection()?.bodyType || 'unknown';
    return this.GHOST_SILHOUETTES[bodyType] || this.GHOST_SILHOUETTES['unknown'];
  }

  /**
   * Get dynamic SVG path for the ghost stencil based on detected body type
   * (Legacy method for backwards compatibility)
   */
  getGhostPath(): string {
    return this.getCurrentSilhouette().body;
  }

  /** Camera error message */
  readonly cameraError = signal<string | null>(null);
  readonly isClosing = signal(false);
  readonly hasVibrated = signal(false);
  readonly hasAutoConfirmed = signal(false);
  readonly lowLight = signal(false);
  readonly isSecureContextSignal = signal(true);
  readonly permissionState = signal<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  /** Current tip index for rotation */
  readonly currentTipIndex = signal(0);

  private stream: MediaStream | null = null;
  private tipRotationInterval: ReturnType<typeof setInterval> | null = null;
  private lightMonitorInterval: ReturnType<typeof setInterval> | null = null;
  private autoConfirmTimer: ReturnType<typeof setTimeout> | null = null;
  private lightCanvas: HTMLCanvasElement | null = null;
  private originalParent: HTMLElement | null = null;
  private originalNextSibling: ChildNode | null = null;

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
  readonly currentTip = computed(
    () => this.scanningTips[this.currentTipIndex() % this.scanningTips.length],
  );

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

  constructor() {
    // Effect for haptic + sound feedback when stable
    effect(() => {
      const stable = this.scanner.isStableEnough();
      if (stable && !this.hasVibrated()) {
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([15, 50, 15]); // Double tap pattern
        }
        // Sound feedback
        this.playConfirmSound();
        this.hasVibrated.set(true);
      }
      if (!stable && this.hasVibrated()) {
        this.hasVibrated.set(false);
      }
    });

    effect(() => {
      const stable = this.scanner.isStableEnough();
      const hasDetection = !!this.scanner.currentDetection();
      if (stable && hasDetection && !this.hasAutoConfirmed()) {
        this.armAutoConfirm();
      } else {
        this.clearAutoConfirm();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.attachToBody();
    this.isSecureContextSignal.set(typeof window !== 'undefined' ? window.isSecureContext : true);
    await this.checkCameraPermission();
    await this.startCamera();
    this.startTipRotation();
  }

  /**
   * Play a subtle confirmation sound using Web Audio API
   */
  private playConfirmSound(): void {
    try {
      const audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();

      // Create a short pleasant "ding" sound
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Pleasant frequency (G5 note)
      oscillator.frequency.setValueAtTime(784, audioCtx.currentTime);
      oscillator.type = 'sine';

      // Quick fade in/out for smooth sound
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);

      // Cleanup
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioCtx.close();
      };
    } catch {
      // Silently fail if audio not supported
    }
  }

  private async checkCameraPermission(): Promise<void> {
    if (!('permissions' in navigator)) {
      this.permissionState.set('unknown');
      return;
    }

    try {
      const status = await (navigator.permissions as Permissions).query({
        name: 'camera' as PermissionName,
      });
      this.permissionState.set(status.state);
      status.onchange = () => {
        this.permissionState.set(status.state);
      };
    } catch {
      this.permissionState.set('unknown');
    }
  }

  ngOnDestroy(): void {
    this.scanner.stopScanning();
    this.stopCamera();
    this.stopTipRotation();
    this.detachFromBody();
  }

  private globalStyleElement: HTMLStyleElement | null = null;

  private attachToBody(): void {
    // ALWAYS hide Ionic nav and add class FIRST
    this.hideIonicNav();
    this.renderer.addClass(document.body, 'scanner-open');

    // Inject global styles to disable Ionic containment
    this.injectGlobalStyles();

    const hostEl = this.hostRef.nativeElement;
    const parent = hostEl.parentElement;

    // Always move to body for guaranteed fullscreen
    if (parent && parent !== document.body) {
      this.originalParent = parent;
      this.originalNextSibling = hostEl.nextSibling;
      document.body.appendChild(hostEl);
    }

    // Force styles directly on the element
    hostEl.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      height: 100dvh !important;
      z-index: 999999 !important;
      display: block !important;
      contain: none !important;
      transform: none !important;
    `;

    // Also disable containment on all ancestor elements
    this.disableAncestorContainment();
  }

  private injectGlobalStyles(): void {
    if (this.globalStyleElement) return;

    this.globalStyleElement = document.createElement('style');
    this.globalStyleElement.id = 'scanner-fullscreen-styles';
    this.globalStyleElement.textContent = `
      body.scanner-open,
      body.scanner-open ion-app,
      body.scanner-open ion-router-outlet,
      body.scanner-open ion-nav,
      body.scanner-open ion-content,
      body.scanner-open ion-page,
      body.scanner-open ion-tabs,
      body.scanner-open .ion-page,
      body.scanner-open [ion-page] {
        contain: none !important;
        overflow: visible !important;
        transform: none !important;
        --ion-safe-area-top: 0px !important;
        --ion-safe-area-bottom: 0px !important;
      }

      body.scanner-open ion-tab-bar,
      body.scanner-open ion-header,
      body.scanner-open ion-footer,
      body.scanner-open .bottom-navigation {
        display: none !important;
        visibility: hidden !important;
      }

      body.scanner-open app-vehicle-scanner-live {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        z-index: 999999 !important;
        display: block !important;
        contain: none !important;
      }
    `;
    document.head.appendChild(this.globalStyleElement);
  }

  private removeGlobalStyles(): void {
    if (this.globalStyleElement) {
      this.globalStyleElement.remove();
      this.globalStyleElement = null;
    }
  }

  private disableAncestorContainment(): void {
    const hostEl = this.hostRef.nativeElement;
    let parent = hostEl.parentElement;

    while (parent && parent !== document.body) {
      parent.style.setProperty('contain', 'none', 'important');
      parent.style.setProperty('overflow', 'visible', 'important');
      parent.style.setProperty('transform', 'none', 'important');
      parent = parent.parentElement;
    }
  }

  private hideIonicNav(): void {
    const ionTabs = document.querySelector('ion-tabs');
    const ionTabBar = document.querySelector('ion-tab-bar');
    const appHeader = document.querySelector(
      'app-root > ion-app > ion-header, ion-header.app-header',
    );

    if (ionTabs) this.renderer.setStyle(ionTabs, 'display', 'none');
    if (ionTabBar) this.renderer.setStyle(ionTabBar, 'display', 'none');
    if (appHeader) this.renderer.setStyle(appHeader, 'display', 'none');

    // Also hide any visible navbars
    document.querySelectorAll('ion-tab-bar, .bottom-navigation, [role="tablist"]').forEach((el) => {
      this.renderer.setStyle(el, 'display', 'none');
    });
  }

  private showIonicNav(): void {
    const ionTabs = document.querySelector('ion-tabs');
    const ionTabBar = document.querySelector('ion-tab-bar');
    const appHeader = document.querySelector(
      'app-root > ion-app > ion-header, ion-header.app-header',
    );

    if (ionTabs) this.renderer.removeStyle(ionTabs, 'display');
    if (ionTabBar) this.renderer.removeStyle(ionTabBar, 'display');
    if (appHeader) this.renderer.removeStyle(appHeader, 'display');

    document.querySelectorAll('ion-tab-bar, .bottom-navigation, [role="tablist"]').forEach((el) => {
      this.renderer.removeStyle(el, 'display');
    });
  }

  private detachFromBody(): void {
    // Remove global styles FIRST before anything else
    this.removeGlobalStyles();

    // Restore Ionic navigation
    this.showIonicNav();

    // Remove body class
    this.renderer.removeClass(document.body, 'scanner-open');

    // Clear inline styles on host element
    const hostEl = this.hostRef.nativeElement;
    hostEl.style.cssText = '';

    // Don't try to move the element back - let Angular destroy it naturally
    // The element was appended to body, Angular will clean it up when the component is destroyed
    this.originalParent = null;
    this.originalNextSibling = null;
  }

  /**
   * Start rotating tips every 4 seconds
   */
  private startTipRotation(): void {
    this.tipRotationInterval = setInterval(() => {
      this.currentTipIndex.update((i) => i + 1);
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
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.logger.error('getUserMedia not supported', 'VehicleScannerLive');
        this.cameraError.set(
          'Tu navegador no soporta acceso a la cámara. Probá con Chrome o Safari.',
        );
        return;
      }

      this.logger.info('Requesting camera access...', 'VehicleScannerLive');

      // Request camera permission with multiple fallback options
      let stream: MediaStream | null = null;

      // Try environment camera first (back camera on mobile)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        this.logger.info('Got environment camera', 'VehicleScannerLive');
      } catch (envError) {
        this.logger.warn('Environment camera failed, trying any camera...', 'VehicleScannerLive', {
          error: envError,
        });
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        this.logger.info('Got fallback camera', 'VehicleScannerLive');
      }

      this.stream = stream;

      // Wait for video element to be available
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = this.stream;
        await this.videoRef.nativeElement.play();
        this.logger.info('Video playing, starting scanner...', 'VehicleScannerLive');

        // Start scanner
        this.scanner.startScanning(this.videoRef.nativeElement);
        this.startLightMonitor();
      } else {
        this.logger.error('Video element not found', 'VehicleScannerLive');
        this.cameraError.set('Error interno: elemento de video no disponible');
      }
    } catch (error) {
      const isPermissionError =
        error instanceof Error &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');

      if (isPermissionError) {
        this.logger.info('Camera access blocked by user', 'VehicleScannerLive', error);
      } else {
        this.logger.error('Camera access failed', 'VehicleScannerLive', error);
      }

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          this.cameraError.set(
            'Necesitás permitir el acceso a la cámara. Revisá los permisos en la configuración del navegador.',
          );
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          this.cameraError.set('No se encontró ninguna cámara en tu dispositivo');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          this.cameraError.set('La cámara está siendo usada por otra aplicación');
        } else if (error.name === 'OverconstrainedError') {
          this.cameraError.set('La cámara no cumple con los requisitos mínimos');
        } else if (error.name === 'SecurityError') {
          this.cameraError.set('Acceso a la cámara bloqueado. Asegurate de usar HTTPS.');
        } else {
          this.cameraError.set(`Error de cámara: ${error.message}`);
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

    if (this.lightMonitorInterval) {
      clearInterval(this.lightMonitorInterval);
      this.lightMonitorInterval = null;
    }
    this.lowLight.set(false);
  }

  private startLightMonitor(): void {
    if (this.lightMonitorInterval || !this.videoRef?.nativeElement) return;

    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
    }

    const canvas = this.lightCanvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    this.lightMonitorInterval = setInterval(() => {
      const video = this.videoRef?.nativeElement;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

      const w = 32;
      const h = 18;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      const avg = sum / (w * h);
      this.lowLight.set(avg < 70);
    }, 800);
  }

  /**
   * Confirm and emit result
   */
  confirmAndUse(): void {
    const result = this.scanner.getResultForForm();
    if (!result) return;

    this.hasAutoConfirmed.set(true);
    this.vehicleConfirmed.emit(result);
  }

  /**
   * Cancel and close
   */
  cancel(): void {
    this.startClose();
  }

  private armAutoConfirm(): void {
    if (this.autoConfirmTimer) return;

    this.autoConfirmTimer = setTimeout(() => {
      this.autoConfirmTimer = null;
      if (
        this.scanner.isStableEnough() &&
        this.scanner.currentDetection() &&
        !this.hasAutoConfirmed()
      ) {
        this.hasAutoConfirmed.set(true);
        this.confirmAndUse();
      }
    }, 1200);
  }

  private clearAutoConfirm(): void {
    if (this.autoConfirmTimer) {
      clearTimeout(this.autoConfirmTimer);
      this.autoConfirmTimer = null;
    }
  }

  private startClose(): void {
    if (this.isClosing()) return;

    this.isClosing.set(true);
    this.scanner.stopScanning();
    this.stopCamera();
    this.stopTipRotation();

    setTimeout(() => {
      this.cancelled.emit();
    }, 200);
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

  /**
   * Retry camera access
   */
  async retryCamera(): Promise<void> {
    this.logger.info('Retrying camera access...', 'VehicleScannerLive');

    // Check if permission is permanently blocked
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'denied') {
          // Permission is blocked, show instructions to unblock
          this.cameraError.set(
            'La cámara está bloqueada. Para habilitarla:\n' +
              '1. Tocá el ícono de candado 🔒 en la barra de direcciones\n' +
              '2. Buscá "Cámara" y cambiá a "Permitir"\n' +
              '3. Recargá la página',
          );
          return;
        }
      } catch {
        // Permissions API not supported, continue with retry
      }
    }

    this.cameraError.set(null);
    await this.startCamera();
  }
}
