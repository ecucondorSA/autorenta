import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { BeaconMessageType, BeaconService, type DetectedBeacon } from '@core/services/beacon';
import { LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SecurityService } from './services/security.service';

type PermissionStatus = 'unknown' | 'granted' | 'denied';

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <!-- FONDOS AMBIENTALES -->
      <div class="absolute -top-40 -left-28 h-72 w-72 bg-red-500/10 blur-3xl"></div>
      <div class="absolute top-1/4 -right-44 h-80 w-80 bg-cyan-500/10 blur-3xl"></div>
      <div class="absolute bottom-0 left-1/3 h-96 w-96 bg-emerald-500/5 blur-3xl"></div>

      <!-- NOTIFICACIÓN DE RECOMPENSA (Impactante) -->
      @if (rewardVisible()) {
        <div
          class="fixed top-6 left-6 right-6 md:left-auto md:right-6 z-[100] max-w-sm rounded-2xl border border-emerald-400/40 bg-emerald-500/20 backdrop-blur-xl p-4 shadow-[0_20px_60px_rgba(16,185,129,0.3)] animate-in slide-in-from-top duration-500"
        >
          <div class="flex items-center gap-4">
            <div
              class="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg"
            >
              <i class="fas fa-trophy text-lg"></i>
            </div>
            <div class="flex-1">
              <p class="text-sm font-black text-white uppercase tracking-wider">
                ¡Vehículo Localizado!
              </p>
              <p class="text-xs text-emerald-100/80">Has ganado +50 Puntos de Reputación.</p>
            </div>
            <button (click)="rewardVisible.set(false)" class="text-emerald-200/50 hover:text-white">
              <i class="fas fa-times"></i>
            </button>
          </div>
          @if (lastReward()) {
            <div
              class="mt-3 pt-3 border-t border-emerald-400/20 flex justify-between items-center text-[10px] text-emerald-100/60 uppercase tracking-widest"
            >
              <span>Tipo: {{ formatBeaconType(lastReward()!.message.type) }}</span>
              <span>RSSI: {{ lastReward()!.rssi }} dBm</span>
            </div>
          }
        </div>
      }

      <div class="relative z-10 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- COLUMNA IZQUIERDA: ESTADO Y DISPOSITIVOS -->
        <div class="lg:col-span-1 space-y-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1
                class="text-2xl font-black tracking-tighter text-slate-100 flex items-center gap-3"
              >
                <span
                  class="inline-flex h-3 w-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                  [class.animate-pulse]="isAnyEmergencyActive()"
                ></span>
                SECURITY CENTER
              </h1>
              <p class="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-1">
                Defensa Activa 2.0
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span
                class="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] rounded border border-emerald-500/30 uppercase tracking-[0.2em] font-bold"
                >Encrypted</span
              >
            </div>
          </div>

          <!-- DEVICES STATUS -->
          <div class="bg-slate-900/40 rounded-3xl p-5 border border-white/5 backdrop-blur-sm">
            <h3 class="text-[10px] font-bold text-slate-500 mb-5 uppercase tracking-[0.3em]">
              Monitoreo de Activos
            </h3>
            <div class="space-y-4">
              @for (device of security.devices(); track device.id) {
                <div
                  class="flex items-center justify-between p-3.5 bg-white/[0.03] rounded-2xl border border-white/5 group hover:bg-white/[0.05] transition-colors"
                >
                  <div class="flex items-center gap-4">
                    <div
                      class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
                      [ngClass]="
                        device.is_active
                          ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-800 text-slate-500'
                      "
                    >
                      <i
                        class="fas"
                        [class.fa-satellite-dish]="device.device_type === 'AIRTAG'"
                        [class.fa-mobile-alt]="device.device_type !== 'AIRTAG'"
                      ></i>
                    </div>
                    <div>
                      <p class="font-bold text-sm text-slate-200">{{ device.device_type }}</p>
                      <p class="text-[10px] text-slate-500 uppercase tracking-widest">
                        {{ device.last_ping | date: 'shortTime' }} ·
                        {{ device.is_active ? 'Online' : 'Offline' }}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p
                      class="text-[10px] font-black"
                      [ngClass]="getBatteryColor(device.battery_level)"
                    >
                      {{ device.battery_level }}%
                    </p>
                    <div class="flex gap-0.5 mt-1 justify-end">
                      <div
                        class="h-1 w-3 rounded-full"
                        [ngClass]="device.is_active ? 'bg-emerald-500' : 'bg-slate-700'"
                      ></div>
                      <div
                        class="h-1 w-3 rounded-full"
                        [ngClass]="device.is_active ? 'bg-emerald-500/40' : 'bg-slate-700'"
                      ></div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="text-center py-8 border-2 border-dashed border-white/5 rounded-3xl">
                  <p class="text-xs text-slate-600 uppercase tracking-widest">
                    No hay dispositivos vinculados
                  </p>
                </div>
              }
            </div>
          </div>

          <!-- MESH STATS QUICK VIEW -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-900/40 p-4 rounded-3xl border border-white/5 text-center">
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Hallazgos</p>
              <p class="text-xl font-black text-cyan-400">{{ contributionCount() }}</p>
            </div>
            <div class="bg-slate-900/40 p-4 rounded-3xl border border-white/5 text-center">
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Nivel Scout</p>
              <p class="text-xl font-black text-emerald-400">{{ scoutLevel() }}</p>
            </div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: MAPA TÁCTICO CON RADAR -->
        <div
          class="lg:col-span-2 relative bg-slate-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl min-h-[500px]"
        >
          <!-- RADAR ANIMATION OVERLAY -->
          @if (isScanning()) {
            <div class="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              <div class="radar-beam"></div>
              <div class="radar-circle circle-1"></div>
              <div class="radar-circle circle-2"></div>
              <div class="radar-circle circle-3"></div>
            </div>
          }

          <div class="absolute top-6 left-6 z-20 flex items-center gap-3">
            <div
              class="px-3 py-1.5 bg-slate-950/80 backdrop-blur rounded-full border border-white/10 flex items-center gap-2"
            >
              <span
                class="flex h-1.5 w-1.5 rounded-full bg-cyan-400"
                [class.animate-ping]="isScanning()"
              ></span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                {{ isScanning() ? 'Escudo Activo: Escaneando...' : 'Radar en Standby' }}
              </span>
            </div>
          </div>

          <!-- MAPA (Placeholder con Grid Táctico) -->
          <div class="absolute inset-0 tactical-grid flex items-center justify-center opacity-40">
            <div class="text-center space-y-4">
              <i class="fas fa-satellite-dish text-6xl text-cyan-500/20"></i>
              <div class="space-y-1">
                <p class="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.5em]">
                  Tactical Feed 01-A
                </p>
                <p class="text-[10px] font-mono text-slate-700 uppercase">Awaiting GPS Lock...</p>
              </div>
            </div>
          </div>

          <!-- BOTONES TÁCTICOS -->
          <div class="absolute bottom-8 right-8 z-30 flex flex-col gap-4">
            <a
              routerLink="/beacon-test"
              class="w-14 h-14 bg-cyan-600/80 backdrop-blur text-white rounded-2xl border border-cyan-400/30 shadow-2xl flex items-center justify-center hover:bg-cyan-700 transition-all hover:scale-110 active:scale-95"
            >
              <i class="fas fa-broadcast-tower text-xl"></i>
            </a>
            <button
              class="w-14 h-14 bg-slate-900/80 backdrop-blur text-white rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all hover:scale-110 active:scale-95"
            >
              <i class="fas fa-crosshairs text-xl"></i>
            </button>
            <a
              routerLink="/panic"
              class="w-14 h-14 bg-red-600 text-white rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center hover:bg-red-700 transition-all hover:scale-110 active:scale-95 animate-pulse"
            >
              <i class="fas fa-bolt text-xl"></i>
            </a>
          </div>
        </div>

        <!-- SECCIÓN INFERIOR: CONTROLES MESH -->
        <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <!-- SOS CARD -->
          <div
            class="group relative overflow-hidden rounded-[2rem] border border-red-500/30 bg-gradient-to-br from-red-950/40 to-slate-950 p-8"
          >
            <div
              class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-red-500/10 blur-3xl group-hover:bg-red-500/20 transition-all"
            ></div>
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-red-400">
              Emergencia Critica
            </p>
            <h3 class="text-2xl font-black text-white mt-2">Protocolo SOS</h3>
            <p class="text-xs text-red-100/50 mt-4 leading-relaxed">
              Si estás en peligro o han robado tu vehículo, activa el modo pánico. Emitiremos una
              señal cifrada que será captada por cualquier usuario cercano.
            </p>
            <div class="mt-8">
              <a
                routerLink="/panic"
                class="block w-full py-4 bg-red-600 hover:bg-red-700 text-white text-center rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-lg shadow-red-950/50 transition-all"
              >
                Iniciar SOS Global
              </a>
            </div>
          </div>

          <!-- SCOUT/MESH CONTROL -->
          <div class="rounded-[2rem] border border-white/5 bg-slate-900/40 p-8 backdrop-blur-sm">
            <div class="flex items-start justify-between mb-6">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">
                  AutoRenta Mesh
                </p>
                <h3 class="text-2xl font-black text-white mt-2">Escudo Comunitario</h3>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  [checked]="meshOptIn()"
                  (change)="toggleMeshParticipation($event)"
                />
                <div
                  class="w-14 h-8 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"
                ></div>
              </label>
            </div>

            <p class="text-xs text-slate-400 leading-relaxed mb-6">
              Al activar el escudo, tu teléfono buscará señales de emergencia de otros usuarios. Si
              encuentras una, la reportarás de forma anónima y ganarás reputación.
            </p>

            <div class="space-y-3">
              <div
                class="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5"
              >
                <div class="flex items-center gap-3">
                  <i class="fas fa-location-arrow text-cyan-400 text-sm"></i>
                  <span class="text-xs font-bold text-slate-300">Ubicación</span>
                </div>
                <span
                  class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  [ngClass]="permissionClass(locationPermission())"
                >
                  {{ permissionLabel(locationPermission()) }}
                </span>
              </div>
              @if (locationPermission() === 'denied') {
                <p class="text-[10px] text-amber-400/80 px-2">
                  ⚠️ Requiere permiso "Permitir siempre" en los ajustes del sistema.
                </p>
              }
            </div>
          </div>

          <!-- RECENT ACTIVITY -->
          <div class="rounded-[2rem] border border-white/5 bg-slate-900/40 p-8">
            <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">
              Actividad de Red
            </h3>
            <div class="space-y-4">
              @for (beacon of recentDetections(); track beacon.deviceId) {
                <div
                  class="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 border-l-2 border-l-emerald-500"
                >
                  <div>
                    <p class="text-xs font-black text-slate-200 uppercase tracking-tighter">
                      {{ formatBeaconType(beacon.message.type) }} DETECTADO
                    </p>
                    <p class="text-[9px] text-slate-500 mt-1">
                      Hash: {{ beacon.message.bookingIdHash | slice: 0 : 8 }} · RSSI:
                      {{ beacon.rssi }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] font-mono text-slate-400">
                      {{ beacon.detectedAt | date: 'HH:mm:ss' }}
                    </p>
                    <p class="text-[9px] text-emerald-500 font-bold">+50 PTS</p>
                  </div>
                </div>
              } @empty {
                <div class="text-center py-10 opacity-30">
                  <i class="fas fa-radar text-4xl mb-4"></i>
                  <p class="text-[10px] uppercase tracking-[0.3em]">Sin detecciones recientes</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .tactical-grid {
        background-image:
          linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
        background-size: 30px 30px;
      }

      .radar-beam {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 1000px;
        height: 1000px;
        background: conic-gradient(
          from 0deg,
          rgba(34, 211, 238, 0.2),
          transparent 45deg,
          transparent
        );
        transform: translate(-50%, -50%);
        animation: rotate-radar 4s linear infinite;
        z-index: 5;
      }

      .radar-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        border: 1px solid rgba(34, 211, 238, 0.1);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 4;
      }

      .circle-1 {
        width: 200px;
        height: 200px;
      }
      .circle-2 {
        width: 400px;
        height: 400px;
      }
      .circle-3 {
        width: 600px;
        height: 600px;
      }

      @keyframes rotate-radar {
        from {
          transform: translate(-50%, -50%) rotate(0deg);
        }
        to {
          transform: translate(-50%, -50%) rotate(360deg);
        }
      }

      @keyframes slide-in-from-top {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityDashboardPage implements OnInit {
  security = inject(SecurityService);

  private readonly beacon = inject(BeaconService);
  private readonly locationService = inject(LocationService);
  private readonly logger = inject(LoggerService).createChildLogger('SecurityDashboardPage');
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly isBrowser = typeof window !== 'undefined';

  private rewardTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private previousBeaconCount = 0;

  readonly meshOptIn = signal(false);
  readonly locationPermission = signal<PermissionStatus>('unknown');
  readonly rewardVisible = signal(false);
  readonly lastReward = signal<DetectedBeacon | null>(null);

  readonly isScanning = this.beacon.isScanning;

  readonly scoutLevel = computed(() => {
    const count = this.beacon.detectedBeacons().length;
    if (count > 50) return 'OPERATIVO ELITE';
    if (count > 10) return 'CENTINELA';
    return 'SCOUT RECLUTA';
  });

  readonly contributionCount = computed((): number => this.beacon.detectedBeacons().length);

  readonly recentDetections = computed((): DetectedBeacon[] => {
    return [...this.beacon.detectedBeacons()].slice(-3).reverse();
  });

  ngOnInit(): void {
    this.security.loadDashboardData('car-123-uuid');
    this.restoreMeshPreference();

    if (this.meshOptIn()) {
      void this.activateScoutMode();
    }

    this.previousBeaconCount = this.beacon.detectedBeacons().length;

    // React to new detections with haptics and reward UI
    effect(
      () => {
        const beacons = this.beacon.detectedBeacons();
        if (beacons.length > this.previousBeaconCount) {
          const latest = beacons[beacons.length - 1];
          this.lastReward.set(latest ?? null);
          this.rewardVisible.set(true);
          void Haptics.notification({ type: NotificationType.Success });
          this.scheduleRewardHide();
        }
        this.previousBeaconCount = beacons.length;
      },
      { injector: this.injector, allowSignalWrites: true },
    );

    // Persist preference
    effect(
      () => {
        if (this.isBrowser) {
          localStorage.setItem('autorenta.mesh.optIn', String(this.meshOptIn()));
        }
      },
      { injector: this.injector },
    );

    this.destroyRef.onDestroy(() => {
      if (this.rewardTimeoutId) clearTimeout(this.rewardTimeoutId);
      this.security.cleanupRealtime();
    });

    void this.syncLocationPermission();
  }

  isAnyEmergencyActive(): boolean {
    return this.security.activeAlerts().some((a) => a.severity === 'CRITICAL');
  }

  getBatteryColor(level: number): string {
    if (level > 50) return 'text-emerald-400';
    if (level > 20) return 'text-amber-400';
    return 'text-red-500 font-black animate-pulse';
  }

  permissionLabel(status: PermissionStatus): string {
    switch (status) {
      case 'granted':
        return 'Active';
      case 'denied':
        return 'Blocked';
      default:
        return 'Action Required';
    }
  }

  permissionClass(status: PermissionStatus): string {
    switch (status) {
      case 'granted':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'denied':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  }

  formatBeaconType(type: BeaconMessageType): string {
    return BeaconMessageType[type] ?? 'ALERTA';
  }

  toggleMeshParticipation(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const nextValue = target?.checked ?? !this.meshOptIn();
    if (nextValue) {
      void this.activateScoutMode();
    } else {
      void this.deactivateScoutMode();
    }
  }

  async activateScoutMode(): Promise<void> {
    this.meshOptIn.set(true);
    try {
      const ready = this.beacon.isReady() ? true : await this.beacon.initialize();
      if (!ready) {
        this.meshOptIn.set(false);
        return;
      }
      void this.beacon.startScanning(true);
      void this.syncLocationPermission();
    } catch {
      this.meshOptIn.set(false);
    }
  }

  async deactivateScoutMode(): Promise<void> {
    this.meshOptIn.set(false);
    try {
      await this.beacon.stopScanning();
    } catch (error) {
      this.logger.error('Failed to stop scout mode', error);
    }
  }

  deployCountermeasures(): void {
    void Haptics.impact({ style: ImpactStyle.Heavy });
    if (confirm('⚠️ ¿ACTIVAR PROTOCOLO DE RECUPERACIÓN?')) {
      // Emergency logic
    }
  }

  private restoreMeshPreference(): void {
    if (!this.isBrowser) return;
    const stored = localStorage.getItem('autorenta.mesh.optIn');
    if (stored === 'true') this.meshOptIn.set(true);
  }

  private scheduleRewardHide(): void {
    if (this.rewardTimeoutId) clearTimeout(this.rewardTimeoutId);
    this.rewardTimeoutId = setTimeout(() => {
      this.rewardVisible.set(false);
    }, 6000);
  }

  private async syncLocationPermission(): Promise<void> {
    if (!this.isBrowser || !navigator.permissions?.query) return;
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      this.updateLocationStatus(result.state);
      result.onchange = () => this.updateLocationStatus(result.state);
    } catch {
      /* Silent */
    }
  }

  private updateLocationStatus(state: PermissionState): void {
    if (state === 'granted') this.locationPermission.set('granted');
    else if (state === 'denied') this.locationPermission.set('denied');
    else this.locationPermission.set('unknown');
  }
}
