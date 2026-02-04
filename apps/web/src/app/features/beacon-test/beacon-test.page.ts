import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, Platform } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { BeaconService } from '../../core/services/beacon/beacon.service';
import { BeaconMessageType } from '../../core/services/beacon/beacon-protocol';

@Component({
  selector: 'app-beacon-test',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>🔴 Beacon Test</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Status Card -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Estado del Servicio</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="none">
            <ion-item>
              <ion-label>Status</ion-label>
              <ion-badge [color]="statusColor()">{{ beaconService.status() }}</ion-badge>
            </ion-item>
            <ion-item>
              <ion-label>Modo</ion-label>
              <ion-badge color="medium">{{ beaconService.mode() || 'none' }}</ion-badge>
            </ion-item>
            <ion-item>
              <ion-label>Broadcasting</ion-label>
              <ion-badge [color]="beaconService.isBroadcasting() ? 'danger' : 'medium'">
                {{ beaconService.isBroadcasting() ? 'ON' : 'OFF' }}
              </ion-badge>
            </ion-item>
            <ion-item>
              <ion-label>Scanning</ion-label>
              <ion-badge [color]="beaconService.isScanning() ? 'success' : 'medium'">
                {{ beaconService.isScanning() ? 'ON' : 'OFF' }}
              </ion-badge>
            </ion-item>
            <ion-item>
              <ion-label>Plataforma</ion-label>
              <ion-note slot="end">{{ platformInfo }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Ubicación</ion-label>
              <ion-note slot="end">{{ locationInfo() }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Initialize -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>1. Inicializar</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-button
            expand="block"
            (click)="initialize()"
            [disabled]="beaconService.status() !== 'uninitialized'">
            <ion-icon name="power-outline" slot="start"></ion-icon>
            Inicializar BeaconService
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Broadcasting (SOS) -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>2. Broadcasting (Emisor SOS)</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-segment [(ngModel)]="selectedAlertType" class="ion-margin-bottom">
            <ion-segment-button [value]="BeaconMessageType.SOS">
              <ion-label>SOS</ion-label>
            </ion-segment-button>
            <ion-segment-button [value]="BeaconMessageType.THEFT">
              <ion-label>Robo</ion-label>
            </ion-segment-button>
            <ion-segment-button [value]="BeaconMessageType.CRASH">
              <ion-label>Choque</ion-label>
            </ion-segment-button>
          </ion-segment>

          @if (!beaconService.isBroadcasting()) {
            <ion-button
              expand="block"
              color="danger"
              (click)="startBroadcasting()"
              [disabled]="beaconService.status() !== 'ready'">
              <ion-icon name="radio-outline" slot="start"></ion-icon>
              Emitir Señal {{ getAlertName(selectedAlertType) }}
            </ion-button>
          } @else {
            <ion-button
              expand="block"
              color="medium"
              (click)="stopBroadcasting()">
              <ion-icon name="stop-circle-outline" slot="start"></ion-icon>
              Detener Broadcasting
            </ion-button>
          }
        </ion-card-content>
      </ion-card>

      <!-- Scanning (Scout) -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>3. Scanning (Scout Mode)</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          @if (!beaconService.isScanning()) {
            <ion-button
              expand="block"
              color="success"
              (click)="startScanning()"
              [disabled]="beaconService.status() !== 'ready'">
              <ion-icon name="search-outline" slot="start"></ion-icon>
              Iniciar Escaneo
            </ion-button>
          } @else {
            <ion-button
              expand="block"
              color="medium"
              (click)="stopScanning()">
              <ion-icon name="stop-circle-outline" slot="start"></ion-icon>
              Detener Escaneo
            </ion-button>
          }
        </ion-card-content>
      </ion-card>

      <!-- Detected Beacons -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            Beacons Detectados ({{ beaconService.detectedBeacons().length }})
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          @if (beaconService.detectedBeacons().length === 0) {
            <ion-item lines="none">
              <ion-icon name="radio-outline" slot="start" color="medium"></ion-icon>
              <ion-label color="medium">
                No se han detectado beacons aún
              </ion-label>
            </ion-item>
          } @else {
            <ion-list>
              @for (beacon of beaconService.detectedBeacons(); track beacon.deviceId) {
                <ion-item>
                  <ion-icon
                    [name]="getAlertIcon(beacon.message.type)"
                    slot="start"
                    [color]="getAlertColor(beacon.message.type)">
                  </ion-icon>
                  <ion-label>
                    <h2>{{ getAlertName(beacon.message.type) }}</h2>
                    <p>ID: {{ beacon.message.bookingIdHash.substring(0, 8) }}...</p>
                    <p>RSSI: {{ beacon.rssi }} dBm</p>
                    <p>{{ beacon.detectedAt | date:'HH:mm:ss' }}</p>
                  </ion-label>
                  <ion-badge slot="end" [color]="getRssiColor(beacon.rssi)">
                    {{ estimateDistance(beacon.rssi) }}m
                  </ion-badge>
                </ion-item>
              }
            </ion-list>
          }
        </ion-card-content>
      </ion-card>

      <!-- Logs -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            Logs
            <ion-button fill="clear" size="small" (click)="clearLogs()">
              Limpiar
            </ion-button>
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="logs-container">
            @for (log of logs(); track $index) {
              <div class="log-entry" [class]="log.level">
                <span class="time">{{ log.time }}</span>
                <span class="message">{{ log.message }}</span>
              </div>
            }
            @if (logs().length === 0) {
              <div class="log-entry info">
                <span class="time">--:--:--</span>
                <span class="message">Sin logs...</span>
              </div>
            }
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [`
    .logs-container {
      max-height: 300px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      background: #1a1a1a;
      border-radius: 8px;
      padding: 8px;
    }
    .log-entry {
      padding: 4px 0;
      border-bottom: 1px solid #333;
    }
    .log-entry.info { color: #4fc3f7; }
    .log-entry.success { color: #81c784; }
    .log-entry.warning { color: #ffb74d; }
    .log-entry.error { color: #e57373; }
    .time {
      color: #888;
      margin-right: 8px;
    }
  `]
})
export class BeaconTestPage implements OnInit {
  readonly beaconService = inject(BeaconService);
  private readonly platform = inject(Platform);

  // Expose enum to template
  readonly BeaconMessageType = BeaconMessageType;

  selectedAlertType: BeaconMessageType = BeaconMessageType.SOS;
  platformInfo = '';

  private currentLatitude = 0;
  private currentLongitude = 0;

  logs = signal<{ time: string; message: string; level: string }[]>([]);
  locationInfo = signal('Obteniendo...');

  statusColor = computed(() => {
    const status = this.beaconService.status();
    switch (status) {
      case 'ready': return 'success';
      case 'initializing': return 'warning';
      case 'error': return 'danger';
      default: return 'medium';
    }
  });

  ngOnInit() {
    this.platformInfo = this.platform.is('android') ? 'Android' :
                        this.platform.is('ios') ? 'iOS' : 'Web';
    this.log('Página de test inicializada', 'info');
    this.log(`Plataforma: ${this.platformInfo}`, 'info');
    this.fetchLocation();
  }

  private async fetchLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      this.currentLatitude = position.coords.latitude;
      this.currentLongitude = position.coords.longitude;
      this.locationInfo.set(`${this.currentLatitude.toFixed(4)}, ${this.currentLongitude.toFixed(4)}`);
      this.log(`Ubicación: ${this.locationInfo()}`, 'success');
    } catch (error) {
      this.locationInfo.set('Error obteniendo ubicación');
      this.log(`Error de ubicación: ${error}`, 'warning');
    }
  }

  async initialize() {
    this.log('Inicializando BeaconService...', 'info');
    try {
      const success = await this.beaconService.initialize();
      if (success) {
        this.log('BeaconService inicializado correctamente', 'success');
      } else {
        this.log(`Error: ${this.beaconService.lastError()}`, 'error');
      }
    } catch (error) {
      this.log(`Error al inicializar: ${error}`, 'error');
    }
  }

  async startBroadcasting() {
    this.log(`Iniciando broadcasting (${this.getAlertName(this.selectedAlertType)})...`, 'info');

    // Generate a test booking ID hash
    const testBookingIdHash = 'test' + Date.now().toString(16).substring(0, 12);

    try {
      const success = await this.beaconService.startBroadcasting(
        this.selectedAlertType,
        testBookingIdHash,
        this.currentLatitude,
        this.currentLongitude
      );
      if (success) {
        this.log('Broadcasting iniciado', 'success');
        this.log(`BookingID: ${testBookingIdHash}`, 'info');
      } else {
        this.log(`Error: ${this.beaconService.lastError()}`, 'error');
      }
    } catch (error) {
      this.log(`Error al iniciar broadcasting: ${error}`, 'error');
    }
  }

  async stopBroadcasting() {
    this.log('Deteniendo broadcasting...', 'info');
    try {
      await this.beaconService.stopBroadcasting();
      this.log('Broadcasting detenido', 'success');
    } catch (error) {
      this.log(`Error al detener broadcasting: ${error}`, 'error');
    }
  }

  async startScanning() {
    this.log('Iniciando escaneo...', 'info');
    try {
      const success = await this.beaconService.startScanning(true);
      if (success) {
        this.log('Escaneo iniciado (duty cycling)', 'success');
      } else {
        this.log(`Error: ${this.beaconService.lastError()}`, 'error');
      }
    } catch (error) {
      this.log(`Error al iniciar escaneo: ${error}`, 'error');
    }
  }

  async stopScanning() {
    this.log('Deteniendo escaneo...', 'info');
    try {
      await this.beaconService.stopScanning();
      this.log('Escaneo detenido', 'success');
    } catch (error) {
      this.log(`Error al detener escaneo: ${error}`, 'error');
    }
  }

  getAlertName(type: BeaconMessageType): string {
    switch (type) {
      case BeaconMessageType.SOS: return 'SOS';
      case BeaconMessageType.THEFT: return 'ROBO';
      case BeaconMessageType.CRASH: return 'CHOQUE';
      default: return 'UNKNOWN';
    }
  }

  getAlertIcon(type: BeaconMessageType): string {
    switch (type) {
      case BeaconMessageType.SOS: return 'warning-outline';
      case BeaconMessageType.THEFT: return 'car-outline';
      case BeaconMessageType.CRASH: return 'alert-circle-outline';
      default: return 'radio-outline';
    }
  }

  getAlertColor(type: BeaconMessageType): string {
    switch (type) {
      case BeaconMessageType.SOS: return 'danger';
      case BeaconMessageType.THEFT: return 'warning';
      case BeaconMessageType.CRASH: return 'tertiary';
      default: return 'medium';
    }
  }

  getRssiColor(rssi: number): string {
    if (rssi > -50) return 'success';
    if (rssi > -70) return 'warning';
    return 'danger';
  }

  estimateDistance(rssi: number): number {
    // Simple RSSI to distance estimation
    // Assumes txPower of -59 dBm at 1 meter
    const txPower = -59;
    const ratio = rssi / txPower;
    if (ratio < 1) {
      return Math.round(Math.pow(ratio, 10) * 10) / 10;
    }
    return Math.round((0.89976 * Math.pow(ratio, 7.7095) + 0.111) * 10) / 10;
  }

  private log(message: string, level: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.update(logs => [...logs, { time, message, level }]);
  }

  clearLogs() {
    this.logs.set([]);
  }
}
