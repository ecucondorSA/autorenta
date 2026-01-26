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
    <div class="fixed inset-0 z-[9999] bg-black full-screen-scan scan-stage fade-in" [class.fade-out]="isClosing()">
      <!-- Header -->
      <header class="scan-header scan-layer flex items-center justify-between gap-3 px-4 py-3 sm:py-4 backdrop-blur-sm safe-area-top">
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
        <div class="flex-1 min-w-0 text-center sm:text-left">
          <h2 class="text-white font-semibold tracking-tight">Escanear vehículo</h2>
          <p class="text-[11px] sm:text-xs text-white/60">Alineá el auto con el marco guía</p>
        </div>
        <div class="scan-status-pill" [class.detected]="scanner.hasDetection()" [class.ready]="scanner.isStableEnough()">
          <span class="scan-status-dot"></span>
          <span>
            {{ scanner.isStableEnough() ? 'Listo' : (scanner.hasDetection() ? 'Enfocando' : 'Buscando') }}
          </span>
        </div>
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
          [class.low-light]="lowLight()"
        ></video>
        <div class="scan-grid"></div>
        <div class="scan-scrim"></div>

        <!-- Vehicle Alignment Guide (Professional SVG HUD) -->
        <div class="absolute inset-4 sm:inset-8 lg:inset-12 pointer-events-none flex items-center justify-center">
          <svg class="w-full h-full max-w-3xl mx-auto" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet">
            <defs>
              <!-- Glow effect for locked state -->
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <!-- Subtle glow for silhouette -->
              <filter id="silhouetteGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <!-- Scan line gradient -->
              <linearGradient id="scanLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(0, 217, 95, 0)" />
                <stop offset="50%" stop-color="rgba(0, 217, 95, 0.9)" />
                <stop offset="100%" stop-color="rgba(0, 217, 95, 0)" />
              </linearGradient>

              <!-- Ground line gradient -->
              <linearGradient id="groundGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="rgba(255,255,255,0)" />
                <stop offset="20%" stop-color="rgba(255,255,255,0.3)" />
                <stop offset="50%" stop-color="rgba(255,255,255,0.5)" />
                <stop offset="80%" stop-color="rgba(255,255,255,0.3)" />
                <stop offset="100%" stop-color="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            <!-- Corner Brackets (Tech frame) -->
            <g class="frame-corners transition-all duration-500"
               [class.corner-detected]="scanner.hasDetection()"
               [class.corner-locked]="scanner.isStableEnough()">
              <!-- Top Left -->
              <path d="M 8 50 L 8 8 L 50 8" stroke-width="2" stroke-linecap="round" fill="none" />
              <circle cx="8" cy="8" r="3" />

              <!-- Top Right -->
              <path d="M 350 8 L 392 8 L 392 50" stroke-width="2" stroke-linecap="round" fill="none" />
              <circle cx="392" cy="8" r="3" />

              <!-- Bottom Left -->
              <path d="M 8 230 L 8 272 L 50 272" stroke-width="2" stroke-linecap="round" fill="none" />
              <circle cx="8" cy="272" r="3" />

              <!-- Bottom Right -->
              <path d="M 350 272 L 392 272 L 392 230" stroke-width="2" stroke-linecap="round" fill="none" />
              <circle cx="392" cy="272" r="3" />
            </g>

            <!-- Ground Reference Line -->
            <line x1="40" y1="220" x2="360" y2="220"
                  stroke="url(#groundGradient)"
                  stroke-width="1"
                  stroke-dasharray="8 4"
                  class="ground-line" />

            <!-- Side Alignment Ticks -->
            <g class="alignment-ticks" opacity="0.4">
              <line x1="5" y1="100" x2="15" y2="100" stroke="white" stroke-width="1" />
              <line x1="5" y1="140" x2="20" y2="140" stroke="white" stroke-width="1" />
              <line x1="5" y1="180" x2="15" y2="180" stroke="white" stroke-width="1" />
              <line x1="385" y1="100" x2="395" y2="100" stroke="white" stroke-width="1" />
              <line x1="380" y1="140" x2="395" y2="140" stroke="white" stroke-width="1" />
              <line x1="385" y1="180" x2="395" y2="180" stroke="white" stroke-width="1" />
            </g>

            <!-- Active Scan Line -->
            <rect x="25" y="0" width="350" height="2" fill="url(#scanLineGradient)" class="scan-laser-line">
              <animate attributeName="y" values="20;260;20" dur="3.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
              <animate attributeName="opacity" values="0;1;1;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.05;0.95;1" />
            </rect>

            <!-- VEHICLE SILHOUETTE (Ghost Guide) -->
            <g class="vehicle-silhouette"
               [class.silhouette-visible]="!scanner.hasDetection()"
               [class.silhouette-detected]="scanner.hasDetection() && !scanner.isStableEnough()"
               [class.silhouette-locked]="scanner.isStableEnough()">

              <!-- Car Body -->
              <path [attr.d]="getCurrentSilhouette().body"
                    class="silhouette-body"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    fill="none" />

              <!-- Windows (slightly offset color) -->
              <path [attr.d]="getCurrentSilhouette().windows"
                    class="silhouette-windows"
                    stroke-width="1.5"
                    fill="none" />

              <!-- Wheels -->
              @for (wheel of getCurrentSilhouette().wheels; track $index) {
                <path [attr.d]="wheel"
                      class="silhouette-wheel"
                      stroke-width="2"
                      fill="none" />
                <!-- Wheel hub -->
                <circle [attr.cx]="$index === 0 ? 105 : 330"
                        [attr.cy]="195"
                        r="8"
                        class="silhouette-hub"
                        stroke-width="1.5"
                        fill="none" />
              }

              <!-- Center alignment crosshair (only when not locked) -->
              @if (!scanner.isStableEnough()) {
                <g class="crosshair" opacity="0.5">
                  <line x1="200" y1="125" x2="200" y2="145" stroke="white" stroke-width="1" stroke-dasharray="2 2" />
                  <line x1="180" y1="135" x2="220" y2="135" stroke="white" stroke-width="1" stroke-dasharray="2 2" />
                </g>
              }
            </g>

            <!-- Lock-on Indicator (appears when stable) -->
            @if (scanner.isStableEnough()) {
              <g class="lock-on-indicator" filter="url(#neonGlow)">
                <!-- Pulsing center lock -->
                <circle cx="200" cy="140" r="12" stroke="#00d95f" stroke-width="2" fill="none" class="lock-ring-outer">
                  <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="200" cy="140" r="4" fill="#00d95f" class="lock-dot" />

                <!-- Lock brackets -->
                <path d="M 175 140 L 185 140" stroke="#00d95f" stroke-width="2" stroke-linecap="round" />
                <path d="M 215 140 L 225 140" stroke="#00d95f" stroke-width="2" stroke-linecap="round" />
                <path d="M 200 115 L 200 125" stroke="#00d95f" stroke-width="2" stroke-linecap="round" />
                <path d="M 200 155 L 200 165" stroke="#00d95f" stroke-width="2" stroke-linecap="round" />
              </g>
            }

            <!-- "Align Vehicle" text hint (when searching) -->
            @if (!scanner.hasDetection()) {
              <text x="200" y="250"
                    text-anchor="middle"
                    class="hint-text"
                    fill="rgba(255,255,255,0.6)"
                    font-size="11"
                    font-family="system-ui, sans-serif"
                    letter-spacing="0.05em">
                ALINEÁ EL VEHÍCULO CON LA SILUETA
              </text>
            }
          </svg>
        </div>

        <!-- Frame Counter Badge -->
        <div class="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full hidden sm:flex z-20">
          <span class="text-neutral-400 text-xs font-mono">{{ scanner.frameCount() }} frames</span>
        </div>

        <!-- Live alerts -->
        <div class="scan-alerts scan-layer">
          <div class="scan-alerts-inner">
            @if (lowLight()) {
              <div class="scan-alert scan-alert--warning">
                <span class="scan-alert-icon">☀️</span>
                <span>Iluminación baja. Buscá una zona más clara.</span>
              </div>
            }
            @if (scanner.hasDetection() && !scanner.isStableEnough()) {
              <div class="scan-alert scan-alert--info">
                <span class="scan-alert-icon">🖐️</span>
                <span>Estabilizá la cámara para confirmar.</span>
              </div>
            }
          </div>
        </div>

        <!-- Detection Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-4 safe-area-bottom scan-layer scan-overlay">
          @if (!isSecureContextSignal()) {
            <div class="scan-warning mb-3">
              <span>Para usar la cámara necesitás HTTPS. Abrí esta página con un enlace seguro.</span>
            </div>
          } @else if (permissionState() === 'denied') {
            <div class="scan-warning mb-3">
              <span>Permiso de cámara bloqueado. Revisá los permisos del navegador.</span>
            </div>
          }
          @if (scanner.currentDetection(); as detection) {
            <!-- Vehicle Card -->
            <div class="scan-card scan-card--detected mx-auto w-full max-w-md sm:max-w-lg rounded-2xl p-4 sm:p-5 border shadow-2xl animate-fadeIn">
              <!-- Header: Brand/Model + Confidence -->
              <div class="flex items-start justify-between gap-4 mb-3">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg sm:text-xl font-bold text-white truncate">
                    {{ detection.brand }} {{ detection.model }}
                  </h3>
                  <p class="text-neutral-300 text-xs sm:text-sm mt-0.5">
                    {{ scanner.yearLabel() }} · {{ detection.color | titlecase }} · {{ getBodyTypeLabel(detection.bodyType) }}
                  </p>
                </div>
                <div class="flex flex-col items-end shrink-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-sm font-bold"
                      [class]="getConfidenceColorClass(detection.confidence)"
                    >
                      {{ detection.confidence }}%
                    </span>
                    <span class="text-neutral-500 text-[10px] uppercase tracking-wide">confianza</span>
                  </div>
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
                      <span class="text-neon/80 text-xs font-medium uppercase tracking-wide">Valor de Mercado</span>
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
                  <span class="text-neutral-400 text-sm">Analizando mercado...</span>
                </div>
              } @else if (scanner.detectionStability() >= 50) {
                <div class="bg-neutral-900/50 rounded-xl p-3 mb-3 flex items-center justify-center">
                  <span class="text-neutral-500 text-sm">Precio no disponible en AutoRenta</span>
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
                    ✓ Listo para confirmar
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
            <div class="scan-card mx-auto w-full max-w-md sm:max-w-lg rounded-2xl p-4 sm:p-5 border shadow-2xl">
              <!-- Header -->
              <div class="flex items-center gap-3 mb-3">
                <div class="relative w-6 h-6">
                  <div class="absolute inset-0 border-2 border-neon/30 rounded-full"></div>
                  <div class="absolute inset-0 border-2 border-transparent border-t-neon rounded-full animate-spin"></div>
                </div>
                <span class="text-white font-semibold">Escaneando vehículo</span>
              </div>
              <p class="text-neutral-300 text-sm">
                Mantené el auto centrado y bien iluminado.
              </p>

              <div class="mt-4 flex items-center justify-between border-t border-neutral-800/50 pt-3 gap-3">
                <div class="flex items-center gap-2 text-neutral-400 text-xs leading-snug flex-1 min-w-0">
                  <span class="text-base">{{ currentTip().icon }}</span>
                  <span>{{ currentTip().text }}</span>
                </div>
                <span
                  class="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
                  [class]="scanner.hasDetection() ? 'bg-neon/15 text-neon' : 'bg-white/10 text-neutral-300'"
                >
                  {{ scanner.hasDetection() ? 'Estable' : 'Ajustar' }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Pro Mode HUD (always on) -->
        <div class="scan-hud scan-layer">
          <div class="scan-hud-inner">
            <div class="scan-hud-status" [class.ready]="scanner.isStableEnough()">
              {{ scanner.isStableEnough() ? 'Listo' : 'Escaneando' }}
            </div>
          </div>
        </div>

        <!-- Camera Error - Full overlay that hides everything else -->
        @if (cameraError()) {
          <div class="absolute inset-0 z-50 bg-gradient-to-b from-neutral-900 to-black flex flex-col items-center justify-center p-6">
            <!-- Animated camera icon -->
            <div class="relative w-24 h-24 mb-6">
              <div class="absolute inset-0 rounded-full bg-rose-500/10 animate-ping"></div>
              <div class="relative w-24 h-24 rounded-full bg-rose-500/20 flex items-center justify-center">
                <svg class="w-12 h-12 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l16 16" class="text-rose-500" />
                </svg>
              </div>
            </div>

            <h3 class="text-2xl font-bold text-white mb-3 text-center">Cámara no disponible</h3>
            <p class="text-neutral-300 text-center mb-2 max-w-sm leading-relaxed whitespace-pre-line">
              {{ cameraError() }}
            </p>

            <!-- Help tips -->
            <div class="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 max-w-sm w-full">
              <p class="text-amber-400 text-sm font-medium mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                Posibles soluciones
              </p>
              <ul class="text-neutral-400 text-sm space-y-2">
                <li class="flex items-start gap-2">
                  <span class="text-neon mt-0.5">•</span>
                  <span>Permitir cámara cuando el navegador pregunte</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-neon mt-0.5">•</span>
                  <span>Verificar permisos en Configuración del navegador</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-neon mt-0.5">•</span>
                  <span>Cerrar otras apps que usen la cámara</span>
                </li>
              </ul>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <button
                type="button"
                (click)="retryCamera()"
                class="flex-1 py-4 bg-neon hover:bg-neon/90 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentar
              </button>
            </div>
          </div>
        }
      </main>

      <!-- Footer Actions - Hidden when camera error -->
      @if (!cameraError()) {
      <footer class="scan-footer scan-layer p-4 border-t safe-area-bottom">
        @if (scanner.isStableEnough() && scanner.currentDetection()) {
          <button
            type="button"
            (click)="confirmAndUse()"
            class="confirm-btn w-full py-3.5 sm:py-4 bg-neon hover:bg-neon/90 active:bg-neon/80 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Usar estos datos
          </button>
        } @else if (!scanner.hasDetection()) {
          <p class="text-center text-neutral-500 text-xs sm:text-sm py-2">
            Apuntá la cámara hacia un vehículo
          </p>
        } @else {
          <p class="text-center text-neutral-400 text-xs sm:text-sm py-2">
            Mantené estable unos segundos más...
          </p>
        }
      </footer>
      }
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

    /* Force fullscreen + shared tokens */
    :host {
      --scan-accent: #00d95f;
      --scan-accent-soft: rgba(0, 217, 95, 0.2);
      --scan-glass: rgba(2, 6, 23, 0.72);
      --scan-footer-space: 96px;
      --scan-footer-space-mobile: 128px;
      position: fixed !important;
      inset: 0 !important;
      z-index: 999999 !important;
      display: block !important;
      isolation: isolate;
    }

    .full-screen-scan {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      z-index: 999999 !important;
      overscroll-behavior: contain;
      background: #000000;
      isolation: isolate;
    }

    /* Global override: Hide Ionic bottom tabs when scanner is open */
    :host-context(body.scanner-open) ~ ion-tab-bar,
    :host-context(body.scanner-open) ~ ion-tabs ion-tab-bar {
      display: none !important;
    }

    .scan-stage {
      position: relative;
      opacity: 1;
      transform: scale(1);
      transition: opacity 200ms ease, transform 200ms ease;
    }

    .scan-stage.fade-in {
      animation: scanFadeIn 220ms ease-out;
    }

    .scan-stage.fade-out {
      opacity: 0;
      transform: scale(0.985);
    }

    .scan-layer {
      position: absolute;
      left: 0;
      right: 0;
      z-index: 4;
    }

    .scan-header {
      top: 0;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.35));
      border-bottom: 1px solid rgba(0, 217, 95, 0.15);
    }

    .scan-footer {
      bottom: 0;
    }

    .scan-video-layer {
      z-index: 1;
    }

    .scan-hud {
      top: calc(env(safe-area-inset-top, 0px) + 70px);
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 3;
    }

    /* --- HI-TECH GRID --- */
    .scan-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(0, 217, 95, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 217, 95, 0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      opacity: 0.4;
      pointer-events: none;
      z-index: 1;
      mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
      -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
    }

    .scan-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(2, 6, 23, 0) 40%, rgba(2, 6, 23, 0.8) 100%);
      pointer-events: none;
      z-index: 2;
    }

    /* --- HUD STATUS PILL --- */
    .scan-status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 4px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(0, 217, 95, 0.3);
      color: #00d95f;
      font-family: 'JetBrains Mono', monospace; /* Tech font if available */
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      box-shadow: 0 0 15px rgba(0, 217, 95, 0.1);
      backdrop-filter: blur(4px);
    }

    .scan-status-pill.detected {
      background: rgba(0, 217, 95, 0.1);
      border-color: rgba(0, 217, 95, 0.6);
      box-shadow: 0 0 20px rgba(0, 217, 95, 0.2);
    }

    .scan-status-pill.ready {
      background: #00d95f;
      color: #000;
      border-color: #00d95f;
      box-shadow: 0 0 25px rgba(0, 217, 95, 0.6);
    }

    .scan-status-dot {
      width: 6px;
      height: 6px;
      background: #00d95f;
      box-shadow: 0 0 8px #00d95f;
      animation: blink 1s infinite;
    }

    .scan-status-pill.ready .scan-status-dot {
      background: #000;
      box-shadow: none;
      animation: none;
    }

    /* --- AR FRAME --- */
    .scan-frame {
      position: absolute;
      inset: 20px;
      border: 1px solid rgba(0, 217, 95, 0.15);
      box-shadow: 0 0 30px rgba(0, 217, 95, 0.05);
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .scan-frame.detected {
      inset: 15px; /* Slight expansion breath */
      border-color: rgba(0, 217, 95, 0.5);
      box-shadow: 0 0 40px rgba(0, 217, 95, 0.15);
    }

    .scan-frame.ready {
      border-color: #00d95f;
      box-shadow: 0 0 50px rgba(0, 217, 95, 0.4);
      animation: lockOn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* Tech Corners */
    .scan-frame-corner {
      position: absolute;
      width: 40px;
      height: 40px;
      border: 2px solid #00d95f;
      opacity: 0.7;
      transition: all 0.3s ease;
    }

    .scan-frame.ready .scan-frame-corner {
      width: 60px;
      height: 60px;
      border-width: 4px;
      opacity: 1;
      box-shadow: 0 0 15px #00d95f;
    }

    .scan-frame-corner.tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
    .scan-frame-corner.tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
    .scan-frame-corner.bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
    .scan-frame-corner.br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

    /* Laser Scan Line */
    .scan-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #00d95f;
      box-shadow: 0 0 20px #00d95f, 0 0 10px #00d95f;
      opacity: 0;
      animation: laserScan 2.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
    }
    
    .scan-line::after {
      content: '';
      position: absolute;
      left: 0; right: 0; top: 0; height: 60px;
      background: linear-gradient(to top, rgba(0, 217, 95, 0.3), transparent);
    }

    /* --- CENTER RETICLE --- */
    .scan-target {
      width: 80px;
      height: 80px;
      border: 1px solid rgba(0, 217, 95, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .scan-target::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      border: 2px dashed rgba(0, 217, 95, 0.3);
      animation: spinSlow 8s linear infinite;
    }

    .scan-target::after {
      content: '';
      position: absolute;
      inset: -15px;
      border-radius: 50%;
      border: 1px solid transparent;
      border-top-color: rgba(0, 217, 95, 0.5);
      border-bottom-color: rgba(0, 217, 95, 0.5);
      animation: spinFast 3s linear infinite;
    }

    .scan-target.detected {
      border-color: #00d95f;
      background: rgba(0, 217, 95, 0.1);
    }

    .scan-target.ready {
      background: rgba(0, 217, 95, 0.2);
      box-shadow: 0 0 30px rgba(0, 217, 95, 0.4);
      transform: scale(0.9);
      transition: transform 0.2s;
    }

    .scan-dot {
      width: 4px;
      height: 4px;
      background: #00d95f;
      box-shadow: 0 0 10px #00d95f;
    }

    /* --- ANIMATIONS --- */
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    @keyframes laserScan {
      0% { top: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }

    @keyframes spinSlow { 100% { transform: rotate(360deg); } }
    @keyframes spinFast { 100% { transform: rotate(-360deg); } }
    
    @keyframes lockOn {
      0% { transform: scale(1); }
      50% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }

    video.low-light {
      filter: brightness(1.3) contrast(1.2) saturate(0.8) grayscale(0.2); /* Night vision look */
    }

    /* --- CARDS & UI --- */
    .scan-card {
      background: rgba(10, 10, 10, 0.85); /* Darker, sleek */
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }

    .scan-card--detected {
      border-color: #00d95f;
      background: rgba(0, 20, 10, 0.9); /* Slight green tint */
      box-shadow: 0 0 40px rgba(0, 217, 95, 0.15);
    }

    .scan-overlay {
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--scan-footer-space));
    }

    .scan-footer {
      background: rgba(0, 0, 0, 0.72);
      border-color: rgba(0, 217, 95, 0.2);
      backdrop-filter: blur(12px);
    }

    .scan-alerts {
      position: absolute;
      top: calc(env(safe-area-inset-top, 0px) + 96px);
      left: 0;
      right: 0;
      padding: 0 16px;
      z-index: 4;
      pointer-events: none;
    }

    .scan-alerts-inner {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 460px;
      margin: 0 auto;
    }

    .scan-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.4;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: rgba(226, 232, 240, 0.9);
      backdrop-filter: blur(8px);
    }

    .scan-alert--warning {
      border-color: rgba(251, 191, 36, 0.5);
      background: rgba(120, 53, 15, 0.35);
      color: #fde68a;
    }

    .scan-alert--info {
      border-color: rgba(0, 217, 95, 0.35);
      color: rgba(187, 247, 208, 0.95);
    }

    .scan-alert-icon {
      font-size: 16px;
      line-height: 1;
    }

    /* --- HUD TEXT --- */
    .scan-hud-inner {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(0, 217, 95, 0.2);
      border-radius: 4px;
      padding: 8px 14px;
      font-family: 'JetBrains Mono', monospace;
    }

    .scan-hud-title {
      display: none;
    }
    
    .scan-hud-status {
      color: rgba(255, 255, 255, 0.9);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .scan-hud-status.ready {
      color: #00d95f;
    }

    /* --- DECORATIVE DATA STREAM --- */
    .scan-data-stream {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-family: monospace;
      font-size: 10px;
      color: rgba(0, 217, 95, 0.4);
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: none;
    }

    /* Adjustments for existing classes */
    .scan-warning { background: rgba(200, 50, 50, 0.2); border: 1px solid #f87171; color: #fecaca; }
    .confirm-btn { 
      background: #00d95f; 
      color: black; 
      text-transform: uppercase; 
      font-weight: 800; 
      letter-spacing: 0.05em;
      border: none;
    }
    .confirm-btn:hover { background: #00ff6e; box-shadow: 0 0 20px rgba(0, 217, 95, 0.5); }
    
    /* Neon Text Utilities */
    .text-neon { color: #00d95f; text-shadow: 0 0 10px rgba(0, 217, 95, 0.4); }
    
    @media (max-width: 640px) {
      :host {
        --scan-footer-space: var(--scan-footer-space-mobile);
      }

      .scan-overlay {
        padding-left: 14px;
        padding-right: 14px;
      }

      .scan-footer {
        padding: 12px 16px;
      }

      .scan-alerts {
        top: calc(env(safe-area-inset-top, 0px) + 88px);
      }

      .scan-hud-inner {
        padding: 6px 12px;
      }
    }

    /* Hide some elements on very small screens */
    @media (max-height: 600px) {
      .scan-header p { display: none; }
      .scan-data-stream { display: none; }
    }

    /* --- FRAME CORNERS --- */
    .frame-corners {
      stroke: rgba(255, 255, 255, 0.35);
      fill: rgba(255, 255, 255, 0.15);
    }

    .frame-corners.corner-detected {
      stroke: rgba(0, 217, 95, 0.6);
      fill: rgba(0, 217, 95, 0.3);
    }

    .frame-corners.corner-locked {
      stroke: #00d95f;
      fill: #00d95f;
      filter: drop-shadow(0 0 8px rgba(0, 217, 95, 0.6));
      animation: cornerPulse 2s ease-in-out infinite;
    }

    @keyframes cornerPulse {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(0, 217, 95, 0.6)); }
      50% { filter: drop-shadow(0 0 15px rgba(0, 217, 95, 0.9)); }
    }

    /* --- VEHICLE SILHOUETTE --- */
    .vehicle-silhouette {
      transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
    }

    /* Default state: visible, breathing animation */
    .vehicle-silhouette.silhouette-visible {
      opacity: 1;
    }

    .vehicle-silhouette.silhouette-visible .silhouette-body {
      stroke: rgba(255, 255, 255, 0.5);
      animation: silhouetteBreathing 3s ease-in-out infinite;
    }

    .vehicle-silhouette.silhouette-visible .silhouette-windows {
      stroke: rgba(255, 255, 255, 0.3);
      animation: silhouetteBreathing 3s ease-in-out infinite 0.2s;
    }

    .vehicle-silhouette.silhouette-visible .silhouette-wheel,
    .vehicle-silhouette.silhouette-visible .silhouette-hub {
      stroke: rgba(255, 255, 255, 0.4);
      animation: wheelSpin 4s linear infinite;
    }

    /* Detected state: turning green, pulsing */
    .vehicle-silhouette.silhouette-detected {
      opacity: 1;
    }

    .vehicle-silhouette.silhouette-detected .silhouette-body {
      stroke: rgba(0, 217, 95, 0.7);
      stroke-dasharray: 8 4;
      animation: dashFlow 1.5s linear infinite;
    }

    .vehicle-silhouette.silhouette-detected .silhouette-windows {
      stroke: rgba(0, 217, 95, 0.4);
      stroke-dasharray: 4 4;
      animation: dashFlow 1.5s linear infinite reverse;
    }

    .vehicle-silhouette.silhouette-detected .silhouette-wheel,
    .vehicle-silhouette.silhouette-detected .silhouette-hub {
      stroke: rgba(0, 217, 95, 0.6);
    }

    /* Locked state: solid green, glowing */
    .vehicle-silhouette.silhouette-locked {
      opacity: 1;
      filter: drop-shadow(0 0 10px rgba(0, 217, 95, 0.5));
    }

    .vehicle-silhouette.silhouette-locked .silhouette-body {
      stroke: #00d95f;
      stroke-dasharray: none;
      animation: lockedPulse 1.5s ease-in-out infinite;
    }

    .vehicle-silhouette.silhouette-locked .silhouette-windows {
      stroke: rgba(0, 217, 95, 0.6);
      fill: rgba(0, 217, 95, 0.1);
      stroke-dasharray: none;
      animation: none;
    }

    .vehicle-silhouette.silhouette-locked .silhouette-wheel,
    .vehicle-silhouette.silhouette-locked .silhouette-hub {
      stroke: #00d95f;
      animation: none;
    }

    /* --- SILHOUETTE ANIMATIONS --- */
    @keyframes silhouetteBreathing {
      0%, 100% {
        opacity: 0.5;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.005);
      }
    }

    @keyframes wheelSpin {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: 100; }
    }

    @keyframes dashFlow {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: 24; }
    }

    @keyframes lockedPulse {
      0%, 100% {
        stroke-width: 2;
        opacity: 1;
      }
      50% {
        stroke-width: 2.5;
        opacity: 0.85;
      }
    }

    /* --- SCAN LASER LINE --- */
    .scan-laser-line {
      filter: drop-shadow(0 0 6px rgba(0, 217, 95, 0.8));
    }

    /* --- GROUND LINE --- */
    .ground-line {
      animation: groundPulse 2s ease-in-out infinite;
    }

    @keyframes groundPulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }

    /* --- LOCK-ON INDICATOR --- */
    .lock-on-indicator {
      animation: lockOnAppear 0.3s ease-out;
    }

    @keyframes lockOnAppear {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* --- HINT TEXT --- */
    .hint-text {
      text-transform: uppercase;
      animation: hintFade 2s ease-in-out infinite;
    }

    @keyframes hintFade {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.9; }
    }

    /* --- LEGACY UTILITIES (kept for backwards compat) --- */
    .stroke-neon { stroke: #00d95f; filter: drop-shadow(0 0 4px rgba(0,217,95,0.5)); }
    .stroke-white-alpha { stroke: rgba(255, 255, 255, 0.4); }
    .border-neon { border-color: #00d95f !important; box-shadow: 0 0 15px rgba(0,217,95,0.3); }

    .animate-spin-slow { animation: spin 8s linear infinite; }
    .animate-spin-fast { animation: spin 1s linear infinite; }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .scale-90 { transform: scale(0.9); }
    .scale-150 { transform: scale(1.5); }
  `],
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
  private readonly GHOST_SILHOUETTES: Record<string, { body: string; windows: string; wheels: string[] }> = {
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
        'M 330,195 m -22,0 a 22,22 0 1,0 44,0 a 22,22 0 1,0 -44,0'  // Rear wheel
      ]
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
        'M 335,205 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0'  // Rear wheel (bigger)
      ]
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
        'M 325,195 m -22,0 a 22,22 0 1,0 44,0 a 22,22 0 1,0 -44,0'  // Rear wheel
      ]
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
        'M 340,205 m -26,0 a 26,26 0 1,0 52,0 a 26,26 0 1,0 -52,0'
      ]
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
        'M 325,190 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0'
      ]
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
        'M 330,200 m -24,0 a 24,24 0 1,0 48,0 a 24,24 0 1,0 -48,0'
      ]
    }
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
    this.attachToBody();
    this.isSecureContextSignal.set(typeof window !== 'undefined' ? window.isSecureContext : true);
    await this.checkCameraPermission();
    await this.startCamera();
    this.startTipRotation();

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

  /**
   * Play a subtle confirmation sound using Web Audio API
   */
  private playConfirmSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

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

  private attachToBody(): void {
    // ALWAYS hide Ionic nav and add class FIRST, regardless of element position
    this.hideIonicNav();
    this.renderer.addClass(document.body, 'scanner-open');

    const hostEl = this.hostRef.nativeElement;
    const parent = hostEl.parentElement;

    // Only move element if not already in body
    if (parent && parent !== document.body) {
      this.originalParent = parent;
      this.originalNextSibling = hostEl.nextSibling;
      this.renderer.appendChild(document.body, hostEl);
    }
  }

  private hideIonicNav(): void {
    const ionTabs = document.querySelector('ion-tabs');
    const ionTabBar = document.querySelector('ion-tab-bar');
    const appHeader = document.querySelector('app-root > ion-app > ion-header, ion-header.app-header');

    if (ionTabs) this.renderer.setStyle(ionTabs, 'display', 'none');
    if (ionTabBar) this.renderer.setStyle(ionTabBar, 'display', 'none');
    if (appHeader) this.renderer.setStyle(appHeader, 'display', 'none');

    // Also hide any visible navbars
    document.querySelectorAll('ion-tab-bar, .bottom-navigation, [role="tablist"]').forEach(el => {
      this.renderer.setStyle(el, 'display', 'none');
    });
  }

  private showIonicNav(): void {
    const ionTabs = document.querySelector('ion-tabs');
    const ionTabBar = document.querySelector('ion-tab-bar');
    const appHeader = document.querySelector('app-root > ion-app > ion-header, ion-header.app-header');

    if (ionTabs) this.renderer.removeStyle(ionTabs, 'display');
    if (ionTabBar) this.renderer.removeStyle(ionTabBar, 'display');
    if (appHeader) this.renderer.removeStyle(appHeader, 'display');

    document.querySelectorAll('ion-tab-bar, .bottom-navigation, [role="tablist"]').forEach(el => {
      this.renderer.removeStyle(el, 'display');
    });
  }

  private detachFromBody(): void {
    const hostEl = this.hostRef.nativeElement;

    // Restore Ionic navigation first
    this.showIonicNav();

    if (!this.originalParent) return;

    if (this.originalNextSibling) {
      this.renderer.insertBefore(this.originalParent, hostEl, this.originalNextSibling);
    } else {
      this.renderer.appendChild(this.originalParent, hostEl);
    }

    this.originalParent = null;
    this.originalNextSibling = null;
    this.renderer.removeClass(document.body, 'scanner-open');
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
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.logger.error('getUserMedia not supported', 'VehicleScannerLive');
        this.cameraError.set('Tu navegador no soporta acceso a la cámara. Probá con Chrome o Safari.');
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
        this.logger.warn('Environment camera failed, trying any camera...', 'VehicleScannerLive', { error: envError });
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
          this.cameraError.set('Necesitás permitir el acceso a la cámara. Revisá los permisos en la configuración del navegador.');
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
      if (this.scanner.isStableEnough() && this.scanner.currentDetection() && !this.hasAutoConfirmed()) {
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
            '3. Recargá la página'
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
