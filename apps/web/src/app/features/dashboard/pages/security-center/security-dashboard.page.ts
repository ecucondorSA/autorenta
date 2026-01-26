import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityService } from './services/security.service';

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-900 text-white p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- COLUMNA IZQUIERDA: ESTADO Y ALERTAS -->
      <div class="lg:col-span-1 space-y-6">
        <!-- HEADER -->
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold tracking-tight text-red-500 flex items-center gap-2">
            <span class="animate-pulse">●</span> SECURITY GRID
          </h1>
          <span
            class="px-2 py-1 bg-green-900 text-green-400 text-xs rounded border border-green-700"
            >SYSTEM ONLINE</span
          >
        </div>

        <!-- DEVICES STATUS -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 class="text-sm font-medium text-gray-400 mb-4 uppercase">Sistemas de Rastreo</h3>
          <div class="space-y-3">
            @for (device of security.devices(); track device.id) {
              <div class="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    [ngClass]="
                      device.is_active ? 'bg-blue-900 text-blue-400' : 'bg-red-900 text-red-400'
                    "
                  >
                    <i class="fas fa-satellite-dish text-xs"></i>
                  </div>
                  <div>
                    <p class="font-bold text-sm">{{ device.device_type }}</p>
                    <p class="text-xs text-gray-500">{{ device.last_ping | date: 'shortTime' }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xs font-mono" [ngClass]="getBatteryColor(device.battery_level)">
                    {{ device.battery_level }}% BAT
                  </p>
                  <span *ngIf="device.is_active" class="text-[10px] text-green-500">ACTIVE</span>
                </div>
              </div>
            } @empty {
              <div class="text-center py-4 text-gray-500 text-sm">No devices linked</div>
            }
          </div>
        </div>

        <!-- ALERT FEED -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 h-[400px] overflow-y-auto">
          <h3 class="text-sm font-medium text-gray-400 mb-4 uppercase">Bitácora de Eventos</h3>
          @for (alert of security.activeAlerts(); track alert.id) {
            <div
              class="mb-3 p-3 border-l-4 bg-gray-900/50"
              [ngClass]="getSeverityColor(alert.severity)"
            >
              <div class="flex justify-between items-start">
                <span class="font-bold text-sm">{{ alert.alert_type }}</span>
                <span class="text-[10px] text-gray-500">{{
                  alert.created_at | date: 'HH:mm:ss'
                }}</span>
              </div>
              <p class="text-xs text-gray-300 mt-1">Detectado en zona sur. Velocidad 0km/h.</p>

              @if (alert.severity === 'CRITICAL') {
                <button
                  (click)="deployCountermeasures()"
                  class="mt-2 w-full py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded"
                >
                  INICIAR PROTOCOLO RECUPERACIÓN
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- COLUMNA DERECHA: MAPA TÁCTICO -->
      <div
        class="lg:col-span-2 relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl"
      >
        <!-- MAPA (Placeholder) -->
        <div class="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <p class="text-gray-600 font-mono">
            <i class="fas fa-map-marked-alt text-4xl mb-2 block text-center"></i>
            TACTICAL MAP MODULE LOADING...
          </p>
        </div>

        <!-- OVERLAY DE CONTROLES -->
        <div class="absolute bottom-6 right-6 flex flex-col gap-3">
          <button
            class="w-12 h-12 bg-gray-900 text-white rounded-full border border-gray-600 shadow-lg hover:bg-gray-800 flex items-center justify-center"
            title="Centrar en Vehículo"
          >
            <i class="fas fa-crosshairs"></i>
          </button>
          <button
            class="w-12 h-12 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 animate-pulse flex items-center justify-center"
            title="Emergencia"
          >
            <i class="fas fa-exclamation-triangle"></i>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SecurityDashboardPage implements OnInit {
  security = inject(SecurityService);

  ngOnInit() {
    // Hardcoded ID for demo, should come from route
    this.security.loadDashboardData('car-123-uuid');
  }

  getBatteryColor(level: number): string {
    if (level > 50) return 'text-green-400';
    if (level > 20) return 'text-yellow-400';
    return 'text-red-500 font-bold';
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-500';
      case 'HIGH':
        return 'border-orange-500';
      case 'MEDIUM':
        return 'border-yellow-500';
      default:
        return 'border-blue-500';
    }
  }

  deployCountermeasures() {
    if (
      confirm(
        '⚠️ ESTA ACCIÓN ES IRREVERSIBLE.\n\nSe activará la red de Scouts y se notificará a las autoridades.\n¿Confirmar alerta de robo?',
      )
    ) {
      // Trigger logic
    }
  }
}
