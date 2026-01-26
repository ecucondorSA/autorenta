import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MoneyPipe } from '@shared/pipes/money.pipe';

interface ParticipationPeriodData {
  total_points: number;
  points_availability: number;
  points_location: number;
  earnings_usd: number;
  pool_share_percentage: number;
}

interface FgoStatusData {
  status: 'healthy' | 'warning' | 'critical';
  totalBalance: number;
}

@Component({
  selector: 'app-network-participation-widget',
  standalone: true,
  imports: [CommonModule, MoneyPipe],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span class="text-blue-600">🛡️</span> Participación de Red
        </h3>
        <div
          class="px-2 py-1 rounded-full text-xs font-medium"
          [ngClass]="
            fgoStatus?.status === 'healthy'
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          "
        >
          FGO: {{ fgoStatus?.status === 'healthy' ? 'ACTIVO' : 'REVISAR' }}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Puntos Section -->
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <p class="text-xs text-slate-500 uppercase font-semibold mb-1">Mis Puntos (Score)</p>
          <div class="text-2xl font-black text-slate-800">
            {{ participationPeriod?.total_points || 0 }} pts
          </div>
          <div class="mt-2 text-xs text-slate-600">
            <div class="flex justify-between">
              <span>Disponibilidad:</span>
              <span class="font-bold">{{ participationPeriod?.points_availability || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span>Ubicación:</span>
              <span class="font-bold">{{ participationPeriod?.points_location || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Earnings Section -->
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p class="text-xs text-blue-600 uppercase font-semibold mb-1">Participación Estimada</p>
          <div class="text-2xl font-black text-blue-700">
            {{ participationPeriod?.earnings_usd | money: 'USD' }}
          </div>
          <p class="text-xs text-blue-600 mt-2 leading-tight">
            Basado en tu aporte al Pool de la Red ({{
              participationPeriod?.pool_share_percentage | percent: '1.2-2'
            }}
            share)
          </p>
        </div>
      </div>

      <!-- FGO Protection Status -->
      <div class="mt-4 pt-4 border-t border-slate-100">
        <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Protección Mutual (FGO)</span>
          <span class="font-mono">{{ fgoStatus?.totalBalance | money: 'USD' }} en Reserva</span>
        </div>
        <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div class="bg-green-500 h-1.5 rounded-full" style="width: 100%"></div>
        </div>
        <p class="text-[10px] text-slate-400 mt-2 text-center">
          Tu vehículo está cubierto por el Fondo de Garantía Operativa bajo régimen de Ayuda Mutual
          (Ley 20.321).
        </p>
      </div>
    </div>
  `,
  styles: [],
})
export class NetworkParticipationWidgetComponent {
  @Input() participationPeriod: ParticipationPeriodData | null = null;
  @Input() fgoStatus: FgoStatusData | null = null;
}
