import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { BeaconMessageType, BeaconService } from '@core/services/beacon';
import { LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

type LocationStatus = 'pending' | 'ready' | 'unavailable';

@Component({
  selector: 'app-panic-mode-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="panic-shell" [class.panic-shell--blackout]="isBlackout()">
      <div class="panic-dimmer"></div>

      <!-- BOTÓN DE SALIDA RÁPIDA (Solo visible si no hay blackout o al tocar) -->
      <button 
        type="button" 
        class="panic-exit-hitbox" 
        (click)="handleScreenTouch()"
        *ngIf="isBroadcasting()"
      ></button>

      <div class="panic-content" [class.panic-content--hidden]="isBlackout()">
        <div class="panic-header">
          <span class="panic-dot" [class.panic-dot--active]="isBroadcasting()"></span>
          <span class="panic-title">SOS GLOBAL</span>
        </div>

        <!-- CUENTA REGRESIVA -->
        @if (countdown() > 0 && !errorMessage()) {
          <div class="panic-countdown">
            <span class="panic-number">{{ countdown() }}</span>
            <p class="panic-countdown-label">Iniciando señal de auxilio...</p>
          </div>
        } @else {
          <div class="panic-status" aria-live="polite">{{ statusMessage() }}</div>
        }

        <p class="panic-instruction">
          MANTÉN ESTA PANTALLA ABIERTA. No bloquees el teléfono para asegurar la máxima potencia
          de emisión.
        </p>

        <div class="panic-metrics" *ngIf="countdown() === 0">
          <div class="panic-metric">
            <span>Señal</span>
            <strong>{{ isBroadcasting() ? 'ACTIVA' : 'EN ESPERA' }}</strong>
          </div>
          <div class="panic-metric">
            <span>Ubicación</span>
            <strong>{{ locationLabel() }}</strong>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="panic-error" role="alert">{{ errorMessage() }}</div>
        }

        <div class="panic-actions">
          @if (countdown() > 0) {
            <button type="button" class="panic-stop panic-stop--cancel" (click)="cancelEmergency()">
              CANCELAR SOS
            </button>
          } @else if (!confirmStop()) {
            <button type="button" class="panic-stop" (click)="beginStopConfirm()">
              Desactivar señal
            </button>
          } @else {
            <button type="button" class="panic-stop panic-stop--confirm" (click)="stopEmergency()">
              Confirmar desactivación
            </button>
            <button type="button" class="panic-continue" (click)="cancelStop()">
              Seguir emitiendo
            </button>
          }
          <a routerLink="/dashboard/security" class="panic-link">Ir a Security Center</a>
        </div>
      </div>

      <!-- INDICADOR DE BLACKOUT (Mínimo consumo) -->
      <div class="panic-blackout-indicator" *ngIf="isBlackout()" (click)="handleScreenTouch()">
        <span class="panic-dot panic-dot--active"></span>
        <span>SOS EMITIENDO · TOCA PARA VER</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .panic-shell {
        position: relative;
        min-height: 100vh;
        background: #000;
        color: rgba(255, 255, 255, 0.92);
        font-family: var(--font-sans);
        display: grid;
        place-items: center;
        padding: 32px 24px 48px;
        overflow: hidden;
        transition: background-color 1s ease;
      }

      .panic-shell--blackout {
        background: #000 !important;
      }

      .panic-dimmer {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at top, rgba(255, 255, 255, 0.03), transparent 45%),
          radial-gradient(circle at bottom, rgba(255, 0, 0, 0.08), transparent 50%);
        opacity: 0.95;
        pointer-events: none;
      }

      .panic-exit-hitbox {
        position: absolute;
        inset: 0;
        z-index: 10;
        background: transparent;
        border: none;
        width: 100%;
        height: 100%;
      }

      .panic-content {
        position: relative;
        z-index: 1;
        max-width: 520px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 24px;
        transition: opacity 0.5s ease, transform 0.5s ease;
      }

      .panic-content--hidden {
        opacity: 0;
        transform: scale(0.95);
        pointer-events: none;
      }

      .panic-header {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-weight: 700;
        letter-spacing: 0.4em;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }

      .panic-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 12px rgba(255, 255, 255, 0.1);
      }

      .panic-dot--active {
        background: #ff4545;
        box-shadow: 0 0 18px rgba(255, 69, 69, 0.7);
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }

      .panic-countdown {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .panic-number {
        font-size: 120px;
        font-weight: 900;
        line-height: 1;
        color: #ff4545;
        text-shadow: 0 0 40px rgba(255, 69, 69, 0.3);
      }

      .panic-countdown-label {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: rgba(255, 255, 255, 0.6);
      }

      .panic-status {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #fff;
      }

      .panic-instruction {
        font-size: 14px;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.6);
        max-width: 280px;
        margin: 0 auto;
      }

      .panic-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .panic-metric {
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(255, 255, 255, 0.03);
        text-align: left;
        display: grid;
        gap: 4px;
      }

      .panic-metric span {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: rgba(255, 255, 255, 0.4);
      }

      .panic-metric strong {
        font-size: 14px;
        color: #fff;
      }

      .panic-error {
        padding: 16px;
        border-radius: 16px;
        background: rgba(255, 69, 69, 0.1);
        border: 1px solid rgba(255, 69, 69, 0.3);
        color: #ffb4b4;
        font-size: 13px;
      }

      .panic-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }

      .panic-stop {
        width: 100%;
        padding: 16px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 12px;
      }

      .panic-stop--cancel {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
      }

      .panic-stop--confirm {
        background: #ff4545;
        border-color: #ff4545;
        color: #000;
      }

      .panic-continue {
        padding: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
        background: transparent;
        border: none;
      }

      .panic-blackout-indicator {
        position: fixed;
        bottom: 48px;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        font-size: 10px;
        letter-spacing: 0.3em;
        color: rgba(255, 255, 255, 0.3);
        text-transform: uppercase;
        z-index: 20;
      }

      .panic-link {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
        text-decoration: none;
        margin-top: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanicModePage implements OnInit, OnDestroy {
  private readonly beacon = inject(BeaconService);
  private readonly locationService = inject(LocationService);
  private readonly logger = inject(LoggerService).createChildLogger('PanicModePage');
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isBroadcasting = this.beacon.isBroadcasting;
  readonly countdown = signal(3);
  readonly isBlackout = signal(false);
  readonly isStopping = signal(false);
  readonly confirmStop = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly locationStatus = signal<LocationStatus>('pending');
  readonly locationAccuracy = signal<number | null>(null);
  readonly beaconId = signal<string>('');

  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private blackoutTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusMessage = computed((): string => {
    if (this.errorMessage()) return 'Error en el sistema de auxilio';
    if (this.isStopping()) return 'Deteniendo señal...';
    if (this.isBroadcasting()) return 'SOS ACTIVO';
    return 'Preparando...';
  });

  readonly locationLabel = computed((): string => {
    const status = this.locationStatus();
    if (status === 'ready') return `GPS OK (${Math.round(this.locationAccuracy() || 0)}m)`;
    return status === 'unavailable' ? 'Sin GPS' : 'Buscando GPS...';
  });

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  handleScreenTouch(): void {
    if (this.isBlackout()) {
      this.isBlackout.set(false);
      this.resetBlackoutTimer();
      void Haptics.impact({ style: ImpactStyle.Light });
    } else {
      this.resetBlackoutTimer();
    }
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
        void Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        this.countdown.set(0);
        clearInterval(this.countdownInterval);
        void this.initializeEmergency();
      }
    }, 1000);
  }

  cancelEmergency(): void {
    this.clearTimers();
    void this.router.navigate(['/dashboard/security']);
  }

  beginStopConfirm(): void {
    this.confirmStop.set(true);
    void Haptics.impact({ style: ImpactStyle.Heavy });
  }

  cancelStop(): void {
    this.confirmStop.set(false);
    this.resetBlackoutTimer();
  }

  async stopEmergency(): Promise<void> {
    this.isStopping.set(true);
    try {
      await this.beacon.stopBroadcasting();
      void Haptics.notification({ type: NotificationType.Success });
      await this.router.navigate(['/dashboard/security']);
    } catch (error) {
      this.logger.error('Error al detener SOS', error);
      this.errorMessage.set('Error al detener la señal');
    } finally {
      this.isStopping.set(false);
    }
  }

  private async initializeEmergency(): Promise<void> {
    try {
      void Haptics.notification({ type: NotificationType.Warning });

      const ready = this.beacon.isReady() ? true : await this.beacon.initialize();
      if (!ready) throw new Error('BLE Init Failed');

      const location = await this.locationService.getCurrentPosition();
      this.locationStatus.set(location ? 'ready' : 'unavailable');
      this.locationAccuracy.set(location?.accuracy || null);

      const beaconId = this.resolveBeaconId();
      this.beaconId.set(beaconId);

      await this.beacon.startBroadcasting(
        BeaconMessageType.SOS,
        beaconId,
        location?.lat ?? 0,
        location?.lng ?? 0,
      );

      this.resetBlackoutTimer();
    } catch (error) {
      this.errorMessage.set('Error al iniciar SOS');
      this.logger.error('SOS Init Error', error);
    }
  }

  private resetBlackoutTimer(): void {
    if (this.blackoutTimer) clearTimeout(this.blackoutTimer);
    if (this.isBroadcasting() && !this.confirmStop()) {
      this.blackoutTimer = setTimeout(() => {
        this.isBlackout.set(true);
      }, 8000); // 8 segundos para blackout
    }
  }

  private clearTimers(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.blackoutTimer) clearTimeout(this.blackoutTimer);
  }

  private resolveBeaconId(): string {
    const bookingId = this.route.snapshot.queryParamMap.get('booking');
    return bookingId ? bookingId.slice(0, 16) : Math.random().toString(16).slice(2, 18);
  }
}
