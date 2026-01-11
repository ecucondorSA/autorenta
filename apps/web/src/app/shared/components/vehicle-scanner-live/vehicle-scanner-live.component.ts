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
          [class.low-light]="lowLight()"
        ></video>
        <div class="scan-scrim"></div>

        <!-- Guide Frame Corners -->
        <div class="absolute inset-8 pointer-events-none">
          <div
            class="absolute top-0 left-0 w-16 h-16 border-t-3 border-l-3 rounded-tl-xl transition-colors duration-300"
            [class]="scanner.isStableEnough() ? 'border-neon' : (scanner.hasDetection() ? 'border-neon/60' : 'border-neutral-500/50')"
            [class.scan-corner-ready]="scanner.isStableEnough()"
          ></div>
          <div
            class="absolute top-0 right-0 w-16 h-16 border-t-3 border-r-3 rounded-tr-xl transition-colors duration-300"
            [class]="scanner.isStableEnough() ? 'border-neon' : (scanner.hasDetection() ? 'border-neon/60' : 'border-neutral-500/50')"
            [class.scan-corner-ready]="scanner.isStableEnough()"
          ></div>
          <div
            class="absolute bottom-0 left-0 w-16 h-16 border-b-3 border-l-3 rounded-bl-xl transition-colors duration-300"
            [class]="scanner.isStableEnough() ? 'border-neon' : (scanner.hasDetection() ? 'border-neon/60' : 'border-neutral-500/50')"
            [class.scan-corner-ready]="scanner.isStableEnough()"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-16 h-16 border-b-3 border-r-3 rounded-br-xl transition-colors duration-300"
            [class]="scanner.isStableEnough() ? 'border-neon' : (scanner.hasDetection() ? 'border-neon/60' : 'border-neutral-500/50')"
            [class.scan-corner-ready]="scanner.isStableEnough()"
          ></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="scan-target" [class.ready]="scanner.isStableEnough()">
              <span class="scan-dot" [class.ready]="scanner.isStableEnough()"></span>
            </div>
          </div>
        </div>

        <!-- Frame Counter Badge -->
        <div class="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full hidden sm:flex">
          <span class="text-neutral-400 text-xs font-mono">{{ scanner.frameCount() }} frames</span>
        </div>

        <!-- Detection Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-4 safe-area-bottom scan-layer">
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

              <div class="mt-4 flex items-center justify-between border-t border-neutral-800/50 pt-3">
                <span class="text-neutral-400 text-xs">{{ currentTip().text }}</span>
                <span
                  class="text-xs font-semibold px-2 py-1 rounded-full"
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
            <div class="scan-hud-title">Escanear</div>
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
            class="confirm-btn w-full py-4 bg-neon hover:bg-neon/90 active:bg-neon/80 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Usar estos datos
          </button>
        } @else if (!scanner.hasDetection()) {
          <p class="text-center text-neutral-500 text-sm py-2">
            Apuntá la cámara hacia un vehículo
          </p>
        } @else {
          <p class="text-center text-neutral-400 text-sm py-2">
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

    /* Force fullscreen - override any parent styles including Ionic */
    :host {
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

    .scan-scrim {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(2, 6, 23, 0.15) 0%, rgba(2, 6, 23, 0.45) 55%, rgba(2, 6, 23, 0.7) 100%);
      pointer-events: none;
      z-index: 1;
    }

    .scan-scrim::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(2, 6, 23, 0.55) 0%, rgba(2, 6, 23, 0) 35%, rgba(2, 6, 23, 0.55) 100%);
    }

    .scan-target {
      width: clamp(72px, 10vw, 96px);
      height: clamp(72px, 10vw, 96px);
      border-radius: 9999px;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 1px rgba(0, 217, 95, 0.12);
    }

    .scan-target.ready {
      border-color: rgba(0, 217, 95, 0.7);
      box-shadow: 0 0 0 6px rgba(0, 217, 95, 0.12);
      animation: pulseReady 1.8s ease-in-out infinite;
    }

    .scan-target.ready::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 9999px;
      border: 1px solid rgba(0, 217, 95, 0.6);
      animation: lockRing 1.6s ease-out infinite;
    }

    .scan-dot {
      width: clamp(8px, 1.2vw, 12px);
      height: clamp(8px, 1.2vw, 12px);
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.6);
    }

    .scan-dot.ready {
      background: #00d95f;
      box-shadow: 0 0 10px rgba(0, 217, 95, 0.6);
    }

    video.low-light {
      filter: brightness(1.15) contrast(1.1) saturate(1.05);
    }

    .scan-corner-ready {
      box-shadow: 0 0 14px rgba(0, 217, 95, 0.45);
    }

    .scan-card {
      background: rgba(2, 6, 23, 0.88);
      border-color: rgba(148, 163, 184, 0.16);
      backdrop-filter: blur(18px);
    }

    .scan-card--detected {
      background: rgba(2, 6, 23, 0.94);
      box-shadow: 0 18px 40px -24px rgba(0, 0, 0, 0.8);
    }

    .scan-warning {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fecaca;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.4;
      text-align: center;
    }

    .scan-hud {
      top: 0;
      pointer-events: none;
      display: flex;
      justify-content: center;
    }

    .scan-hud-inner {
      margin-top: calc(env(safe-area-inset-top, 0px) + 10px);
      padding: 6px 12px;
      border-radius: 9999px;
      background: rgba(2, 6, 23, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: white;
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      letter-spacing: 0.02em;
    }

    .scan-hud-title {
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
    }

    .scan-hud-status {
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
    }

    .scan-hud-status.ready {
      color: #00d95f;
    }

    @media (max-width: 640px) {
      .scan-hud-inner {
        font-size: 11px;
        padding: 4px 10px;
      }
    }

    @keyframes pulseReady {
      0% { box-shadow: 0 0 0 6px rgba(0, 217, 95, 0.12); }
      50% { box-shadow: 0 0 0 10px rgba(0, 217, 95, 0.2); }
      100% { box-shadow: 0 0 0 6px rgba(0, 217, 95, 0.12); }
    }

    @keyframes lockRing {
      0% { transform: scale(0.9); opacity: 0; }
      40% { opacity: 0.8; }
      100% { transform: scale(1.25); opacity: 0; }
    }

    @keyframes scanFadeIn {
      from {
        opacity: 0;
        transform: scale(0.985);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
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

    /* Confirm button animation */
    .confirm-btn {
      animation: confirmBtnEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 20px rgba(0, 217, 95, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3);
    }

    .confirm-btn:hover {
      box-shadow: 0 0 30px rgba(0, 217, 95, 0.5), 0 6px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(-1px);
    }

    .confirm-btn:active {
      transform: translateY(0) scale(0.98);
    }

    @keyframes confirmBtnEnter {
      0% {
        opacity: 0;
        transform: scale(0.9) translateY(10px);
      }
      60% {
        transform: scale(1.02) translateY(-2px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
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
      this.logger.error('Camera access failed', 'VehicleScannerLive', error);

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
